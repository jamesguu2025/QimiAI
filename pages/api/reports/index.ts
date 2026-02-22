// pages/api/reports/index.ts - GET list reports

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
    // Get-or-create user
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
        console.error('[reports] create user error:', createError);
        return res.status(500).json({ error: 'Internal server error' });
      }
      user = newUser;
    } else if (userError) {
      console.error('[reports] user lookup error:', userError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    const { data: reports, error } = await supabase
      .from('reports')
      .select('id, title, status, created_at')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[reports] list error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    return res.status(200).json({
      reports: (reports || []).map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    console.error('[reports] API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
