// pages/api/memory/facts.ts
// GET: Return all active memory items for Family Profile display

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabaseAdmin();

  try {
    // Get user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      return res.status(200).json({ facts: [] });
    }

    // Load all active memory items, ordered by category then updated_at
    const { data: items, error: itemsError } = await supabase
      .from('memory_items')
      .select('id, category, fact_key, fact_value, confidence, updated_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('category', { ascending: true })
      .order('updated_at', { ascending: false });

    if (itemsError) {
      console.error('[memory/facts] Failed to load items:', itemsError);
      return res.status(500).json({ error: 'Failed to load facts' });
    }

    return res.status(200).json({
      facts: (items || []).map((item) => ({
        id: item.id,
        category: item.category,
        key: item.fact_key,
        value: item.fact_value,
        confidence: item.confidence,
        updatedAt: item.updated_at,
      })),
    });
  } catch (error) {
    console.error('[memory/facts] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
