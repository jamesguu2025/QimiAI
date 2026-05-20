import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { getPayloadSizeBytes, rejectIfRateLimited } from '../../../lib/rate-limit';
import type { PlanCategory, PlanContentBlock } from '../../../types/plan';
import { PLAN_CATEGORIES } from '../../../types/plan';
import { extractMarkdownTables } from '../../../utils/markdown-tables';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const DEEPSEEK_THINKING = { type: 'disabled' };
const VALID_CATEGORIES = new Set(PLAN_CATEGORIES.map((category) => category.id));
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HARD_BLOCK_FLAGS = new Set(['crisis']);
const MEDICATION_DIRECTIVE_PATTERN = /\b(increase|decrease|raise|lower|reduce|stop|start|switch|change|double|halve|take|give)\b.*\b(\d+\s?mg|dose|dosage|tablet|pill|capsule)\b|(\d+\s?mg).*\b(increase|decrease|raise|lower|reduce|stop|start|switch|change|take|give)\b/i;
const MAX_PAYLOAD_BYTES = 16 * 1024;

type ExtractionCategory = PlanCategory | 'none';

type ExtractedPlanDraft = {
  hasActionableStrategy: boolean;
  category: ExtractionCategory;
  painPoint?: string;
  challenge?: string;
  explanationMarkdown?: string;
  interventionBlocks?: PlanContentBlock[];
  strategySummary?: string;
  strategy?: string;
  confidence: number;
  safetyFlags: string[];
};

type PlanItemDuplicate = {
  isDuplicate: boolean;
  matchedItemId: string | null;
  reason: string | null;
};

function cleanJsonResponse(responseText: string): string {
  return responseText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function normalizeForDuplicate(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksSimilar(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  return a.length > 24 && b.length > 24 && (a.includes(b) || b.includes(a));
}

function asUuidOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  return typeof value === 'string' && UUID_REGEX.test(value) ? value : null;
}

function isPlanCategory(value: unknown): value is PlanCategory {
  return typeof value === 'string' && VALID_CATEGORIES.has(value as PlanCategory);
}

function validateSourceTime(value: unknown): string {
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return new Date().toISOString();
}

function normalizeMessageContent(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

async function getUserId(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return { error: 'Unauthorized' as const, status: 401 as const };
  }

  const supabase = getSupabaseAdmin();
  let { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .single();

  if (userError && userError.code === 'PGRST116') {
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: session.user.email,
        name: session.user.name || null,
        avatar_url: session.user.image || null,
        provider: 'google',
      })
      .select('id')
      .single();

    if (createError) {
      console.error('[plan/extract-from-chat] create user error:', createError);
      return { error: 'Internal server error' as const, status: 500 as const };
    }
    user = newUser;
  } else if (userError) {
    console.error('[plan/extract-from-chat] user lookup error:', userError);
    return { error: 'Internal server error' as const, status: 500 as const };
  }

  return { supabase, userId: user!.id };
}

async function verifySourceOwnership(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  sourceConversationId: string | null,
  sourceMessageId: string | null
) {
  if (sourceConversationId) {
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', sourceConversationId)
      .eq('user_id', userId)
      .single();

    if ((error && error.code === 'PGRST116') || !conversation) return false;
    if (error) throw error;
  }

  if (sourceMessageId) {
    const { data: message, error } = await supabase
      .from('messages')
      .select('id, conversation_id')
      .eq('id', sourceMessageId)
      .single();

    if ((error && error.code === 'PGRST116') || !message) return false;
    if (error) throw error;

    if (sourceConversationId && message.conversation_id !== sourceConversationId) return false;

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', message.conversation_id)
      .eq('user_id', userId)
      .single();

    if ((convError && convError.code === 'PGRST116') || !conversation) return false;
    if (convError) throw convError;
  }

  return true;
}

