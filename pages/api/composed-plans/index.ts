import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getPayloadSizeBytes, rejectIfRateLimited } from '@/lib/rate-limit';
import { PLAN_TITLE_MAX_LENGTH } from '@/lib/plan-generation';
import { trackServerEvent } from '@/lib/analytics';
import type { PlanCategory, PlanContentBlock } from '@/types/plan';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PAYLOAD_BYTES = 48 * 1024;
const FREE_COMPOSED_PLAN_LIMIT = 5;
const VALID_CATEGORIES = new Set<PlanCategory>([
  'emotion', 'learning', 'exercise', 'nutrition', 'social', 'sleep', 'school',
]);
const CATEGORY_TITLES: Record<PlanCategory, string> = {
  emotion: 'Emotional Support',
  learning: 'Learning Strategies',
  exercise: 'Exercise & Movement',
  nutrition: 'Diet & Nutrition',
  social: 'Social Skills',
  sleep: 'Sleep & Rest',
  school: 'School Communication',
};

type ComposedPlanRow = {
  id: string;
  user_id: string;
  title: string;
  summary: string;
  explanation_markdown: string | null;
  topic_categories: PlanCategory[] | null;
  intervention_blocks: PlanContentBlock[] | null;
  source_plan_ids: string[] | null;
  created_at: string;
  updated_at: string;
};

function mapComposedPlan(row: ComposedPlanRow) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    summary: row.summary,
    explanationMarkdown: row.explanation_markdown || undefined,
    topicCategories: (row.topic_categories || []).filter((category) => VALID_CATEGORIES.has(category)),
    interventionBlocks: Array.isArray(row.intervention_blocks) ? row.intervention_blocks : [],
    sourcePlanIds: row.source_plan_ids || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateBlocks(value: unknown): PlanContentBlock[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > 10) return null;
  const blocks: PlanContentBlock[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
    const block = candidate as Record<string, unknown>;
    const title = typeof block.title === 'string' ? block.title.trim().slice(0, 120) : '';
    const contentMarkdown = typeof block.contentMarkdown === 'string' ? block.contentMarkdown.trim() : '';
    if (!contentMarkdown || contentMarkdown.length > 4000) return null;
    blocks.push({ title: title || undefined, contentMarkdown });
  }
  return blocks;
}

