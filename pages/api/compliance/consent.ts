import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  PARENTAL_CONSENT_METHOD,
  PARENTAL_CONSENT_TEXT,
  PARENTAL_CONSENT_VERSION,
} from '@/lib/compliance/consent';
import { getPayloadSizeBytes, rejectIfRateLimited } from '@/lib/rate-limit';

function getClientIp(req: NextApiRequest): string | null {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (Array.isArray(forwardedFor)) return forwardedFor[0] || null;
  if (typeof forwardedFor === 'string') return forwardedFor.split(',')[0]?.trim() || null;
  return req.socket.remoteAddress || null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (getPayloadSizeBytes(req) > 4 * 1024) {
    return res.status(413).json({ error: 'Payload too large' });
  }

  if (rejectIfRateLimited(req, res, {
    namespace: 'consent',
    key: session.user.email,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  })) return;

  const consentText = typeof req.body?.consentText === 'string'
    ? req.body.consentText.trim()
    : '';

  if (!consentText || consentText !== PARENTAL_CONSENT_TEXT) {
    return res.status(400).json({ error: 'Invalid consent text' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const email = session.user.email.toLowerCase().trim();

    let { data: user, error: lookupError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (lookupError || !user) {
      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert({
          email,
          name: session.user.name || null,
          avatar_url: session.user.image || null,
          provider: 'oauth',
        })
        .select('id')
        .single();

      if (createError || !createdUser) {
        console.error('[consent] User create error:', createError || lookupError);
        return res.status(500).json({ error: 'Failed to prepare user account' });
      }

      user = createdUser;
    }

    const { error: upsertError } = await supabase
      .from('parental_consents')
      .upsert({
        user_id: user.id,
        consent_text: consentText,
        consent_method: PARENTAL_CONSENT_METHOD,
        consent_version: PARENTAL_CONSENT_VERSION,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'] || null,
        consented_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      console.error('[consent] Consent upsert error:', upsertError);
      return res.status(500).json({ error: 'Failed to record consent' });
    }

    return res.status(200).json({ message: 'Consent recorded' });
  } catch (error) {
    console.error('[consent] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
