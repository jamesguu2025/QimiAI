import type { AnalyticsEventName, AnalyticsProperties } from '@/lib/analytics-events';

let sessionId: string | null = null;
let anonymousId: string | null = null;

function getRandomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getSessionId() {
  if (!sessionId) sessionId = getRandomId();
  return sessionId;
}

function getAnonymousId() {
  if (!anonymousId) anonymousId = getRandomId();
  return anonymousId;
}

function getDeviceType() {
  if (typeof window === 'undefined') return 'unknown';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function getUtmValue(key: string) {
  if (typeof window === 'undefined') return undefined;
  const value = new URLSearchParams(window.location.search).get(key);
  return value || undefined;
}

function getReferrerHost() {
  if (typeof document === 'undefined' || !document.referrer) return undefined;
  try {
    return new URL(document.referrer).host;
  } catch {
    return undefined;
  }
}

export function trackClientEvent(
  eventName: AnalyticsEventName,
  properties: AnalyticsProperties = {},
  options: { keepalive?: boolean } = {}
) {
  if (typeof window === 'undefined') return;

  const payload = {
    eventName,
    sessionId: getSessionId(),
    anonymousId: getAnonymousId(),
    pagePath: window.location.pathname,
    referrerHost: getReferrerHost(),
    utmSource: getUtmValue('utm_source'),
    utmMedium: getUtmValue('utm_medium'),
    utmCampaign: getUtmValue('utm_campaign'),
    deviceType: getDeviceType(),
    properties,
  };

  fetch('/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: options.keepalive === true,
  }).catch(() => {});
}
