// pages/api/followup/cron/extract.ts — Daily follow-up extraction cron
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../../../../lib/supabase';

// Request Vercel 60s timeout (Hobby plan max)
export const config = { maxDuration: 60 };

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

const EXTRACTION_SYSTEM_PROMPT = `You are analyzing an AI counseling conversation between a parent and Qimi (an ADHD family AI assistant). Your job is to determine if the AI gave specific, actionable advice that warrants a follow-up check-in tomorrow.

Rules:
- Only create a follow-up if the AI suggested a CONCRETE method the parent can try (not general reassurance).
- The follow-up question should be warm and natural, like a caring friend checking in.
- method_short_name must be 50 characters or fewer.
- Write everything in English.
- If unsure, set should_create to false.`;

const FOLLOWUP_EXTRACTION_TOOL = {
  type: 'function' as const,
  function: {
    name: 'create_followup_reminder',
    description: 'Extract a follow-up reminder from an AI conversation where specific advice was given. Only call this if the AI provided a concrete, actionable method that the parent can try.',
    parameters: {
      type: 'object',
      properties: {
        should_create: {
          type: 'boolean',
          description: 'Whether this conversation warrants a follow-up. True only if: (1) a specific actionable method was suggested, (2) the parent seemed receptive, (3) the method can be tried within 1-2 days.',
        },
        parent_problem: {
          type: 'string',
          description: 'The specific challenge the parent described, in 1-2 sentences. Write in English.',
        },
        suggested_method: {
          type: 'string',
          description: 'The concrete method or strategy the AI suggested, in 1-2 sentences. Write in English.',
        },
        method_short_name: {
          type: 'string',
          maxLength: 50,
          description: 'A short label for the method (max 50 chars). E.g., "Pomodoro Timer", "5-Minute Breathing", "Token Reward Chart".',
        },
        follow_up_question: {
          type: 'string',
          description: 'A warm, natural follow-up question to ask the next day. Should reference the specific method and invite the parent to share results. Write in English.',
        },
      },
      required: ['should_create'],
    },
  },
};

interface ExtractionResult {
  should_create: boolean;
  parent_problem?: string;
  suggested_method?: string;
  method_short_name?: string;
  follow_up_question?: string;
}

async function extractFollowUp(
  messages: Array<{ role: string; content: string }>
): Promise<ExtractionResult | null> {
  if (!DEEPSEEK_API_KEY) return null;

  try {
    const response = await fetch(`${DEEPSEEK_API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
          ...messages,
        ],
        tools: [FOLLOWUP_EXTRACTION_TOOL],
        tool_choice: { type: 'function', function: { name: 'create_followup_reminder' } },
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('[cron/extract] DeepSeek API error:', response.status);
      return null;
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return null;

    return JSON.parse(toolCall.function.arguments) as ExtractionResult;
  } catch (error) {
    console.error('[cron/extract] Extraction error:', error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!DEEPSEEK_API_KEY) {
    console.warn('[cron/extract] DEEPSEEK_API_KEY not set, skipping');
    return res.status(200).json({ processed: 0, extracted: 0, skipped: 0, errors: 0 });
  }

  const supabase = getSupabaseAdmin();
  const stats = { processed: 0, extracted: 0, skipped: 0, errors: 0 };

  try {
    // Find conversations updated in the last 26 hours with >= 4 messages
    const cutoff = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();

    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, user_id, title')
      .gte('updated_at', cutoff)
      .gte('message_count', 4)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (convError || !conversations?.length) {
      return res.status(200).json(stats);
    }

    // Get users who already have active follow-ups
    const userIds = [...new Set(conversations.map(c => c.user_id))];

    const { data: activeFollowups } = await supabase
      .from('followup_items')
      .select('user_id')
      .in('user_id', userIds)
      .in('status', ['pending', 'scheduled'])
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const usersWithActiveFollowups = new Set(
      (activeFollowups || []).map(f => f.user_id)
    );

    // Get users who opted out
    const { data: optedOut } = await supabase
      .from('followup_preferences')
      .select('user_id')
      .in('user_id', userIds)
      .eq('enabled', false);

    const optedOutUsers = new Set((optedOut || []).map(p => p.user_id));

    // Filter eligible conversations
    const eligible = conversations.filter(
      c => !usersWithActiveFollowups.has(c.user_id) && !optedOutUsers.has(c.user_id)
    );

    // Process max 5 per run
    const toProcess = eligible.slice(0, 5);

    for (const conv of toProcess) {
      stats.processed++;

      try {
        // Fetch last 6 messages
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('role, content')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(6);

        if (msgError || !messages?.length) {
          stats.skipped++;
          continue;
        }

        // Reverse to chronological order
        const chronMessages = messages.reverse();

        // Check last message is from assistant
        if (chronMessages[chronMessages.length - 1].role !== 'assistant') {
          stats.skipped++;
          continue;
        }

        // Extract follow-up via LLM
        const result = await extractFollowUp(chronMessages);

        if (!result || !result.should_create) {
          stats.skipped++;
          continue;
        }

        // Validate required fields
        if (!result.parent_problem || !result.suggested_method ||
            !result.method_short_name || !result.follow_up_question) {
          stats.skipped++;
          continue;
        }

        // Insert follow-up item
        const { error: insertError } = await supabase
          .from('followup_items')
          .insert({
            user_id: conv.user_id,
            status: 'pending',
            parent_problem: result.parent_problem,
            suggested_method: result.suggested_method,
            method_short_name: result.method_short_name.slice(0, 50),
            follow_up_question: result.follow_up_question,
            source_conversation_id: conv.id,
          });

        if (insertError) {
          // 23505 = unique constraint violation (user already has active followup)
          if (insertError.code === '23505') {
            stats.skipped++;
          } else {
            console.error('[cron/extract] Insert error:', insertError);
            stats.errors++;
          }
          continue;
        }

        stats.extracted++;
      } catch (error) {
        console.error('[cron/extract] Processing error for conversation:', conv.id, error);
        stats.errors++;
      }
    }

    return res.status(200).json(stats);
  } catch (error) {
    console.error('[cron/extract] Cron error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
