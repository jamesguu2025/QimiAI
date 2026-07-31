import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '@/lib/supabase';

interface ChallengeInput {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
}

function normalizeChallenges(value: unknown): ChallengeInput[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 30) return null;

  const normalized: ChallengeInput[] = [];
  const ids = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const candidate = item as Record<string, unknown>;
    const id = typeof candidate.id === 'string' ? candidate.id.trim().slice(0, 80) : '';
    const name = typeof candidate.name === 'string' ? candidate.name.trim().slice(0, 120) : '';
    const categoryId = typeof candidate.categoryId === 'string' ? candidate.categoryId.trim().slice(0, 80) : '';
    const categoryName = typeof candidate.categoryName === 'string' ? candidate.categoryName.trim().slice(0, 120) : '';

    if (!id || !name || !categoryId || !categoryName) return null;
    if (ids.has(id)) continue;
    ids.add(id);
    normalized.push({ id, name, categoryId, categoryName });
  }

  return normalized.length > 0 ? normalized : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const childName = typeof req.body?.childName === 'string'
    ? req.body.childName.trim().slice(0, 50)
    : '';
  const birthYear = Number(req.body?.childBirthday?.year);
  const birthMonth = Number(req.body?.childBirthday?.month);
  const gender = req.body?.gender;
  const challenges = normalizeChallenges(req.body?.challenges);
  const currentYear = new Date().getFullYear();

  if (!childName) return res.status(400).json({ error: 'A name or nickname is required' });
  if (!Number.isInteger(birthYear) || birthYear < currentYear - 18 || birthYear > currentYear) {
    return res.status(400).json({ error: 'Enter a valid birth year' });
  }
  if (!Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12) {
    return res.status(400).json({ error: 'Enter a valid birth month' });
  }
  if (!['boy', 'girl', 'other'].includes(gender)) {
    return res.status(400).json({ error: 'Select a valid gender option' });
  }
  if (!challenges) {
    return res.status(400).json({ error: 'Select at least one challenge' });
  }

  try {
    const supabase = getSupabaseAdmin();
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .maybeSingle();

    if (userError) {
      console.error('[onboarding-complete] User lookup failed:', userError);
      return res.status(500).json({ error: 'Unable to save onboarding' });
    }

    if (!user) {
      return res.status(403).json({ error: 'Consent is required before onboarding' });
    }

    const { data: consent, error: consentError } = await supabase
      .from('parental_consents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (consentError) {
      console.error('[onboarding-complete] Consent lookup failed:', consentError);
      return res.status(500).json({ error: 'Unable to verify consent' });
    }
    if (!consent) {
      return res.status(403).json({ error: 'Consent is required before onboarding' });
    }

    const completedAt = new Date().toISOString();
    const { error: profileError } = await supabase
      .from('child_profiles')
      .upsert({
        user_id: user.id,
        name: childName,
        birth_year: birthYear,
        birth_month: birthMonth,
        gender,
        challenges,
        onboarding_completed_at: completedAt,
        updated_at: completedAt,
      }, { onConflict: 'user_id' });

    if (profileError) {
      console.error('[onboarding-complete] Profile upsert failed:', profileError);
      return res.status(500).json({ error: 'Unable to save onboarding' });
    }

    return res.status(200).json({ success: true, completedAt });
  } catch (error) {
    console.error('[onboarding-complete] Unexpected error:', error);
    return res.status(500).json({ error: 'Unable to save onboarding' });
  }
}