async function resolveSourceMessageId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  sourceConversationId: string | null,
  sourceMessageId: string | null,
  assistantContent: string
) {
  if (sourceMessageId || !sourceConversationId) return sourceMessageId;

  const normalizedAssistantContent = normalizeMessageContent(assistantContent);
  const { data: messages, error } = await supabase
    .from('messages')
    .select('id, content')
    .eq('conversation_id', sourceConversationId)
    .eq('role', 'assistant')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('[plan/extract-from-chat] source message lookup error:', error);
    return null;
  }

  const match = (messages || []).find((message) => (
    typeof message.content === 'string' &&
    normalizeMessageContent(message.content) === normalizedAssistantContent
  ));

  return match?.id || null;
}

async function extractDraft(assistantContent: string, userContext?: string): Promise<ExtractedPlanDraft> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  const prompt = `Extract one Growth Plan item from this assistant response.

Rules:
- Return JSON only.
- Preserve useful Markdown from the assistant response, especially GitHub-Flavored Markdown tables, bullet lists, numbered steps, and bold text.
- If the assistant response contains a Markdown table, copy that table into interventionBlocks.contentMarkdown exactly. Do not rewrite table rows into plain paragraphs.
- Store semantic structure first: painPoint, explanationMarkdown, interventionBlocks[], strategySummary.
- interventionBlocks must be an array of focused sections. Each block has optional title and contentMarkdown.
- contentMarkdown must be GFM-compatible Markdown, not HTML.
- Extract only strategies a parent can choose to save and try.
- Do not create diagnosis, medication dosage, emergency, legal, or professional-treatment instructions.
- If content is diagnosis/IEP/legal-adjacent but can be turned into a safe parent action, extract the parent action instead of rejecting it.
- If there is no concrete strategy, return hasActionableStrategy=false and category="none".
- Use only these categories for saveable strategies: emotion, learning, exercise, nutrition, social, sleep, school.
- Safety flags may include: none, medical, diagnosis, medication, crisis, legal, not_child_related, too_vague.

Field rules:
- "painPoint": a SHORT noun phrase (max 60 chars) naming the core issue — like a card title. Examples: "Bedtime routine resistance", "Homework avoidance", "Discolored toenail concern". Do NOT write a full sentence or include "Parent concerned about..." framing.
- "strategySummary": one concise sentence for card display.
- "explanationMarkdown": optional context that explains why the plan may help. Keep useful Markdown but omit generic empathy.
- "interventionBlocks": the concrete saved plan details. Preserve tables when the assistant used or implied step/schedule/phase structure.

Output JSON shape:
{
  "hasActionableStrategy": boolean,
  "category": "none" | "emotion" | "learning" | "exercise" | "nutrition" | "social" | "sleep" | "school",
  "painPoint": string,
  "explanationMarkdown": string,
  "interventionBlocks": [{ "title": string, "contentMarkdown": string }],
  "strategySummary": string,
  "confidence": number,
  "safetyFlags": string[]
}

PRECEDING USER CONTEXT:
${userContext || '(none)'}

ASSISTANT RESPONSE:
${assistantContent}`;

  const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: 'You are a careful structured extraction service. Return valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      stream: false,
      temperature: 0.1,
      max_tokens: 1600,
      thinking: DEEPSEEK_THINKING,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek extraction failed: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== 'string') {
    throw new Error('Missing extraction content');
  }

  return JSON.parse(cleanJsonResponse(text)) as ExtractedPlanDraft;
}

function validateBlocks(value: unknown): PlanContentBlock[] {
  if (!Array.isArray(value)) return [];

  const blocks: PlanContentBlock[] = [];
  for (const block of value) {
    if (!block || typeof block !== 'object') continue;
    const maybeBlock = block as Partial<PlanContentBlock>;
    if (typeof maybeBlock.contentMarkdown !== 'string' || !maybeBlock.contentMarkdown.trim()) continue;

    blocks.push({
      title: typeof maybeBlock.title === 'string' && maybeBlock.title.trim()
        ? maybeBlock.title.trim().slice(0, 120)
        : undefined,
      contentMarkdown: maybeBlock.contentMarkdown.trim().slice(0, 3000),
    });
    if (blocks.length >= 8) break;
  }

  return blocks;
}

