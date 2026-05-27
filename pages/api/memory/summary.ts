// pages/api/memory/summary.ts
// GET: Return current profile summary
// PUT: Update user-editable summary (max 200 chars)

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabaseAdmin();

  // Get user ID
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .single();

  if (userError || !user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('profile_summaries')
      .select('summary, source, updated_at')
      .eq('user_id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // No summary yet
      return res.status(200).json({
        summary: { text: '', source: 'system', updatedAt: null },
      });
    }

    if (error) {
      console.error('[memory/summary] GET error:', error);
      return res.status(500).json({ error: 'Failed to fetch summary' });
    }

    return res.status(200).json({
      summary: {
        text: data.summary,
        source: data.source,
        updatedAt: data.updated_at,
      },
    });
  }

  if (req.method === 'PUT') {
    const { summary } = req.body;

    if (typeof summary !== 'string') {
      return res.status(400).json({ error: 'summary must be a string' });
    }

    const trimmed = summary.trim();
    if (trimmed.length > 200) {
      return res.status(400).json({ error: 'Summary must be 200 characters or less' });
    }

    const { data, error } = await supabase
      .from('profile_summaries')
      .upsert(
        {
          user_id: user.id,
          summary: trimmed,
          source: 'user',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select('summary, source, updated_at')
      .single();

    if (error) {
      console.error('[memory/summary] PUT error:', error);
      return res.status(500).json({ error: 'Failed to save summary' });
    }

    return res.status(200).json({
      summary: {
        text: data.summary,
        source: data.source,
        updatedAt: data.updated_at,
      },
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
