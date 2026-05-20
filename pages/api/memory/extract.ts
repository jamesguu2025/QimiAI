// pages/api/memory/extract.ts
// POST: Extract structured facts from conversation using A.U.D.N. pattern
// Called asynchronously after chat stream completes

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { trackServerEvent } from '../../../lib/analytics';
import { getPayloadSizeBytes, rejectIfRateLimited } from '../../../lib/rate-limit';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const DEEPSEEK_THINKING = { type: 'disabled' };
const MAX_PAYLOAD_BYTES = 4 * 1024;

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

interface ActiveFact {
  category: string;
  fact_key: string;
  fact_value: string;
  confidence?: number;
  updated_at?: string;
}

const CATEGORY_GUIDE: Record<FactCategory, { label: string; description: string }> = {
  child_info: { label: 'Child Info', description: 'name, age, gender, school, grade' },
  school: { label: 'School & Learning', description: 'grades, homework, subjects, teacher feedback' },
  family: { label: 'Family', description: 'parents, siblings, living situation, care arrangements' },
  behavior: { label: 'Behavior', description: 'habits, emotional patterns, routines, social behavior outside sports' },
  preference: { label: 'Interests & Preferences', description: 'likes, dislikes, hobbies, personal preferences' },
  medical: { label: 'Medical', description: 'diagnosis, medication, supplements, doctor advice' },
  concern: { label: 'Parent Concerns', description: 'parent worries, pain points, pressure points' },
  goal: { label: 'Parent Goals', description: 'parent goals, wishes, target outcomes' },
  progress: { label: 'Progress', description: 'positive changes, milestones, improved abilities' },
  sports: { label: 'Sports & Activities', description: 'exercise habits, sports, physical activities and related struggles' },
};

const EXTRACTION_SYSTEM_PROMPT = `You are a family profile memory extractor.

Your job is to extract durable, useful facts about the child and family from parent messages.

Core rules:
- Use only user-provided information. Ignore assistant replies.
- Extract generously when a message contains a child/family fact. Use lower confidence when uncertain.
- Do not extract generic advice requests with no personal facts.
- Write fact values as normalized profile facts, not copied chat wording.
- Never preserve first-person framing such as "my son", "my daughter", "I am worried", "we want", "我的孩子", or "我担心".
- Prefer neutral, third-person wording:
  - "my son really likes painting and drawing" -> "Child enjoys painting and drawing"
  - "I am worried he never finishes homework" -> "Parent is worried the child does not finish homework"
  - "我很担心他最近不爱写作业" -> "担心孩子最近不爱写作业"
  - "他说他喜欢打网球" -> "喜欢打网球"
- Keep each value short and factual. No advice, encouragement, interpretation, or assistant-style language.
- One fact should represent one idea. Do not combine unrelated facts into one value.
- Use stable snake_case keys so later messages can update the same fact.
- If the user explicitly corrects or negates an existing fact, return DELETE or UPDATE.

Valid categories:
${VALID_CATEGORIES.map((category) => `- ${category}: ${CATEGORY_GUIDE[category].description}`).join('\n')}

Output only valid JSON matching the user prompt schema.`;

function cleanJsonResponse(responseText: string): string {
  return responseText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
}

function normalizeFactKey(key: string): string {
  const normalized = key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);

  return normalized || 'profile_fact';
}

function normalizeFactValue(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[-*•]\s*/, '')
    .replace(/^my son\b/i, 'Child')
    .replace(/^my daughter\b/i, 'Child')
    .replace(/^my child\b/i, 'Child')
    .replace(/^our son\b/i, 'Child')
    .replace(/^our daughter\b/i, 'Child')
    .replace(/^our child\b/i, 'Child')
    .replace(/^i am worried\b/i, 'Parent is worried')
    .replace(/^i'm worried\b/i, 'Parent is worried')
    .replace(/^we are worried\b/i, 'Parents are worried')
    .replace(/^we want\b/i, 'Parents want')
    .replace(/^我儿子/, '孩子')
    .replace(/^我女儿/, '孩子')
    .replace(/^我的孩子/, '孩子')
    .replace(/^我家孩子/, '孩子')
    .replace(/^我很担心/, '家长担心')
    .replace(/^我担心/, '家长担心')
    .slice(0, 180);
}