function validateDraft(draft: ExtractedPlanDraft) {
  if (!draft.hasActionableStrategy) {
    return { error: 'No actionable strategy found' as const };
  }

  if (!isPlanCategory(draft.category)) {
    return { error: 'No actionable strategy found' as const };
  }

  const painPointValue = typeof draft.painPoint === 'string' ? draft.painPoint : draft.challenge;
  const strategySummaryValue = typeof draft.strategySummary === 'string' ? draft.strategySummary : draft.strategy;
  const explanationMarkdown = typeof draft.explanationMarkdown === 'string'
    ? draft.explanationMarkdown.trim().slice(0, 3000)
    : '';
  const interventionBlocks = validateBlocks(draft.interventionBlocks);

  if (typeof painPointValue !== 'string' || painPointValue.trim().length < 3) {
    return { error: 'No actionable strategy found' as const };
  }

  if (typeof strategySummaryValue !== 'string' || strategySummaryValue.trim().length < 3) {
    return { error: 'No actionable strategy found' as const };
  }

  if (typeof draft.confidence !== 'number' || draft.confidence < 0.55) {
    return { error: 'No actionable strategy found' as const };
  }

  const flags = Array.isArray(draft.safetyFlags) ? draft.safetyFlags : [];
  if (flags.some((flag) => HARD_BLOCK_FLAGS.has(flag))) {
    return { error: 'Unsafe or unsupported plan item' as const };
  }

  const blockContent = interventionBlocks.map((block) => `${block.title || ''}\n${block.contentMarkdown}`).join('\n');
  if (
    flags.includes('medication') &&
    MEDICATION_DIRECTIVE_PATTERN.test(`${strategySummaryValue}\n${blockContent}`)
  ) {
    return { error: 'Unsafe or unsupported plan item' as const };
  }

  const strategySummary = strategySummaryValue.trim().slice(0, 1200);
  const safeBlocks = interventionBlocks.length > 0
    ? interventionBlocks
    : [{ contentMarkdown: strategySummary }];
  const painPoint = painPointValue.trim().slice(0, 500);

  return {
    draft: {
      ...draft,
      category: draft.category,
      painPoint,
      challenge: painPoint,
      explanationMarkdown,
      interventionBlocks: safeBlocks,
      strategySummary,
      strategy: strategySummary,
      confidence: Math.max(0, Math.min(1, draft.confidence)),
      safetyFlags: flags.length > 0 ? flags : ['none'],
    },
  };
}

