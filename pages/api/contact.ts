import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { getAnalyticsUserIdByEmail, trackServerEvent } from '@/lib/analytics';
import { sendInternalEmail } from '@/lib/mailer';
import { getClientIp, getPayloadSizeBytes, rejectIfRateLimited } from '@/lib/rate-limit';

const CONTACT_TO = 'gu778@hotmail.com';
const MAX_PAYLOAD_BYTES = 8 * 1024;

function normalizeField(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (getPayloadSizeBytes(req) > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({ success: false, error: 'Payload too large' });
  }

  if (rejectIfRateLimited(req, res, {
    namespace: 'contact',
    key: getClientIp(req),
    limit: 5,
    windowMs: 60 * 1000,
  })) {
    return;
  }

  const title = normalizeField(req.body?.title, 160);
  const message = normalizeField(req.body?.message, 4000);
  const contact = normalizeField(req.body?.contact, 200);

  if (!title || !message || !contact) {
    return res.status(400).json({ success: false, error: 'All fields are required' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    const userId = await getAnalyticsUserIdByEmail(session?.user?.email);

    await sendInternalEmail({
      to: CONTACT_TO,
      subject: `[Qimi Contact] ${title}`,
      text: [
        `Title: ${title}`,
        `Contact: ${contact}`,
        `Signed-in email: ${session?.user?.email || 'No session'}`,
        '',
        message,
      ].join('\n'),
      html: [
        '<h2>Qimi Contact Form</h2>',
        `<p><strong>Title:</strong> ${escapeHtml(title)}</p>`,
        `<p><strong>Contact:</strong> ${escapeHtml(contact)}</p>`,
        `<p><strong>Signed-in email:</strong> ${escapeHtml(session?.user?.email || 'No session')}</p>`,
        `<p><strong>Message:</strong></p><pre>${escapeHtml(message)}</pre>`,
      ].join(''),
    });

    console.log('[contact] submitted', {
      titleLength: title.length,
      messageLength: message.length,
      contactLength: contact.length,
      hasSession: Boolean(session?.user?.email),
      timestamp: new Date().toISOString(),
    });

    await trackServerEvent(req, 'contact:form_submitted', {
      source: 'landing',
      has_session: Boolean(session?.user?.email),
    }, { userId, pagePath: '/contact' });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[contact] failed:', error instanceof Error ? error.message : error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
