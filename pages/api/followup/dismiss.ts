// pages/api/followup/dismiss.ts — Dismiss follow-up
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.body;
  if (!id) {
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

    // Update status to dismissed
    const { data: followup, error } = await supabase
      .from('followup_items')
      .update({ status: 'dismissed' })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
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
        createdAt: followup.created_at,
      },
    });
  } catch (error) {
    console.error('[followup/dismiss] API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
