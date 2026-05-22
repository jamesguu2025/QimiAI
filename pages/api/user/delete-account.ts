// pages/api/user/delete-account.ts
// Self-service account deletion
// Deletes user row; FK rules remove user content and child data while preserving
// de-identified analytics with user_id set to null.

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { confirmation } = req.body;
    if (confirmation !== 'DELETE') {
      return res.status(400).json({ error: 'Please type DELETE to confirm account deletion' });
    }

    const supabase = getSupabaseAdmin();

    // Look up user by email
    const { data: user, error: lookupError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (lookupError || !user) {
      console.error('[delete-account] User lookup error:', lookupError);
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user row. FK rules remove conversations, messages, child_profiles,
    // memory_items, profile_summaries, parental_consents, and plan_items.
    // analytics_events is retained with user_id set to null.
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id);

    if (deleteError) {
      console.error('[delete-account] Delete error:', deleteError);
      return res.status(500).json({ error: 'Failed to delete account' });
    }

    return res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('[delete-account] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
