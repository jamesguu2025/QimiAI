// pages/api/plan/checkin.ts - Check in on a plan item

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const id = req.query.id as string;
  if (!id) {
    return res.status(400).json({ error: 'Missing id' });
  }
  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Invalid id format' });
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
        console.error('[plan/checkin] create user error:', createError);
        return res.status(500).json({ error: 'Internal server error' });
      }
      user = newUser;
    } else if (userError) {
      console.error('[plan/checkin] user lookup error:', userError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    const { data: row, error } = await supabase
      .from('plan_items')
      .update({ last_check_in: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user!.id)
      .select('*')
      .single();

    if (error && error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Not found' });
    }
    if (error) {
      console.error('[plan/checkin] update error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    return res.status(200).json({
      item: {
        id: row.id,
        userId: row.user_id,
        category: row.category,
        painPoint: row.pain_point,
        strategy: row.strategy,
        star: row.star,
        checkInDays: row.check_in_days || [],
        lastCheckIn: row.last_check_in || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    console.error('[plan/checkin] API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
