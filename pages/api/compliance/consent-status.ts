import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const email = session.user.email.toLowerCase().trim();

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.status(200).json({ hasConsent: false });
    }

    const { data: consent, error: consentError } = await supabase
      .from('parental_consents')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (consentError || !consent) {
      return res.status(200).json({ hasConsent: false });
    }

    return res.status(200).json({ hasConsent: true });
  } catch (error) {
    console.error('[consent-status] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
