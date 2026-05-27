// pages/api/memory/relevant.ts
// GET: Return ≤5 most relevant memory items + profile summary for prompt injection

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';

interface MemoryItem {
  id: string;
  category: string;
  fact_key: string;
  fact_value: string;
  confidence: number;
  updated_at: string;
  last_used_at: string | null;
}

function scoreItem(item: MemoryItem): number {
  const now = Date.now();

  // Recency score based on updated_at
  const updatedMs = new Date(item.updated_at).getTime();
  const daysSinceUpdate = (now - updatedMs) / (1000 * 60 * 60 * 24);
  let recencyScore: number;
  if (daysSinceUpdate <= 7) recencyScore = 1.0;
  else if (daysSinceUpdate <= 30) recencyScore = 0.5;
  else recencyScore = 0.2;

  // Usage score based on last_used_at
  let usageScore = 0;
  if (item.last_used_at) {
    const usedMs = new Date(item.last_used_at).getTime();
    const daysSinceUsed = (now - usedMs) / (1000 * 60 * 60 * 24);
    if (daysSinceUsed <= 3) usageScore = 1.0;
    else if (daysSinceUsed <= 14) usageScore = 0.5;
  }

  return item.confidence * 0.5 + recencyScore * 0.3 + usageScore * 0.2;
}

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
      return res.status(404).json({ error: 'User not found' });
    }

    // Load all active memory items
    const { data: allItems, error: itemsError } = await supabase
      .from('memory_items')
      .select('id, category, fact_key, fact_value, confidence, updated_at, last_used_at')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (itemsError) {
      console.error('[memory/relevant] Failed to load items:', itemsError);
      return res.status(500).json({ error: 'Failed to load memory items' });
    }

    const items: MemoryItem[] = allItems || [];
    let selected: MemoryItem[];

    if (items.length <= 5) {
      selected = items;
    } else {
      // Score and take top 5
      const scored = items.map((item) => ({ item, score: scoreItem(item) }));
      scored.sort((a, b) => b.score - a.score);
      selected = scored.slice(0, 5).map((s) => s.item);
    }

    // Update last_used_at for selected items
    if (selected.length > 0) {
      const ids = selected.map((s) => s.id);
      await supabase
        .from('memory_items')
        .update({ last_used_at: new Date().toISOString() })
        .in('id', ids);
    }

    // Get profile summary
    const { data: summaryData } = await supabase
      .from('profile_summaries')
      .select('summary')
      .eq('user_id', user.id)
      .single();

    return res.status(200).json({
      items: selected.map((s) => ({
        id: s.id,
        category: s.category,
        key: s.fact_key,
        value: s.fact_value,
        confidence: s.confidence,
      })),
      summary: summaryData?.summary || '',
    });
  } catch (error) {
    console.error('[memory/relevant] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
