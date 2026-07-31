import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';
import type { ActionPlanItem, PlanCategory, PlanContentBlock, WeekDay } from '../../../types/plan';
import { PLAN_CATEGORIES } from '../../../types/plan';
import { PLAN_TITLE_MAX_LENGTH } from '../../../lib/plan-generation';
import { extractMarkdownTables } from '../../../utils/markdown-tables';
import { trackServerEvent } from '../../../lib/analytics';
import { getPayloadSizeBytes, rejectIfRateLimited } from '../../../lib/rate-limit';
import { actorKey, consumePersistentRateLimit, consumePlanAiQuota } from '../../../lib/ai-usage';

type PlanItemRow = {
  id: string;
  user_id: string;
  category: PlanCategory;
  pain_point: string;
  strategy: string;
  strategy_summary?: string | null;
  explanation_markdown?: string | null;
  intervention_blocks?: PlanContentBlock[] | null;
  star: boolean;
  check_in_days: WeekDay[] | null;
  last_check_in: string | null;
  source_conversation_id?: string | null;
  source_message_id?: string | null;
  source_time?: string | null;
  source_type?: 'manual' | 'chat' | null;
  created_at: string;
  updated_at: string;
};

type ExtractedPlan = {
  hasActionableStrategy: boolean;
  category: PlanCategory | 'none';
  painPoint: string;
  explanationMarkdown?: string;
  interventionBlocks: PlanContentBlock[];
  strategySummary: string;
  confidence: number;
  safetyFlags: string[];
};

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const DEEPSEEK_THINKING = { type: 'disabled' };
const VALID_CATEGORIES = new Set(PLAN_CATEGORIES.map((category) => category.id));
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HARD_BLOCK_FLAGS = new Set(['crisis']);
const MEDICATION_DIRECTIVE_PATTERN = /\b(increase|decrease|raise|lower|reduce|stop|start|switch|change|double|halve|take|give)\b.*\b(\d+\s?mg|dose|dosage|tablet|pill|capsule)\b|(\d+\s?mg).*\b(increase|decrease|raise|lower|reduce|stop|start|switch|change|take|give)\b/i;
const MAX_PAYLOAD_BYTES = 16 * 1024;

function mapPlanItem(row: PlanItemRow): ActionPlanItem {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category,
    painPoint: row.pain_point,
    strategy: row.strategy,
    strategySummary: row.strategy_summary || row.strategy,
    explanationMarkdown: row.explanation_markdown || undefined,
    interventionBlocks: Array.isArray(row.intervention_blocks) ? row.intervention_blocks : [],
    star: row.star,
    checkInDays: row.check_in_days || [],
    lastCheckIn: row.last_check_in || undefined,
    sourceConversationId: row.source_conversation_id || undefined,
    sourceMessageId: row.source_message_id || undefined,
    sourceTime: row.source_time || undefined,
    sourceType: row.source_type || 'manual',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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
      console.error('[plan/save-from-chat] create user error:', createError);
      return { error: 'Internal server error' as const, status: 500 as const };
    }
    user = newUser;
  } else if (userError) {
    console.error('[plan/save-from-chat] user lookup error:', userError);
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
    console.error('[plan/save-from-chat] source message lookup error:', error);
    return null;
  }

  const match = (messages || []).find((message) => (
    typeof message.content === 'string' &&
    normalizeMessageContent(message.content) === normalizedAssistantContent
  ));

  return match?.id || null;
}

async function extractPlan(assistantContent: string, userContext?: string): Promise<ExtractedPlan> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  const prompt = `Extract one Growth Plan item from this assistant response.

Rules:
- Return JSON only.
- The user already clicked "Save to Growth Plan"; this is the confirmation. Do not ask for another confirmation.
- Preserve useful Markdown from the assistant response, especially GitHub-Flavored Markdown tables, bullet lists, numbered steps, and bold text.
- If the assistant response contains a Markdown table, copy that table into interventionBlocks.contentMarkdown exactly. Do not rewrite table rows into plain paragraphs.
- Store semantic structure first: painPoint, explanationMarkdown, interventionBlocks[], strategySummary.
- interventionBlocks must be an array of focused sections. Each block has optional title and contentMarkdown.
- contentMarkdown must be GFM-compatible Markdown, not HTML.
- Extract only strategies a parent can choose to save and try.
- Do not save diagnosis, concrete medication dosage/change instructions, emergency, legal, or direct professional-treatment instructions.
- If content is diagnosis/IEP/legal/medication-adjacent but can be turned into a safe parent action, save the parent action instead, such as tracking observations or preparing questions for a qualified professional.
- If there is no concrete strategy, return hasActionableStrategy=false and category="none".
- Use only these categories for saveable strategies: emotion, learning, exercise, nutrition, social, sleep, school.
- strategySummary should be one concise sentence for card display.
- painPoint is the saved plan title. Return a concise noun phrase of no more than ${PLAN_TITLE_MAX_LENGTH} characters; do not copy a full user sentence.
- Safety flags may include: none, medical, diagnosis, medication, crisis, legal, not_child_related, too_vague.

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
    throw new Error(`LLM extraction failed: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== 'string') {
    throw new Error('Missing extraction content');
  }

  return JSON.parse(cleanJsonResponse(text)) as ExtractedPlan;
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

