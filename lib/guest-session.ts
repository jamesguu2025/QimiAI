import { randomUUID } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

export const GUEST_SESSION_COOKIE = 'qimi_guest_session';

function cookieAttributes() {
  const attributes = ['Path=/', 'Max-Age=31536000', 'HttpOnly', 'SameSite=Lax'];
  if (process.env.NODE_ENV === 'production') attributes.push('Secure');
  return attributes.join('; ');
}

function appendSetCookie(res: NextApiResponse, cookie: string) {
  const current = res.getHeader('Set-Cookie');
  if (!current) return res.setHeader('Set-Cookie', cookie);
  res.setHeader('Set-Cookie', Array.isArray(current) ? [...current, cookie] : [String(current), cookie]);
}

export function ensureGuestSession(req: NextApiRequest, res: NextApiResponse) {
  const existing = req.cookies[GUEST_SESSION_COOKIE];
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
  const sessionId = randomUUID();
  appendSetCookie(res, `${GUEST_SESSION_COOKIE}=${sessionId}; ${cookieAttributes()}`);
  return sessionId;
}
