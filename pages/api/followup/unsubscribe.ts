// pages/api/followup/unsubscribe.ts — One-click unsubscribe (no auth required)
import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';
import { getSupabaseAdmin } from '../../../lib/supabase';

function verifyToken(uid: string, token: string): boolean {
  const secret = process.env.FOLLOWUP_UNSUBSCRIBE_SECRET;
  if (!secret) return false;
  const expected = createHash('sha256').update(uid + secret).digest('hex');
  return expected === token;
}

function renderConfirmationPage(uid: string, token: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribe — Qimi AI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 40px auto; padding: 20px; text-align: center; color: #333; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #666; line-height: 1.6; }
    button { background: #00D4AA; color: white; border: none; padding: 12px 32px; border-radius: 8px; font-size: 1rem; cursor: pointer; margin-top: 16px; }
    button:hover { background: #00b894; }
    .disclaimer { font-size: 0.75rem; color: #999; margin-top: 32px; }
  </style>
</head>
<body>
  <h1>Unsubscribe from Follow-Up Reminders</h1>
  <p>Click the button below to stop receiving follow-up reminder emails from Qimi AI.</p>
  <form method="POST" action="/api/followup/unsubscribe">
    <input type="hidden" name="uid" value="${uid}" />
    <input type="hidden" name="token" value="${token}" />
    <button type="submit">Confirm Unsubscribe</button>
  </form>
  <p class="disclaimer">Qimi AI — Not a substitute for professional medical advice.</p>
</body>
</html>`;
}

function renderSuccessPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed — Qimi AI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 40px auto; padding: 20px; text-align: center; color: #333; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #666; line-height: 1.6; }
    .disclaimer { font-size: 0.75rem; color: #999; margin-top: 32px; }
  </style>
</head>
<body>
  <h1>You have been unsubscribed</h1>
  <p>You will no longer receive follow-up reminder emails from Qimi AI.</p>
  <p class="disclaimer">Qimi AI — Not a substitute for professional medical advice.</p>
</body>
</html>`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // Render confirmation page
    const uid = req.query.uid as string;
    const token = req.query.token as string;

    if (!uid || !token) {
      return res.status(400).json({ error: 'Missing uid or token' });
    }

    if (!verifyToken(uid, token)) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(renderConfirmationPage(uid, token));
  }

  if (req.method === 'POST') {
    // Process unsubscribe
    const uid = req.body.uid as string;
    const token = req.body.token as string;

    if (!uid || !token) {
      return res.status(400).json({ error: 'Missing uid or token' });
    }

    if (!verifyToken(uid, token)) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const supabase = getSupabaseAdmin();

    try {
      // Verify user exists
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', uid)
        .single();

      if (userError || !user) {
        return res.status(400).json({ error: 'Invalid or expired token' });
      }

      // Upsert followup_preferences: set enabled = false
      const { error: prefError } = await supabase
        .from('followup_preferences')
        .upsert(
          { user_id: uid, enabled: false },
          { onConflict: 'user_id' }
        );

      if (prefError) {
        console.error('[followup/unsubscribe] Preferences upsert error:', prefError);
        return res.status(500).json({ error: 'Failed to update preferences' });
      }

      // Dismiss any active follow-ups
      const { error: dismissError } = await supabase
        .from('followup_items')
        .update({ status: 'dismissed' })
        .eq('user_id', uid)
        .in('status', ['pending', 'scheduled']);

      if (dismissError) {
        console.error('[followup/unsubscribe] Dismiss error:', dismissError);
        // Non-critical — continue
      }

      // Return HTML success page for form submissions, JSON for API calls
      const acceptsHtml = req.headers.accept?.includes('text/html') ||
        req.headers['content-type']?.includes('application/x-www-form-urlencoded');

      if (acceptsHtml) {
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(renderSuccessPage());
      }

      return res.status(200).json({ message: 'You have been unsubscribed from follow-up reminders.' });
    } catch (error) {
      console.error('[followup/unsubscribe] API error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
