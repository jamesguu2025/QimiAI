import assert from 'node:assert/strict';
import { checkRateLimit, resetRateLimit } from '../lib/rate-limit.ts';

const baseUrl = process.env.SECURITY_TEST_BASE_URL || 'http://127.0.0.1:4000';

async function request(path, options) {
  return fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
    ...options,
  });
}

async function expectStatus(path, expected, options) {
  const response = await request(path, options);
  assert.equal(response.status, expected, `${path}: expected ${expected}, received ${response.status}`);
  return response;
}

const pageResponse = await expectStatus('/', 200);
assert.equal(pageResponse.headers.get('x-frame-options'), 'DENY');
assert.equal(pageResponse.headers.get('x-content-type-options'), 'nosniff');
assert.match(pageResponse.headers.get('content-security-policy') || '', /frame-ancestors 'none'/);
assert.match(pageResponse.headers.get('permissions-policy') || '', /camera=\(\)/);

for (const path of [
  '/api/composed-plans',
  '/api/plan',
  '/api/compliance/consent-status',
]) {
  const response = await expectStatus(path, 401);
  assert.match(response.headers.get('cache-control') || '', /no-store/);
}

await expectStatus('/api/composed-plans', 401, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ title: 'unauthorized' }),
});

await expectStatus('/api/auth/signup', 413, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'security@example.com', password: 'x'.repeat(5_000) }),
});

await expectStatus('/api/subscribe', 400, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'not-an-email' }),
});

const rateKey = `security-test-${Date.now()}`;
assert.equal(checkRateLimit({ namespace: 'self-test', key: rateKey, limit: 1, windowMs: 1_000 }).limited, false);
assert.equal(checkRateLimit({ namespace: 'self-test', key: rateKey, limit: 1, windowMs: 1_000 }).limited, true);
resetRateLimit('self-test', rateKey);
assert.equal(checkRateLimit({ namespace: 'self-test', key: rateKey, limit: 1, windowMs: 1_000 }).limited, false);
resetRateLimit('self-test', rateKey);

console.log('MVP security smoke checks passed.');
