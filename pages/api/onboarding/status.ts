import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .maybeSingle();

    if (userError) {
      console.error('[onboarding-status] User lookup failed:', userError);
      return res.status(500).json({ error: 'Unable to check onboarding status' });
    }

    if (!user) {
      return res.status(200).json({ completed: false, profile: null });
    }

    const { data: profile, error: profileError } = await supabase
      .from('child_profiles')
      .select('name, birth_year, birth_month, gender, challenges, onboarding_completed_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[onboarding-status] Profile lookup failed:', profileError);
      return res.status(500).json({ error: 'Unable to check onboarding status' });
    }

    return res.status(200).json({
      completed: Boolean(profile?.onboarding_completed_at),
      profile: profile ? {
        childName: profile.name || '',
        childBirthday: {
          year: profile.birth_year || undefined,
          month: profile.birth_month || undefined,
        },
        gender: profile.gender || undefined,
        challenges: Array.isArray(profile.challenges) ? profile.challenges : [],
      } : null,
    });
  } catch (error) {
    console.error('[onboarding-status] Unexpected error:', error);
    return res.status(500).json({ error: 'Unable to check onboarding status' });
  }
}