async function findDuplicate(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  category: PlanCategory,
  painPoint: string,
  strategySummary: string,
  interventionBlocks: PlanContentBlock[],
  sourceConversationId: string | null,
  sourceMessageId: string | null
): Promise<PlanItemDuplicate> {
  if (sourceMessageId) {
    const { data } = await supabase
      .from('plan_items')
      .select('id')
      .eq('user_id', userId)
      .eq('source_message_id', sourceMessageId)
      .maybeSingle();

    if (data?.id) {
      return { isDuplicate: true, matchedItemId: data.id, reason: 'same source message' };
    }
  }

  let query = supabase
    .from('plan_items')
    .select('id, pain_point, strategy, strategy_summary, intervention_blocks')
    .eq('user_id', userId)
    .eq('category', category);

  if (sourceConversationId) {
    query = query.eq('source_conversation_id', sourceConversationId);
  }

  const { data: items, error } = await query.limit(20);
  if (error) throw error;

  const draftDetails = interventionBlocks
    .map((block) => `${block.title || ''} ${block.contentMarkdown}`)
    .join(' ');
  const normalizedDraft = normalizeForDuplicate(`${painPoint} ${strategySummary} ${draftDetails}`);
  const match = (items || []).find((item) => (
    looksSimilar(
      normalizedDraft,
      normalizeForDuplicate(
        `${item.pain_point} ${item.strategy_summary || ''} ${item.strategy} ${JSON.stringify(item.intervention_blocks || [])}`
      )
    ) ||
    looksSimilar(normalizeForDuplicate(strategySummary), normalizeForDuplicate(item.strategy_summary || item.strategy))
  ));

  if (match) {
    return { isDuplicate: true, matchedItemId: match.id, reason: 'similar saved strategy' };
  }

  return { isDuplicate: false, matchedItemId: null, reason: null };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const context = await getUserId(req, res);
  if ('error' in context) {
    return res.status(context.status || 500).json({ error: context.error });
  }

  const { supabase, userId } = context;
  if (getPayloadSizeBytes(req) > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({ error: 'Payload too large' });
  }

  if (rejectIfRateLimited(req, res, {
    namespace: 'plan-extract-from-chat',
    key: userId,
    limit: 20,
    windowMs: 60 * 1000,
  })) {
    return;
  }

  const { assistantContent, userContext } = req.body || {};
  const sourceConversationId = asUuidOrNull(req.body?.conversationId || req.body?.sourceConversationId);
  const requestSourceMessageId = asUuidOrNull(req.body?.sourceMessageId);
  const sourceTime = validateSourceTime(req.body?.sourceTime);

  if (typeof assistantContent !== 'string' || assistantContent.trim().length < 10) {
    return res.status(400).json({ error: 'No actionable strategy found' });
  }

  try {
    const ownsSource = await verifySourceOwnership(supabase, userId, sourceConversationId, requestSourceMessageId);
    if (!ownsSource) {
      return res.status(404).json({ error: 'Source conversation not found' });
    }
    const sourceMessageId = await resolveSourceMessageId(
      supabase,
      sourceConversationId,
      requestSourceMessageId,
      assistantContent.trim()
    );

    const extracted = await extractDraft(
      assistantContent.trim().slice(0, 8000),
      typeof userContext === 'string' ? userContext.trim().slice(0, 1000) : undefined
    );
    const validation = validateDraft(extracted);
    if ('error' in validation) {
      return res.status(validation.error === 'Unsafe or unsupported plan item' ? 400 : 400).json({ error: validation.error });
    }

    const sourceTables = extractMarkdownTables(assistantContent);
    const draftHasTable = validation.draft.interventionBlocks.some((block) => (
      extractMarkdownTables(block.contentMarkdown, 1).length > 0
    ));
    const interventionBlocks = draftHasTable
      ? validation.draft.interventionBlocks
      : [
        ...validation.draft.interventionBlocks,
        ...sourceTables.map((table, index) => ({
          title: sourceTables.length === 1 ? 'Plan Table' : `Plan Table ${index + 1}`,
          contentMarkdown: table,
        })),
      ];

    const duplicate = await findDuplicate(
      supabase,
      userId,
      validation.draft.category,
      validation.draft.painPoint,
      validation.draft.strategySummary,
      interventionBlocks,
      sourceConversationId,
      sourceMessageId
    );

    return res.status(200).json({
      draft: {
        category: validation.draft.category,
        painPoint: validation.draft.painPoint,
        challenge: validation.draft.challenge,
        explanationMarkdown: validation.draft.explanationMarkdown,
        interventionBlocks,
        strategySummary: validation.draft.strategySummary,
        strategy: validation.draft.strategy,
        confidence: validation.draft.confidence,
        safetyFlags: validation.draft.safetyFlags,
        sourceConversationId,
        sourceMessageId,
        sourceTime,
      },
      duplicate,
    });
  } catch (error) {
    console.error('[plan/extract-from-chat] error:', error);
    return res.status(500).json({ error: 'Failed to extract plan item' });
  }
}
