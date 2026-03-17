// pages/api/family/index.ts - Family Profile API
// GET: Fetch child profile
// POST: Create or update child profile (upsert)
// Updated: 2026-03-17 - challenges uses JSONB SelectedChallenge[]

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';

// SelectedChallenge interface - must match GuestOnboarding
interface SelectedChallenge {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
}

// Extended ChildProfile with JSONB challenges
interface ChildProfileData {
  id?: string;
  userId?: string;
  name?: string;
  birthYear?: number;
  birthMonth?: number;
  gender?: 'boy' | 'girl' | 'other';
  challenges: SelectedChallenge[];
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse {
  success: boolean;
  childProfile?: ChildProfileData | null;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ success: false, error: 'Unauthorized - Please sign in' });
  }

  const supabase = getSupabaseAdmin();
  const userEmail = session.user.email;

  try {
    // Get or create user (PGRST116 pattern)
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
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
        .select('id')
        .single();

      if (createError) {
        console.error('[family] Failed to create user:', createError);
        return res.status(500).json({ success: false, error: 'Failed to create user' });
      }
      user = newUser;
    } else if (userError) {
      console.error('[family] User lookup error:', userError);
      return res.status(500).json({ success: false, error: 'Database error' });
    }

    const userId = user!.id;

    // GET: Fetch child profile
    if (req.method === 'GET') {
      const { data: childProfile, error } = await supabase
        .from('child_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[family] Failed to fetch child profile:', error);
        return res.status(500).json({ success: false, error: 'Failed to load profile' });
      }

      // Transform to frontend format (JSONB challenges)
      const formattedProfile: ChildProfileData | null = childProfile ? {
        id: childProfile.id,
        userId: childProfile.user_id,
        name: childProfile.name || undefined,
        birthYear: childProfile.birth_year,
        birthMonth: childProfile.birth_month,
        gender: childProfile.gender || undefined,
        challenges: childProfile.challenges || [],
        createdAt: childProfile.created_at,
        updatedAt: childProfile.updated_at,
      } : null;

      return res.status(200).json({ success: true, childProfile: formattedProfile });
    }

    // POST: Create or update child profile (upsert)
    // NOTE: challenges are NOT accepted in POST - they are read-only, set during onboarding only
    if (req.method === 'POST') {
      const { name, birthYear, birthMonth, gender } = req.body;

      // Validate fields
      if (birthYear !== undefined && (birthYear < 2000 || birthYear > 2030)) {
        return res.status(400).json({ success: false, error: 'birthYear must be between 2000 and 2030' });
      }
      if (birthMonth !== undefined && (birthMonth < 1 || birthMonth > 12)) {
        return res.status(400).json({ success: false, error: 'birthMonth must be between 1 and 12' });
      }
      if (gender !== undefined && !['boy', 'girl', 'other'].includes(gender)) {
        return res.status(400).json({ success: false, error: 'gender must be boy, girl, or other' });
      }

      // Check at least one field is provided
      if (name === undefined && birthYear === undefined && birthMonth === undefined &&
          gender === undefined) {
        return res.status(400).json({ success: false, error: 'At least one field is required' });
      }

      // Upsert child profile (challenges NOT included - read-only)
      const upsertData: Record<string, unknown> = {
        user_id: userId,
        updated_at: new Date().toISOString(),
      };
      if (name !== undefined) upsertData.name = name;
      if (birthYear !== undefined) upsertData.birth_year = birthYear;
      if (birthMonth !== undefined) upsertData.birth_month = birthMonth;
      if (gender !== undefined) upsertData.gender = gender;

      const { data: upsertedProfile, error: upsertError } = await supabase
        .from('child_profiles')
        .upsert(upsertData, { onConflict: 'user_id' })
        .select()
        .single();

      if (upsertError) {
        console.error('[family] Failed to upsert child profile:', upsertError);
        return res.status(500).json({ success: false, error: 'Failed to save profile' });
      }

      // Transform to frontend format
      const formattedProfile: ChildProfileData = {
        id: upsertedProfile.id,
        userId: upsertedProfile.user_id,
        name: upsertedProfile.name || undefined,
        birthYear: upsertedProfile.birth_year,
        birthMonth: upsertedProfile.birth_month,
        gender: upsertedProfile.gender || undefined,
        challenges: upsertedProfile.challenges || [],
        createdAt: upsertedProfile.created_at,
        updatedAt: upsertedProfile.updated_at,
      };

      return res.status(200).json({ success: true, childProfile: formattedProfile });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('[family] Unexpected error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
