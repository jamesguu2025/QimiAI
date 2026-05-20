import type { NextApiRequest, NextApiResponse } from 'next';

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  namespace: string;
  key?: string | null;
  limit: number;
  windowMs: number;
};

const buckets = new Map<string, Bucket>();

export function getClientIp(req: NextApiRequest) {
  const forwardedFor = req.headers['x-forwarded-for'];
  const firstForwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0];
  return firstForwarded?.trim() || req.socket.remoteAddress || 'unknown';
}

export function getPayloadSizeBytes(req: NextApiRequest) {
  return Buffer.byteLength(JSON.stringify(req.body || {}), 'utf8');
}

export function checkRateLimit({ namespace, key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  const bucketKey = `${namespace}:${key || 'unknown'}`;
  const existing = buckets.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: Math.max(0, limit - 1), retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      limited: true,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  return {
    limited: false,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: 0,
  };
}

export function rejectIfRateLimited(
  req: NextApiRequest,
  res: NextApiResponse,
  options: Omit<RateLimitOptions, 'key'> & { key?: string | null }
) {
  const result = checkRateLimit({
    ...options,
    key: options.key || getClientIp(req),
  });

  if (!result.limited) return false;

  res.setHeader('Retry-After', String(result.retryAfterSeconds));
  res.status(429).json({ error: 'Too many requests' });
  return true;
}