async function getUserContext(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return { error: 'Unauthorized' as const, status: 401 as const };
  const supabase = getSupabaseAdmin();
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .single();
  if (error || !user) return { error: 'User not found' as const, status: 404 as const };
  return { supabase, userId: user.id as string, email: session.user.email };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const context = await getUserContext(req, res);
  if ('error' in context) return res.status(context.status ?? 500).json({ error: context.error });

  if (req.method === 'GET') {
    const requestedLimit = Number.parseInt(Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit || '', 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 20) : 20;
    const { data, error, count } = await context.supabase
      .from('composed_plans')
      .select('*', { count: 'exact' })
      .eq('user_id', context.userId)
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('[composed-plans] list error:', error);
      return res.status(500).json({ error: 'Failed to load composed plans' });
    }
    return res.status(200).json({ plans: ((data || []) as ComposedPlanRow[]).map(mapComposedPlan), total: count || 0 });
  }

  if (req.method === 'DELETE') {
    if (rejectIfRateLimited(req, res, {
      namespace: 'composed-plan-delete',
      key: context.email,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    })) return;
    const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    if (!id || !UUID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid composed plan id' });
    const { error } = await context.supabase
      .from('composed_plans')
      .delete()
      .eq('id', id)
      .eq('user_id', context.userId);
    if (error) {
      console.error('[composed-plans] delete error:', error);
      return res.status(500).json({ error: 'Failed to delete composed plan' });
    }
    return res.status(204).end();
  }

  if (getPayloadSizeBytes(req) > MAX_PAYLOAD_BYTES) return res.status(413).json({ error: 'Composed plan is too large' });
  if (rejectIfRateLimited(req, res, {
    namespace: 'composed-plan-save',
    key: context.email,
    limit: 20,
    windowMs: 10 * 60 * 1000,
  })) return;

  const { title, summary, explanationMarkdown, interventionBlocks, sourcePlanIds } = req.body || {};
  const cleanTitle = typeof title === 'string' ? title.replace(/\s+/g, ' ').trim() : '';
  const cleanSummary = typeof summary === 'string' ? summary.trim() : '';
  const cleanExplanation = typeof explanationMarkdown === 'string' ? explanationMarkdown.trim() : '';
  const cleanBlocks = validateBlocks(interventionBlocks);
  if (!cleanTitle || cleanTitle.length > PLAN_TITLE_MAX_LENGTH) {
    return res.status(400).json({ error: `Plan title must be ${PLAN_TITLE_MAX_LENGTH} characters or fewer` });
  }
  if (!cleanSummary || cleanSummary.length > 2000) return res.status(400).json({ error: 'Plan summary is required' });
  if (cleanExplanation.length > 2000) return res.status(400).json({ error: 'Plan explanation is too long' });
  if (!cleanBlocks) return res.status(400).json({ error: 'Composed plan sections are invalid' });
  if (!Array.isArray(sourcePlanIds) || sourcePlanIds.length > 12
    || sourcePlanIds.some((id) => typeof id !== 'string' || !UUID_REGEX.test(id))
    || new Set(sourcePlanIds).size !== sourcePlanIds.length) {
    return res.status(400).json({ error: 'Composed plan sources are invalid' });
  }

  let topicCategories: PlanCategory[] = [];
  if (sourcePlanIds.length > 0) {
    const { data: sourceRows, error: sourceError } = await context.supabase
      .from('plan_items')
      .select('id, category')
      .eq('user_id', context.userId)
      .eq('legacy_composed_shadow', false)
      .in('id', sourcePlanIds);
    if (sourceError) {
      console.error('[composed-plans] source lookup error:', sourceError);
      return res.status(500).json({ error: 'Failed to verify Saved Plan sources' });
    }
    if ((sourceRows || []).length !== sourcePlanIds.length) {
      return res.status(404).json({ error: 'One or more Saved Plan sources were not found' });
    }
    topicCategories = [...new Set((sourceRows || []).map((row) => row.category as PlanCategory))];
  }

  if (topicCategories.length > 1) {
    const blockTitles = new Set(cleanBlocks.flatMap((block) => block.title ? [block.title.toLowerCase()] : []));
    const missingTopic = topicCategories.find((category) => !blockTitles.has(CATEGORY_TITLES[category].toLowerCase()));
    if (missingTopic) return res.status(400).json({ error: 'Composed plan is missing a selected topic section' });
  }

  const { count: existingCount, error: countError } = await context.supabase
    .from('composed_plans')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', context.userId);
  if (countError) return res.status(500).json({ error: 'Failed to check composed plan limit' });
  if ((existingCount || 0) >= FREE_COMPOSED_PLAN_LIMIT) {
    return res.status(403).json({ error: 'Free plan limit reached. Keep up to five composed plans.' });
  }

  const { data, error } = await context.supabase
    .from('composed_plans')
    .insert({
      user_id: context.userId,
      title: cleanTitle,
      summary: cleanSummary,
      explanation_markdown: cleanExplanation || null,
      topic_categories: topicCategories,
      intervention_blocks: cleanBlocks,
      source_plan_ids: sourcePlanIds,
    })
    .select('*')
    .single();
  if (error) {
    console.error('[composed-plans] create error:', error);
    return res.status(500).json({ error: 'Failed to save composed plan' });
  }

  await trackServerEvent(req, 'plan:item_saved', {
    save_source: 'composed',
    category: topicCategories.length === 1 ? topicCategories[0] : 'multi',
  }, { userId: context.userId, pagePath: '/plan' });
  return res.status(201).json({ plan: mapComposedPlan(data as ComposedPlanRow) });
}
