// pages/api/settings/index.ts - Settings Profile API
// GET: Fetch user profile
// PUT: Update user profile (name only)
// Created: 2026-03-17 - Settings module MVP

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  provider: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GetResponse {
  profile: UserProfile;
}

interface PutResponse {
  profile: UserProfile;
}

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetResponse | PutResponse | ErrorResponse>
) {
  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized - Please sign in' });
  }

  const supabase = getSupabaseAdmin();
  const userEmail = session.user.email;

  try {
    // Get or create user (PGRST116 pattern)
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, avatar_url, provider, created_at, updated_at')
      .eq('email', userEmail)
      .single();

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create one
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: userEmail,
          name: session.user.name || null,
          avatar_url: session.user.image || null,
          provider: 'google',
        })
        .select('id, email, name, avatar_url, provider, created_at, updated_at')
        .single();

      if (createError) {
        console.error('[settings] Failed to create user:', createError);
        return res.status(500).json({ error: 'Failed to create user' });
      }
      user = newUser;
    } else if (userError) {
      console.error('[settings] User lookup error:', userError);
      return res.status(500).json({ error: 'Database error' });
    }

    // GET: Fetch user profile
    if (req.method === 'GET') {
      const profile: UserProfile = {
        id: user!.id,
        email: user!.email,
        name: user!.name,
        avatar: user!.avatar_url,
        provider: user!.provider,
        createdAt: user!.created_at,
        updatedAt: user!.updated_at,
      };

      return res.status(200).json({ profile });
    }

    // PUT: Update user profile (name only)
    if (req.method === 'PUT') {
      const { name } = req.body;

      // Validate name
      if (name === undefined || name === null) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const trimmedName = typeof name === 'string' ? name.trim() : '';
      if (trimmedName === '') {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }

      if (trimmedName.length > 100) {
        return res.status(400).json({ error: 'Name must be 100 characters or less' });
      }

      // Update user name
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          name: trimmedName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user!.id)
        .select('id, email, name, avatar_url, provider, created_at, updated_at')
        .single();

      if (updateError) {
        console.error('[settings] Failed to update user:', updateError);
        return res.status(500).json({ error: 'Failed to update profile' });
      }

      const profile: UserProfile = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatar: updatedUser.avatar_url,
        provider: updatedUser.provider,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at,
      };

      return res.status(200).json({ profile });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[settings] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
