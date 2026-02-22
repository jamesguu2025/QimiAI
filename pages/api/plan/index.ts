// pages/api/plan/index.ts - CRUD for plan items

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';

const VALID_CATEGORIES = ['emotion', 'learning', 'exercise', 'nutrition', 'social', 'sleep', 'school'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapItem(row: Record<string, unknown>) {
  return {
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
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabaseAdmin();
  const userEmail = session.user.email;

  try {
    // Get-or-create user
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userError && userError.code === 'PGRST116') {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: userEmail,
          name: session.user.name || null,
          avatar_url: session.user.image || null,
          provider: 'google',
        })
        .select('id')
        .single();

      if (createError) {
        console.error('[plan] create user error:', createError);
        return res.status(500).json({ error: 'Internal server error' });
      }
      user = newUser;
    } else if (userError) {
      console.error('[plan] user lookup error:', userError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    const userId = user!.id;

    // GET - List items
    if (req.method === 'GET') {
      const { category } = req.query;

      let query = supabase
        .from('plan_items')
        .select('*')
        .eq('user_id', userId)
        .order('star', { ascending: false })
        .order('created_at', { ascending: false });

      if (category) {
        const cat = Array.isArray(category) ? category[0] : category;
        if (!VALID_CATEGORIES.includes(cat as string)) {
          return res.status(400).json({ error: 'Invalid category' });
        }
        query = query.eq('category', cat as string);
      }

      const { data: rows, error } = await query;
      if (error) {
        console.error('[plan] list error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

      const items = (rows || []).map(mapItem);
      return res.status(200).json({
        items,
        totalItems: items.length,
        starredCount: items.filter((i) => i.star).length,
      });
    }

    // POST - Create item
    if (req.method === 'POST') {
      const { category, painPoint, strategy } = req.body;

      if (!category || !VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: 'Invalid or missing category' });
      }
      if (!painPoint || typeof painPoint !== 'string' || !painPoint.trim()) {
        return res.status(400).json({ error: 'Pain point is required' });
      }
      if (!strategy || typeof strategy !== 'string' || !strategy.trim()) {
        return res.status(400).json({ error: 'Strategy is required' });
      }

      // Free-user quota check: max 5 items
      // [NEEDS_QUOTA_CHECK] - subscription_tier column may not exist yet
      const { count } = await supabase
        .from('plan_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if ((count || 0) >= 5) {
        // Assume free tier for now; pro check will be added when subscription system exists
        return res.status(403).json({
          error: 'Free plan limit reached. Upgrade to Pro for unlimited items.',
        });
      }

      const { data: row, error } = await supabase
        .from('plan_items')
        .insert({
          user_id: userId,
          category,
          pain_point: painPoint.trim(),
          strategy: strategy.trim(),
        })
        .select('*')
        .single();

      if (error) {
        console.error('[plan] create error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

      return res.status(201).json({ item: mapItem(row) });
    }

    // PUT - Update item
    if (req.method === 'PUT') {
      const id = req.query.id as string;
      if (!id) {
        return res.status(400).json({ error: 'Missing id' });
      }
      if (!UUID_REGEX.test(id)) {
        return res.status(400).json({ error: 'Invalid id format' });
      }

      const { painPoint, strategy, category, star, checkInDays } = req.body;

      if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }
      if (painPoint !== undefined && (typeof painPoint !== 'string' || !painPoint.trim())) {
        return res.status(400).json({ error: 'Pain point must be a non-empty string' });
      }
      if (strategy !== undefined && (typeof strategy !== 'string' || !strategy.trim())) {
        return res.status(400).json({ error: 'Strategy must be a non-empty string' });
      }

      const updateObj: Record<string, unknown> = {};
      if (painPoint !== undefined) updateObj.pain_point = (painPoint as string).trim();
      if (strategy !== undefined) updateObj.strategy = (strategy as string).trim();
      if (category !== undefined) updateObj.category = category;
      if (star !== undefined) updateObj.star = Boolean(star);
      if (checkInDays !== undefined) updateObj.check_in_days = checkInDays;

      if (Object.keys(updateObj).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      const { data: row, error } = await supabase
        .from('plan_items')
        .update(updateObj)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error && error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Not found' });
      }
      if (error) {
        console.error('[plan] update error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

      return res.status(200).json({ item: mapItem(row) });
    }

    // DELETE - Remove item
    if (req.method === 'DELETE') {
      const id = req.query.id as string;
      if (!id) {
        return res.status(400).json({ error: 'Missing id' });
      }
      if (!UUID_REGEX.test(id)) {
        return res.status(400).json({ error: 'Invalid id format' });
      }

      const { error } = await supabase
        .from('plan_items')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('[plan] delete error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

      return res.status(204).end();
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (error) {
    console.error('[plan] API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