function normalizeExtractedFact(fact: ExtractedFact): ExtractedFact | null {
  if (!VALID_CATEGORIES.includes(fact.category)) return null;
  if (!['ADD', 'UPDATE', 'DELETE'].includes(fact.action)) return null;

  const key = normalizeFactKey(fact.key || '');
  const value = normalizeFactValue(fact.value || '');
  if (!value || value.length < 2) return null;

  return {
    ...fact,
    key,
    value,
    confidence: Math.min(1, Math.max(0, fact.confidence || 0.7)),
    existing_id: fact.existing_id || null,
  };
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

  return `Analyze these parent messages and extract only NEW, CHANGED, or explicitly contradicted facts.

EXISTING FACTS:
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
      "value": "<normalized profile fact, not copied raw wording>",
      "confidence": <0.0 to 1.0>,
      "existing_id": "<uuid if UPDATE/DELETE, null if ADD>"
    }
  ],
  "summary_update": null
}

Rules:
- Extract generously when the user provides child/family facts
- ADD: New fact not in existing facts
- UPDATE: Existing fact whose value has changed
- DELETE: Existing fact explicitly contradicted by the user
- Do NOT include unchanged facts
- Do NOT extract facts that duplicate existing ones with same meaning
- Write fact.value as a concise profile bullet, not as the user's raw sentence
- Avoid "my son", "my daughter", "I", "we", "我的", "我担心" framing in fact.value
- Keep summary_update null; the server rewrites the summary from active facts after applying changes
- Output ONLY valid JSON, no markdown fences, no extra text`;
}

function buildProfileSummaryPrompt(activeFacts: ActiveFact[]): string {
  const factLines = activeFacts
    .map((fact) => {
      const label = CATEGORY_GUIDE[fact.category as FactCategory]?.label || fact.category;
      return `- [${label}] ${fact.fact_key}: ${fact.fact_value}`;
    })
    .join('\n');

  return `Rewrite these active profile facts into one concise family profile summary.

Rules:
- Maximum 200 characters.
- Neutral third-person wording.
- No advice, encouragement, disclaimers, or assistant voice.
- Do not copy raw chat phrasing.
- Include the most useful stable facts only.
- Output JSON only: {"summary":"..."}

ACTIVE FACTS:
${factLines || 'None'}`;
}

async function callDeepSeek(messages: Array<{ role: 'system' | 'user'; content: string }>, maxTokens: number) {
  const llmResponse = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      temperature: 0.2,
      max_tokens: maxTokens,
      thinking: DEEPSEEK_THINKING,
    }),
  });

  if (!llmResponse.ok) {
    throw new Error(`LLM API error: ${llmResponse.status}`);
  }

  const llmData = await llmResponse.json();
  const responseText = llmData.choices?.[0]?.message?.content?.trim();
  if (!responseText) {
    throw new Error('Empty LLM response');
  }

  return responseText;
}

const MEMORY_GATE_SYSTEM_PROMPT = `You are a memory gate for a family profile system.
Decide if the recent conversation contains facts worth saving to the user's family profile.

Return shouldExtract=true if the messages contain:
- Facts about the child (name, age, school, behavior, health, physical observations, habits, abilities)
- Family situation (living arrangement, siblings, parent context)
- Parent concerns, goals, or direct observations about their child
- Medical, educational, behavioral, or progress information

Return shouldExtract=false if the messages are:
- Pure greetings, thanks, or small talk with no personal facts
- Generic questions about ADHD with no personal context about their child
- Requests to continue, repeat, or elaborate with no new personal information

Output only JSON, no extra text:
{"shouldExtract": true, "reason": "brief reason"}`;

interface ConversationMessage {
  role: string;
  content: string;
}

async function shouldExtractMemory(messages: ConversationMessage[]): Promise<boolean> {
  // Gate uses last 4 messages (both roles) for context
  const gateMessages = messages.slice(0, 4);
  const hasUserMessage = gateMessages.some((m) => m.role === 'user');
  if (!hasUserMessage) return false;

  const formatted = gateMessages
    .map((m, i) => `[${i + 1}][${m.role}] ${m.content.trim()}`)
    .join('\n');

  try {
    const responseText = await callDeepSeek(
      [
        { role: 'system', content: MEMORY_GATE_SYSTEM_PROMPT },
        { role: 'user', content: `Recent conversation:\n${formatted}\n\nShould facts be extracted?` },
      ],
      100
    );
    const cleaned = cleanJsonResponse(responseText);
    const parsed = JSON.parse(cleaned) as { shouldExtract?: boolean; reason?: string };
    if (typeof parsed.shouldExtract === 'boolean') {
      console.log(`[memory/extract] Gate: shouldExtract=${parsed.shouldExtract}, reason=${parsed.reason}`);
      return parsed.shouldExtract;
    }
  } catch (err) {
    // Fail-open: gate errors must not block extraction
    console.warn('[memory/extract] Gate failed, defaulting to extract:', err instanceof Error ? err.message : err);
  }
  return true;
}

