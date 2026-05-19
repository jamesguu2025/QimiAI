import type { NextApiRequest } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  AnalyticsEventName,
  AnalyticsProperties,
  sanitizeAnalyticsProperties,
} from '@/lib/analytics-events';

type TrackServerEventOptions = {
  userId?: string | null;
  sessionId?: string | null;
  anonymousId?: string | null;
  pagePath?: string;
  referrerHost?: string | null;
  deviceType?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
};

type AnalyticsInsert = {
  event_name: string;
  event_version: number;
  user_id: string | null;
  anonymous_id: string | null;
  session_id: string | null;
  page_path: string;
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device_type: string | null;
  environment: string;
  is_internal: boolean;
  properties: AnalyticsProperties;
};

const INTERNAL_EMAIL_DOMAINS = (process.env.ANALYTICS_INTERNAL_EMAIL_DOMAINS || '')
  .split(',')
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

function getEnvironment() {
  return process.env.VERCEL_ENV || process.env.NODE_ENV || 'local';
}

function getHeaderValue(req: NextApiRequest, name: string) {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function normalizePath(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return '/';

  try {
    const url = value.startsWith('http') ? new URL(value) : new URL(value, 'http://qimi.local');
    return url.pathname || '/';
  } catch {
    return value.split('?')[0].slice(0, 200) || '/';
  }
}

function getRequestPath(req: NextApiRequest) {
  const referer = getHeaderValue(req, 'referer');
  if (referer) return normalizePath(referer);
  return normalizePath(req.url || '/');
}

function isInternalRequest(req: NextApiRequest, userEmail?: string | null) {
  const host = getHeaderValue(req, 'host') || '';
  const env = getEnvironment();
  const emailDomain = userEmail?.split('@')[1]?.toLowerCase();

  return (
    env !== 'production' ||
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1') ||
    Boolean(emailDomain && INTERNAL_EMAIL_DOMAINS.includes(emailDomain))
  );
}

export async function getAnalyticsUserIdByEmail(email?: string | null) {
  if (!email) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('[analytics] user lookup failed:', error);
    return null;
  }

  return data?.id || null;
}

export async function trackServerEvent(
  req: NextApiRequest,
  eventName: AnalyticsEventName,
  properties: AnalyticsProperties = {},
  options: TrackServerEventOptions = {}
) {
  try {
    const supabase = getSupabaseAdmin();
    const sanitizedProperties = sanitizeAnalyticsProperties(eventName, properties);
    const row: AnalyticsInsert = {
      event_name: eventName,
      event_version: 1,
      user_id: options.userId || null,
      anonymous_id: options.anonymousId || null,
      session_id: options.sessionId || null,
      page_path: normalizePath(options.pagePath || getRequestPath(req)),
      referrer_host: options.referrerHost || null,
      utm_source: options.utmSource || null,
      utm_medium: options.utmMedium || null,
      utm_campaign: options.utmCampaign || null,
      device_type: options.deviceType || null,
      environment: getEnvironment(),
      is_internal: isInternalRequest(req),
      properties: sanitizedProperties,
    };

    const { error } = await supabase.from('analytics_events').insert(row);
    if (error) {
      console.error('[analytics] insert failed:', error);
    }
  } catch (error) {
    console.error('[analytics] unexpected failure:', error);
  }
}
