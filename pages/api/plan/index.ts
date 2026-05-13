import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';
import type { ActionPlanItem, PlanCategory, PlanContentBlock, WeekDay } from '../../../types/plan';
import { PLAN_CATEGORIES } from '../../../types/plan';

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

const VALID_CATEGORIES = new Set(PLAN_CATEGORIES.map((category) => category.id));
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FREE_PLAN_LIMIT = 5;

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

function getSingleQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isPlanCategory(value: unknown): value is PlanCategory {
  return typeof value === 'string' && VALID_CATEGORIES.has(value as PlanCategory);
}

function validateText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

async function getOrCreateUser(req: NextApiRequest, res: NextApiResponse) {
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
      console.error('[plan] create user error:', createError);
      return { error: 'Internal server error' as const, status: 500 as const };
    }

    user = newUser;
  } else if (userError) {
    console.error('[plan] user lookup error:', userError);
    return { error: 'Internal server error' as const, status: 500 as const };
  }

  return { supabase, userId: user!.id };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = await getOrCreateUser(req, res);
  if ('error' in context) {
    return res.status(context.status || 500).json({ error: context.error });
  }

  const { supabase, userId } = context;

  try {
    if (req.method === 'GET') {
      const category = getSingleQueryValue(req.query.category);

      let query = supabase
        .from('plan_items')
        .select('*')
        .eq('user_id', userId)
        .order('star', { ascending: false })
        .order('created_at', { ascending: false });

      if (category) {
        if (!isPlanCategory(category)) {
          return res.status(400).json({ error: 'Invalid category' });
        }
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[plan] list error:', error);
        return res.status(500).json({ error: 'Failed to load plan items' });
      }

      const items = ((data || []) as PlanItemRow[]).map(mapPlanItem);
      return res.status(200).json({
        items,
        totalItems: items.length,
        starredCount: items.filter((item) => item.star).length,
      });
    }

    if (req.method === 'POST') {
      const { category, painPoint, strategy, strategySummary, explanationMarkdown, interventionBlocks } = req.body || {};

      if (!isPlanCategory(category)) {
        return res.status(400).json({ error: 'Invalid or missing category' });
      }
      if (!validateText(painPoint)) {
        return res.status(400).json({ error: 'Pain point is required' });
      }
      if (!validateText(strategy)) {
        return res.status(400).json({ error: 'Strategy is required' });
      }

      const { count, error: countError } = await supabase
        .from('plan_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (countError) {
        console.error('[plan] quota count error:', countError);
        return res.status(500).json({ error: 'Failed to check plan limit' });
      }

      if ((count || 0) >= FREE_PLAN_LIMIT) {
        return res.status(403).json({
          error: 'Free plan limit reached. Upgrade to Pro for unlimited items.',
        });
      }

      const { data, error } = await supabase
        .from('plan_items')
        .insert({
          user_id: userId,
          category,
          pain_point: painPoint.trim(),
          strategy: strategy.trim(),
          strategy_summary: validateText(strategySummary) ? strategySummary.trim() : strategy.trim(),
          explanation_markdown: validateText(explanationMarkdown) ? explanationMarkdown.trim() : null,
          intervention_blocks: Array.isArray(interventionBlocks) ? interventionBlocks : [],
          check_in_days: [],
        })
        .select('*')
        .single();

      if (error) {
        console.error('[plan] create error:', error);
        return res.status(500).json({ error: 'Failed to create plan item' });
      }

      return res.status(201).json({ item: mapPlanItem(data as PlanItemRow) });
    }

    if (req.method === 'PUT') {
      const id = getSingleQueryValue(req.query.id);
      if (!id) return res.status(400).json({ error: 'Missing id' });
      if (!UUID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid id format' });

      const { category, painPoint, strategy, strategySummary, explanationMarkdown, interventionBlocks, star } = req.body || {};
      const update: Record<string, unknown> = {};

      if (category !== undefined) {
        if (!isPlanCategory(category)) return res.status(400).json({ error: 'Invalid category' });
        update.category = category;
      }
      if (painPoint !== undefined) {
        if (!validateText(painPoint)) return res.status(400).json({ error: 'Pain point must be a non-empty string' });
        update.pain_point = painPoint.trim();
      }
      if (strategy !== undefined) {
        if (!validateText(strategy)) return res.status(400).json({ error: 'Strategy must be a non-empty string' });
        update.strategy = strategy.trim();
        update.strategy_summary = strategy.trim();
      }
      if (strategySummary !== undefined) {
        if (!validateText(strategySummary)) return res.status(400).json({ error: 'Strategy summary must be a non-empty string' });
        update.strategy_summary = strategySummary.trim();
      }
      if (explanationMarkdown !== undefined) {
        update.explanation_markdown = validateText(explanationMarkdown) ? explanationMarkdown.trim() : null;
      }
      if (interventionBlocks !== undefined) {
        if (!Array.isArray(interventionBlocks)) return res.status(400).json({ error: 'Intervention blocks must be an array' });
        update.intervention_blocks = interventionBlocks;
      }
      if (star !== undefined) {
        if (typeof star !== 'boolean') return res.status(400).json({ error: 'Star must be a boolean' });
        update.star = star;
      }

      if (Object.keys(update).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      const { data, error } = await supabase
        .from('plan_items')
        .update(update)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error && error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Not found' });
      }
      if (error) {
        console.error('[plan] update error:', error);
        return res.status(500).json({ error: 'Failed to update plan item' });
      }

      return res.status(200).json({ item: mapPlanItem(data as PlanItemRow) });
    }

    if (req.method === 'DELETE') {
      const id = getSingleQueryValue(req.query.id);
      if (!id) return res.status(400).json({ error: 'Missing id' });
      if (!UUID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid id format' });

      const { data, error } = await supabase
        .from('plan_items')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .select('id')
        .single();

      if (error && error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Not found' });
      }
      if (error) {
        console.error('[plan] delete error:', error);
        return res.status(500).json({ error: 'Failed to delete plan item' });
      }

      if (!data) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.status(204).end();
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (error) {
    console.error('[plan] unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
