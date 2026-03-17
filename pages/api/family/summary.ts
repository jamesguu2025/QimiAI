// pages/api/family/summary.ts - Family Summary API for Dashboard Card
// Returns compact summary: child name, age text, challenge count, completion %
// Updated: 2026-03-17 - Adapted for JSONB challenges

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';

// SelectedChallenge interface - matches ChallengeSelector
interface SelectedChallenge {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
}

interface FamilySummary {
  childName: string | null;
  ageText: string | null;
  challengeCount: number;
  completionPercent: number;
}

interface ApiResponse {
  success: boolean;
  summary?: FamilySummary | null;
  error?: string;
}

function computeAge(birthYear: number, birthMonth: number): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let years = currentYear - birthYear;
  let months = currentMonth - birthMonth;

  if (months < 0) {
    years--;
    months += 12;
  }

  if (years === 0) {
    return `${months} mo${months !== 1 ? 's' : ''}`;
  } else if (months === 0) {
    return `${years} yr${years !== 1 ? 's' : ''}`;
  }
  return `${years} yr${years !== 1 ? 's' : ''} ${months} mo${months !== 1 ? 's' : ''}`;
}

function computeCompletion(profile: { name: string | null; birth_year: number | null; birth_month: number | null; challenges: SelectedChallenge[] } | null): number {
  if (!profile) return 0;

  let score = 0;

  // Check name
  if (profile.name) {
    score++;
  }

  // Check birth date
  if (profile.birth_year && profile.birth_month) {
    score++;
  }

  // Check challenges
  if (profile.challenges && profile.challenges.length > 0) {
    score++;
  }

  // 3 criteria, each 33%
  return Math.round((score / 3) * 100);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const supabase = getSupabaseAdmin();
  const userEmail = session.user.email;

  try {
    // Get user ID from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('[family/summary] User lookup error:', userError);
      return res.status(500).json({ success: false, error: 'Database error' });
    }

    if (!user) {
      return res.status(200).json({ success: true, summary: null });
    }

    const userId = user.id;

    // Get child profile
    const { data: childProfile, error } = await supabase
      .from('child_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[family/summary] Failed to fetch child profile:', error);
      return res.status(500).json({ success: false, error: 'Database error' });
    }

    if (!childProfile) {
      return res.status(200).json({ success: true, summary: null });
    }

    // Compute age text
    let ageText: string | null = null;
    if (childProfile.birth_year && childProfile.birth_month) {
      ageText = computeAge(childProfile.birth_year, childProfile.birth_month);
    }

    // Compute completion percentage
    const completionPercent = computeCompletion(childProfile);

    const summary: FamilySummary = {
      childName: childProfile.name || null,
      ageText,
      challengeCount: childProfile.challenges?.length || 0,
      completionPercent,
    };

    return res.status(200).json({ success: true, summary });
  } catch (error) {
    console.error('[family/summary] Unexpected error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
