// pages/api/followup/pending.ts — Get active follow-up for current user
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabaseAdmin();

  try {
    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      return res.status(200).json({ followup: null });
    }

    // Query active follow-up (pending or scheduled, within last 7 days)
    const { data: followup, error } = await supabase
      .from('followup_items')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'scheduled'])
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[followup/pending] Query error:', error);
      return res.status(500).json({ error: 'Failed to fetch follow-up' });
    }

    if (!followup) {
      return res.status(200).json({ followup: null });
    }

    return res.status(200).json({
      followup: {
        id: followup.id,
        status: followup.status,
        parentProblem: followup.parent_problem,
        suggestedMethod: followup.suggested_method,
        methodShortName: followup.method_short_name,
        followUpQuestion: followup.follow_up_question,
        sourceConversationId: followup.source_conversation_id,
        scheduledAt: followup.scheduled_at,
        createdAt: followup.created_at,
      },
    });
  } catch (error) {
    console.error('[followup/pending] API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
