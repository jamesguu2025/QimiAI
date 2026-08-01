import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';
import type { ActionPlanItem, PlanCategory, PlanContentBlock, WeekDay } from '../../../types/plan';
import { trackServerEvent } from '../../../lib/analytics';

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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WEEK_DAYS: WeekDay[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = getSingleQueryValue(req.query.id);
  if (!id) return res.status(400).json({ error: 'Missing id' });
  if (!UUID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid id format' });

  const supabase = getSupabaseAdmin();

  try {
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
        console.error('[plan/checkin] create user error:', createError);
        return res.status(500).json({ error: 'Internal server error' });
      }

      user = newUser;
    } else if (userError) {
      console.error('[plan/checkin] user lookup error:', userError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    const { data: existing, error: existingError } = await supabase
      .from('plan_items')
      .select('check_in_days')
      .eq('id', id)
      .eq('user_id', user!.id)
      .single();

    if (existingError && existingError.code === 'PGRST116') {
      return res.status(404).json({ error: 'Not found' });
    }
    if (existingError) {
      console.error('[plan/checkin] read error:', existingError);
      return res.status(500).json({ error: 'Failed to check in' });
    }

    const today = new Date();
    const weekday = WEEK_DAYS[today.getDay()];
    const existingDays = ((existing?.check_in_days || []) as WeekDay[]).filter(Boolean);
    const checkInDays = existingDays.includes(weekday)
      ? existingDays
      : [...existingDays, weekday];

    const { data, error } = await supabase
      .from('plan_items')
      .update({
        last_check_in: today.toISOString(),
        check_in_days: checkInDays,
      })
      .eq('id', id)
      .eq('user_id', user!.id)
      .select('*')
      .single();

    if (error && error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Not found' });
    }
    if (error) {
      console.error('[plan/checkin] update error:', error);
      return res.status(500).json({ error: 'Failed to check in' });
    }

    await trackServerEvent(req, 'plan:item_checked_in', {
      category: (data as PlanItemRow).category,
      checked_in: true,
    }, { userId: user!.id, userEmail: session.user.email, pagePath: '/plan' });

    return res.status(200).json({ item: mapPlanItem(data as PlanItemRow) });
  } catch (error) {
    console.error('[plan/checkin] unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