function validateExtractedPlan(extracted: ExtractedPlan) {
  if (!extracted.hasActionableStrategy) {
    return { error: 'No actionable strategy found' as const };
  }

  if (!isPlanCategory(extracted.category)) {
    return { error: 'No actionable strategy found' as const };
  }

  if (typeof extracted.painPoint !== 'string' || extracted.painPoint.trim().length < 3) {
    return { error: 'No actionable strategy found' as const };
  }

  if (typeof extracted.strategySummary !== 'string' || extracted.strategySummary.trim().length < 3) {
    return { error: 'No actionable strategy found' as const };
  }

  if (typeof extracted.confidence !== 'number' || extracted.confidence < 0.55) {
    return { error: 'No actionable strategy found' as const };
  }

  const flags = Array.isArray(extracted.safetyFlags) ? extracted.safetyFlags : [];
  if (flags.some((flag) => HARD_BLOCK_FLAGS.has(flag))) {
    return { error: 'Unsafe or unsupported plan item' as const };
  }

  const interventionBlocks = validateBlocks(extracted.interventionBlocks);
  const contentForSafety = `${extracted.strategySummary}\n${interventionBlocks.map((block) => block.contentMarkdown).join('\n')}`;
  if (flags.includes('medication') && MEDICATION_DIRECTIVE_PATTERN.test(contentForSafety)) {
    return { error: 'Unsafe or unsupported plan item' as const };
  }

  const fallbackBlock = interventionBlocks.length > 0
    ? interventionBlocks
    : [{ contentMarkdown: extracted.strategySummary.trim() }];

  return {
    plan: {
      category: extracted.category,
      painPoint: extracted.painPoint.trim().slice(0, PLAN_TITLE_MAX_LENGTH),
      explanationMarkdown: typeof extracted.explanationMarkdown === 'string'
        ? extracted.explanationMarkdown.trim().slice(0, 2000)
        : '',
      interventionBlocks: fallbackBlock,
      strategySummary: extracted.strategySummary.trim().slice(0, 500),
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
) {
  if (sourceMessageId) {
    const { data } = await supabase
      .from('plan_items')
      .select('id')
      .eq('user_id', userId)
      .eq('legacy_composed_shadow', false)
      .eq('source_message_id', sourceMessageId)
      .maybeSingle();

    if (data?.id) {
      return { matchedItemId: data.id, reason: 'same source message' };
    }
  }

  let query = supabase
    .from('plan_items')
    .select('id, pain_point, strategy, strategy_summary, intervention_blocks')
    .eq('user_id', userId)
    .eq('legacy_composed_shadow', false)
    .eq('category', category);

  if (sourceConversationId) {
    query = query.eq('source_conversation_id', sourceConversationId);
  }

  const { data: items, error } = await query.limit(20);
  if (error) throw error;

  const draftContent = normalizeForDuplicate([
    painPoint,
    strategySummary,
    ...interventionBlocks.map((block) => block.contentMarkdown),
  ].join(' '));

  const match = (items || []).find((item) => {
    const itemBlocks = Array.isArray(item.intervention_blocks)
      ? item.intervention_blocks.map((block: PlanContentBlock) => block.contentMarkdown).join(' ')
      : '';
    return looksSimilar(
      draftContent,
      normalizeForDuplicate(`${item.pain_point} ${item.strategy_summary || item.strategy} ${itemBlocks}`)
    );
  });

  return match ? { matchedItemId: match.id, reason: 'similar saved plan' } : null;
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
    namespace: 'plan-save-from-chat',
    key: userId,
    limit: 20,
    windowMs: 60 * 1000,
  })) {
    return;
  }

  const { assistantContent, userContext, duplicateOverride } = req.body || {};
  const sourceConversationId = asUuidOrNull(req.body?.sourceConversationId || req.body?.conversationId);
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

    const planActor = actorKey('user', userId);
    const minuteLimit = await consumePersistentRateLimit({ actorKey: planActor, scope: 'plan_ai' });
    if (!minuteLimit.allowed) {
      res.setHeader('Retry-After', String(minuteLimit.retryAfterSeconds));
      return res.status(429).json({ error: 'Too many AI plan requests. Please wait a minute and try again.' });
    }
    const quota = await consumePlanAiQuota(userId);
    if (!quota.allowed) {
      await trackServerEvent(req, 'quota:limit_reached', {
        feature: 'plan_ai', auth_state: 'authenticated', period: 'week',
      }, { userId, pagePath: '/chat' });
      return res.status(429).json({ error: 'Weekly AI plan limit reached', quota: { remaining: 0 } });
    }
    await trackServerEvent(req, 'plan:generation_started', {
      generation_source: 'chat_save', source_count: 1,
    }, { userId, pagePath: '/chat' });

    const extracted = await extractPlan(
      assistantContent.trim().slice(0, 8000),
      typeof userContext === 'string' ? userContext.trim().slice(0, 1000) : undefined
    );
    const validation = validateExtractedPlan(extracted);
    if ('error' in validation) {
      return res.status(400).json({ error: validation.error });
    }

    const plan = validation.plan;
    const sourceTables = extractMarkdownTables(assistantContent);
    const planHasTable = plan.interventionBlocks.some((block) => (
      extractMarkdownTables(block.contentMarkdown, 1).length > 0
    ));
    const interventionBlocks = planHasTable
      ? plan.interventionBlocks
      : [
        ...plan.interventionBlocks,
        ...sourceTables.map((table, index) => ({
          title: sourceTables.length === 1 ? 'Plan Table' : `Plan Table ${index + 1}`,
          contentMarkdown: table,
        })),
      ];

    const duplicate = await findDuplicate(
      supabase,
      userId,
      plan.category,
      plan.painPoint,
      plan.strategySummary,
      interventionBlocks,
      sourceConversationId,
      sourceMessageId
    );

    if (duplicate && (!duplicateOverride || duplicate.reason === 'same source message')) {
      return res.status(409).json({
        error: duplicate.reason === 'same source message'
          ? 'This suggestion is already saved.'
          : 'This suggestion already looks saved.',
        duplicate,
      });
    }

    const { data, error } = await supabase
      .from('plan_items')
      .insert({
        user_id: userId,
        category: plan.category,
        pain_point: plan.painPoint,
        strategy: plan.strategySummary,
        strategy_summary: plan.strategySummary,
        explanation_markdown: plan.explanationMarkdown || null,
        intervention_blocks: interventionBlocks,
        check_in_days: [],
        source_type: 'chat',
      })
      .select('*')
      .single();

    if (error) {
      console.error('[plan/save-from-chat] create error:', error);
      return res.status(500).json({ error: 'Failed to save plan item' });
    }

    let savedRow = data as PlanItemRow;
    if (sourceConversationId || sourceMessageId) {
      const { data: sourcedData, error: sourceUpdateError } = await supabase
        .from('plan_items')
        .update({
          source_conversation_id: sourceConversationId,
          source_message_id: sourceMessageId,
          source_time: sourceTime,
        })
        .eq('id', savedRow.id)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (sourceUpdateError) {
        console.error('[plan/save-from-chat] source update error:', sourceUpdateError);
      } else if (sourcedData) {
        savedRow = sourcedData as PlanItemRow;
      }
    }

    await trackServerEvent(req, 'plan:item_saved', {
      save_source: 'chat',
      category: plan.category,
    }, { userId, pagePath: '/chat' });

    await trackServerEvent(req, 'plan:generation_completed', {
      generation_source: 'chat_save', source_count: 1, remaining: quota.remaining,
    }, { userId, pagePath: '/chat' });

    return res.status(201).json({ item: mapPlanItem(savedRow), safetyFlags: plan.safetyFlags, quota: { remaining: quota.remaining } });
  } catch (error) {
    console.error('[plan/save-from-chat] unexpected error:', error);
    return res.status(500).json({ error: 'Failed to save plan item' });
  }
}
