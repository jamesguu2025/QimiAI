// pages/api/followup/[id].ts — Get specific follow-up by ID
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

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing follow-up ID' });
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
      return res.status(404).json({ error: 'Follow-up not found' });
    }

    // Fetch follow-up by ID, verify ownership
    const { data: followup, error } = await supabase
      .from('followup_items')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !followup) {
      return res.status(404).json({ error: 'Follow-up not found' });
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
        createdAt: followup.created_at,
      },
    });
  } catch (error) {
    console.error('[followup/[id]] API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
