// pages/api/memory/extract.ts
// POST: Extract structured facts from conversation using A.U.D.N. pattern
// Called asynchronously after chat stream completes

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

const VALID_CATEGORIES = [
  'child_info', 'school', 'family', 'behavior',
  'preference', 'medical', 'concern', 'goal',
  'progress', 'sports',
] as const;

type FactCategory = typeof VALID_CATEGORIES[number];

interface ExistingFact {
  id: string;
  category: string;
  fact_key: string;
  fact_value: string;
  confidence: number;
}

interface ExtractedFact {
  action: 'ADD' | 'UPDATE' | 'DELETE';
  category: FactCategory;
  key: string;
  value: string;
  confidence: number;
  existing_id: string | null;
}

interface ExtractionResult {
  facts: ExtractedFact[];
  summary_update: string | null;
}

function buildExtractionPrompt(
  existingFacts: ExistingFact[],
  recentMessages: string[]
): string {
  const existingJson = existingFacts.length > 0
    ? JSON.stringify(
        existingFacts.map((f) => ({
          id: f.id,
          category: f.category,
          key: f.fact_key,
          value: f.fact_value,
        }))
      )
    : '[]';

  const messagesText = recentMessages
    .map((m, i) => `[${i + 1}] ${m}`)
    .join('\n');

  return `You are a family information extraction assistant. Analyze the following conversation messages from a parent discussing their ADHD child.

Extract structured facts into these 10 categories:
- child_info: Basic info (name, age, gender, school)
- school: Learning (grades, subjects, teacher feedback)
- family: Family situation (parents, siblings, living)
- behavior: Behavior patterns (habits, problem behaviors)
- preference: Interests and preferences
- medical: Medical info (diagnosis, medication, doctor advice)
- concern: Parent worries and pain points
- goal: Parent goals and wishes
- progress: Positive changes and milestones
- sports: Exercise and physical activities

EXISTING FACTS (for comparison):
${existingJson}

NEW CONVERSATION MESSAGES:
${messagesText}

For each NEW or CHANGED fact, output JSON:
{
  "facts": [
    {
      "action": "ADD" | "UPDATE" | "DELETE",
      "category": "<one of 10 categories>",
      "key": "<short label in English, snake_case>",
      "value": "<fact content>",
      "confidence": <0.0 to 1.0>,
      "existing_id": "<uuid if UPDATE/DELETE, null if ADD>"
    }
  ],
  "summary_update": "<updated family summary in ≤200 chars combining old and new info, or null if no meaningful change>"
}

Rules:
- Extract generously — when uncertain, still extract with lower confidence
- ADD: New fact not in existing facts
- UPDATE: Existing fact whose value has changed
- DELETE: Existing fact explicitly contradicted by the user
- Do NOT include unchanged facts
- Do NOT extract facts that duplicate existing ones with same meaning
- Output ONLY valid JSON, no markdown fences, no extra text`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { conversationId } = req.body;
  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId required' });
  }

  const supabase = getSupabaseAdmin();

  try {
    // Get user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Load last 10 user messages from this conversation
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('content')
      .eq('conversation_id', conversationId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(10);

    if (msgError) {
      console.error('[memory/extract] Failed to load messages:', msgError);
      return res.status(200).json({ success: true, added: 0, updated: 0, deleted: 0 });
    }

    if (!messages || messages.length < 2) {
      // Skip extraction for conversations with fewer than 2 user messages
      return res.status(200).json({ success: true, added: 0, updated: 0, deleted: 0 });
    }

    const recentMessages = messages.reverse().map((m) => m.content);

    // Load existing active memory items
    const { data: existingFacts } = await supabase
      .from('memory_items')
      .select('id, category, fact_key, fact_value, confidence')
      .eq('user_id', user.id)
      .eq('status', 'active');

    const existing: ExistingFact[] = existingFacts || [];

    // Call DeepSeek for extraction
    const prompt = buildExtractionPrompt(existing, recentMessages);

    const llmResponse = await fetch(`${DEEPSEEK_API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!llmResponse.ok) {
      console.error('[memory/extract] DeepSeek API error:', llmResponse.status);
      return res.status(200).json({ success: true, added: 0, updated: 0, deleted: 0 });
    }

    const llmData = await llmResponse.json();
    const responseText = llmData.choices?.[0]?.message?.content?.trim();

    if (!responseText) {
      console.error('[memory/extract] Empty LLM response');
      return res.status(200).json({ success: true, added: 0, updated: 0, deleted: 0 });
    }

    // Parse LLM response — strip markdown fences if present
    let parsed: ExtractionResult;
    try {
      const cleaned = responseText
        .replace(/^```json\s*/i, '')
        .replace(/```\s*$/, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('[memory/extract] Failed to parse LLM response:', parseErr, responseText.slice(0, 500));
      return res.status(200).json({ success: true, added: 0, updated: 0, deleted: 0 });
    }

    // Execute A.U.D.N. operations (cap at 10)
    const facts = (parsed.facts || []).slice(0, 10);
    let added = 0;
    let updated = 0;
    let deleted = 0;

    for (const fact of facts) {
      // Validate category
      if (!VALID_CATEGORIES.includes(fact.category as FactCategory)) {
        console.warn('[memory/extract] Invalid category:', fact.category);
        continue;
      }

      const confidence = Math.min(1, Math.max(0, fact.confidence || 0.7));

      if (fact.action === 'ADD') {
        // Check if fact already exists (dedup)
        const existingMatch = existing.find(
          (e) => e.category === fact.category && e.fact_key === fact.key
        );

        if (existingMatch) {
          // Treat as UPDATE instead
          const { error } = await supabase
            .from('memory_items')
            .update({
              fact_value: fact.value,
              confidence,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingMatch.id);

          if (!error) updated++;
        } else {
          const { error } = await supabase
            .from('memory_items')
            .insert({
              user_id: user.id,
              category: fact.category,
              fact_key: fact.key,
              fact_value: fact.value,
              confidence,
              source: 'conversation',
              source_ref: conversationId,
            });

          if (!error) added++;
        }
      } else if (fact.action === 'UPDATE' && fact.existing_id) {
        const { error } = await supabase
          .from('memory_items')
          .update({
            fact_value: fact.value,
            confidence,
            updated_at: new Date().toISOString(),
          })
          .eq('id', fact.existing_id)
          .eq('user_id', user.id);

        if (!error) updated++;
      } else if (fact.action === 'DELETE' && fact.existing_id) {
        const { error } = await supabase
          .from('memory_items')
          .update({
            status: 'archived',
            updated_at: new Date().toISOString(),
          })
          .eq('id', fact.existing_id)
          .eq('user_id', user.id);

        if (!error) deleted++;
      }
    }

    // Update profile summary if provided
    if (parsed.summary_update && typeof parsed.summary_update === 'string') {
      const summaryText = parsed.summary_update.trim().slice(0, 200);

      if (summaryText) {
        // Check existing summary
        const { data: existingSummary } = await supabase
          .from('profile_summaries')
          .select('summary, source')
          .eq('user_id', user.id)
          .single();

        if (existingSummary && existingSummary.source === 'user') {
          // User has manually edited — only append if under 200 chars
          const combined = existingSummary.summary + '; ' + summaryText;
          if (combined.length <= 200) {
            await supabase
              .from('profile_summaries')
              .update({
                summary: combined,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', user.id);
          }
          // else skip — don't overwrite user text
        } else {
          // System-generated or no existing — upsert
          await supabase
            .from('profile_summaries')
            .upsert(
              {
                user_id: user.id,
                summary: summaryText,
                source: 'system',
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );
        }
      }
    }

    console.log(`[memory/extract] Done: added=${added}, updated=${updated}, deleted=${deleted}`);
    return res.status(200).json({ success: true, added, updated, deleted });
  } catch (error) {
    console.error('[memory/extract] Unexpected error:', error);
    // Silent failure — don't break user flow
    return res.status(200).json({ success: true, added: 0, updated: 0, deleted: 0 });
  }
}
