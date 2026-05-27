import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asUuidOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  return typeof value === 'string' && UUID_REGEX.test(value) ? value : null;
}

async function getUserId(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return { error: 'Unauthorized' as const, status: 401 as const };
  }

  const supabase = getSupabaseAdmin();
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .single();

  if (error || !user) {
    console.error('[plan/saved-status] user lookup error:', error);
    return { error: 'Internal server error' as const, status: 500 as const };
  }

  return { supabase, userId: user.id };
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
  const sourceMessageId = asUuidOrNull(req.body?.sourceMessageId);
  const sourceConversationId = asUuidOrNull(req.body?.sourceConversationId || req.body?.conversationId);

  if (!sourceMessageId && !sourceConversationId) {
    return res.status(200).json({ saved: false, itemId: null });
  }

  try {
    let query = supabase
      .from('plan_items')
      .select('id')
      .eq('user_id', userId)
      .eq('source_type', 'chat');

    if (sourceMessageId) {
      query = query.eq('source_message_id', sourceMessageId);
    } else {
      query = query.eq('source_conversation_id', sourceConversationId);
    }

    const { data, error } = await query.limit(1).maybeSingle();
    if (error) {
      console.error('[plan/saved-status] lookup error:', error);
      return res.status(500).json({ error: 'Failed to check saved status' });
    }

    return res.status(200).json({ saved: Boolean(data?.id), itemId: data?.id || null });
  } catch (error) {
    console.error('[plan/saved-status] unexpected error:', error);
    return res.status(500).json({ error: 'Failed to check saved status' });
  }
}
