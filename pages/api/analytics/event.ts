import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import {
  hasForbiddenAnalyticsProperty,
  isAnalyticsEventName,
  sanitizeAnalyticsProperties,
} from '@/lib/analytics-events';
import { getAnalyticsUserIdByEmail, trackServerEvent } from '@/lib/analytics';

const MAX_PAYLOAD_BYTES = 8 * 1024;
const WINDOW_MS = 60 * 1000;
const MAX_EVENTS_PER_WINDOW = 120;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientKey(req: NextApiRequest) {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0];
  return ip || req.socket.remoteAddress || 'unknown';
}

function isRateLimited(req: NextApiRequest) {
  const key = getClientKey(req);
  const now = Date.now();
  const existing = rateBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  existing.count += 1;
  return existing.count > MAX_EVENTS_PER_WINDOW;
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 200) : undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payloadSize = Buffer.byteLength(JSON.stringify(req.body || {}), 'utf8');
  if (payloadSize > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({ error: 'Payload too large' });
  }

  if (isRateLimited(req)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { eventName, properties } = req.body || {};
  if (!isAnalyticsEventName(eventName)) {
    return res.status(400).json({ error: 'Invalid event name' });
  }

  if (hasForbiddenAnalyticsProperty(properties)) {
    return res.status(400).json({ error: 'Invalid event properties' });
  }

  const session = await getServerSession(req, res, authOptions);
  const userId = await getAnalyticsUserIdByEmail(session?.user?.email);
  const sanitizedProperties = sanitizeAnalyticsProperties(eventName, properties);

  await trackServerEvent(req, eventName, sanitizedProperties, {
    userId,
    anonymousId: getString(req.body?.anonymousId),
    sessionId: getString(req.body?.sessionId),
    pagePath: getString(req.body?.pagePath) || '/',
    referrerHost: getString(req.body?.referrerHost) || null,
    deviceType: getString(req.body?.deviceType) || null,
    utmSource: getString(req.body?.utmSource) || null,
    utmMedium: getString(req.body?.utmMedium) || null,
    utmCampaign: getString(req.body?.utmCampaign) || null,
  });

  return res.status(200).json({ success: true });
}