async function rewriteSystemSummary(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string
): Promise<void> {
  const { data: existingSummary, error: summaryLoadError } = await supabase
    .from('profile_summaries')
    .select('summary, source')
    .eq('user_id', userId)
    .single();

  if (summaryLoadError && summaryLoadError.code !== 'PGRST116') {
    console.error('[memory/extract] Failed to load profile summary:', summaryLoadError);
    return;
  }

  if (existingSummary?.source === 'user') {
    // User-edited notes must not be overwritten by background extraction.
    return;
  }

  const { data: activeFacts, error: factsError } = await supabase
    .from('memory_items')
    .select('category, fact_key, fact_value, confidence, updated_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false });

  if (factsError) {
    console.error('[memory/extract] Failed to load active facts for summary:', factsError);
    return;
  }

  const facts: ActiveFact[] = activeFacts || [];
  if (facts.length === 0) return;

  try {
    const responseText = await callDeepSeek(
      [
        { role: 'system', content: 'You rewrite structured family facts into a concise profile summary.' },
        { role: 'user', content: buildProfileSummaryPrompt(facts) },
      ],
      500
    );
    const parsed = JSON.parse(cleanJsonResponse(responseText)) as { summary?: string };
    const summaryText = typeof parsed.summary === 'string'
      ? parsed.summary.trim().slice(0, 200)
      : '';

    if (!summaryText) return;

    await supabase
      .from('profile_summaries')
      .upsert(
        {
          user_id: userId,
          summary: summaryText,
          source: 'system',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
  } catch (summaryError) {
    console.error('[memory/extract] Failed to rewrite profile summary:', summaryError);
  }
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

  if (getPayloadSizeBytes(req) > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({ error: 'Payload too large' });
  }

  if (rejectIfRateLimited(req, res, {
    namespace: 'memory-extract',
    key: session.user.email,
    limit: 20,
    windowMs: 60 * 1000,
  })) {
    return;
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

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (conversationError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Load last 10 messages (all roles) — gate uses last 4, extraction uses user-only subset
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (msgError) {
      console.error('[memory/extract] Failed to load messages:', msgError);
      return res.status(200).json({ success: true, added: 0, updated: 0, deleted: 0 });
    }

    if (!messages || messages.length === 0) {
      return res.status(200).json({ success: true, added: 0, updated: 0, deleted: 0 });
    }

    // messages are newest-first; reverse to chronological for readability
    const chronological = [...messages].reverse();

    // AI Gate: lightweight classifier before running full extraction
    const gate = await shouldExtractMemory(chronological.slice(-4));
    if (!gate) {
      return res.status(200).json({ success: true, skipped: 'gate_no_family_context', added: 0, updated: 0, deleted: 0 });
    }

    // Extraction uses user messages only
    const recentMessages = chronological
      .filter((m) => m.role === 'user')
      .map((m) => m.content);

    // Load existing active memory items
    const { data: existingFacts } = await supabase
      .from('memory_items')
      .select('id, category, fact_key, fact_value, confidence')
      .eq('user_id', user.id)
      .eq('status', 'active');

    const existing: ExistingFact[] = existingFacts || [];

    // Call LLM for extraction
    const prompt = buildExtractionPrompt(existing, recentMessages);

    let responseText: string;
    try {
      responseText = await callDeepSeek(
        [
          { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        2000
      );
    } catch (llmError) {
      console.error('[memory/extract] LLM extraction error:', llmError instanceof Error ? llmError.message : llmError);
      return res.status(200).json({ success: true, added: 0, updated: 0, deleted: 0 });
    }

    // Parse LLM response — strip markdown fences if present
    let parsed: ExtractionResult;
    try {
      parsed = JSON.parse(cleanJsonResponse(responseText));
    } catch (parseErr) {
      console.error('[memory/extract] Failed to parse LLM response:', parseErr instanceof Error ? parseErr.message : parseErr);
      return res.status(200).json({ success: true, added: 0, updated: 0, deleted: 0 });
    }

    // Execute A.U.D.N. operations (cap at 10)
    const facts = (Array.isArray(parsed.facts) ? parsed.facts : [])
      .map(normalizeExtractedFact)
      .filter((fact): fact is ExtractedFact => fact !== null)
      .slice(0, 10);
    let added = 0;
    let updated = 0;
    let deleted = 0;

    for (const fact of facts) {
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
              confidence: fact.confidence,
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
              confidence: fact.confidence,
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
            confidence: fact.confidence,
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

    if (added + updated + deleted > 0) {
      await rewriteSystemSummary(supabase, user.id);
    }

    await trackServerEvent(req, 'memory:fact_extracted', {
      added_count: added,
      updated_count: updated,
      deleted_count: deleted,
      source: 'conversation',
    }, { userId: user.id, pagePath: '/api/memory/extract' });

    console.log(`[memory/extract] Done: added=${added}, updated=${updated}, deleted=${deleted}`);
    return res.status(200).json({ success: true, added, updated, deleted });
  } catch (error) {
    console.error('[memory/extract] Unexpected error:', error);
    // Silent failure — don't break user flow
    return res.status(200).json({ success: true, added: 0, updated: 0, deleted: 0 });
  }
}
