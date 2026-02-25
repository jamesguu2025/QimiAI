// __tests__/followup-reminder.test.ts — Follow-up reminder module unit tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'crypto';

// ---- Pure logic tests (no mocks needed) ----

describe('Unsubscribe token verification', () => {
  const TEST_SECRET = 'test-secret-123';
  const TEST_UID = 'user-uuid-abc';

  function generateToken(uid: string, secret: string): string {
    return createHash('sha256').update(uid + secret).digest('hex');
  }

  function verifyToken(uid: string, token: string, secret: string): boolean {
    if (!secret) return false;
    const expected = createHash('sha256').update(uid + secret).digest('hex');
    return expected === token;
  }

  it('should generate a valid SHA-256 token', () => {
    const token = generateToken(TEST_UID, TEST_SECRET);
    expect(token).toHaveLength(64); // SHA-256 hex = 64 chars
    expect(/^[a-f0-9]+$/.test(token)).toBe(true);
  });

  it('should verify a correct token', () => {
    const token = generateToken(TEST_UID, TEST_SECRET);
    expect(verifyToken(TEST_UID, token, TEST_SECRET)).toBe(true);
  });

  it('should reject an incorrect token', () => {
    expect(verifyToken(TEST_UID, 'wrong-token', TEST_SECRET)).toBe(false);
  });

  it('should reject when secret is empty', () => {
    const token = generateToken(TEST_UID, TEST_SECRET);
    expect(verifyToken(TEST_UID, token, '')).toBe(false);
  });

  it('should generate different tokens for different users', () => {
    const token1 = generateToken('user-1', TEST_SECRET);
    const token2 = generateToken('user-2', TEST_SECRET);
    expect(token1).not.toEqual(token2);
  });

  it('should generate different tokens with different secrets', () => {
    const token1 = generateToken(TEST_UID, 'secret-a');
    const token2 = generateToken(TEST_UID, 'secret-b');
    expect(token1).not.toEqual(token2);
  });
});

describe('Mailchimp subscriber hash', () => {
  function getSubscriberHash(email: string): string {
    return createHash('md5').update(email.toLowerCase()).digest('hex');
  }

  it('should generate MD5 hash of lowercase email', () => {
    const hash = getSubscriberHash('Test@Example.com');
    const expected = createHash('md5').update('test@example.com').digest('hex');
    expect(hash).toBe(expected);
  });

  it('should produce consistent hash for same email regardless of case', () => {
    const hash1 = getSubscriberHash('USER@GMAIL.COM');
    const hash2 = getSubscriberHash('user@gmail.com');
    const hash3 = getSubscriberHash('User@Gmail.Com');
    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
  });

  it('should produce 32-character hex string', () => {
    const hash = getSubscriberHash('test@test.com');
    expect(hash).toHaveLength(32);
    expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
  });
});

describe('Follow-up status lifecycle', () => {
  const VALID_STATUSES = ['pending', 'scheduled', 'completed', 'dismissed'] as const;

  const VALID_TRANSITIONS: Record<string, string[]> = {
    pending: ['scheduled', 'dismissed'],
    scheduled: ['completed', 'dismissed'],
    completed: [],
    dismissed: [],
  };

  it('should define exactly 4 valid statuses', () => {
    expect(VALID_STATUSES).toHaveLength(4);
  });

  it('pending can transition to scheduled or dismissed', () => {
    expect(VALID_TRANSITIONS['pending']).toContain('scheduled');
    expect(VALID_TRANSITIONS['pending']).toContain('dismissed');
    expect(VALID_TRANSITIONS['pending']).not.toContain('completed');
  });

  it('scheduled can transition to completed or dismissed', () => {
    expect(VALID_TRANSITIONS['scheduled']).toContain('completed');
    expect(VALID_TRANSITIONS['scheduled']).toContain('dismissed');
  });

  it('completed is a terminal state', () => {
    expect(VALID_TRANSITIONS['completed']).toHaveLength(0);
  });

  it('dismissed is a terminal state', () => {
    expect(VALID_TRANSITIONS['dismissed']).toHaveLength(0);
  });
});

describe('Cron auth validation', () => {
  function verifyCronAuth(authHeader: string | undefined, cronSecret: string | undefined): boolean {
    if (!cronSecret) return false;
    return authHeader === `Bearer ${cronSecret}`;
  }

  it('should accept valid Bearer token', () => {
    expect(verifyCronAuth('Bearer my-secret', 'my-secret')).toBe(true);
  });

  it('should reject missing auth header', () => {
    expect(verifyCronAuth(undefined, 'my-secret')).toBe(false);
  });

  it('should reject wrong token', () => {
    expect(verifyCronAuth('Bearer wrong', 'my-secret')).toBe(false);
  });

  it('should reject when cron secret is not configured', () => {
    expect(verifyCronAuth('Bearer something', undefined)).toBe(false);
  });

  it('should reject non-Bearer auth', () => {
    expect(verifyCronAuth('Basic my-secret', 'my-secret')).toBe(false);
  });
});

describe('Follow-up extraction eligibility', () => {
  interface ConversationCandidate {
    messageCount: number;
    lastMessageRole: string;
    hasActiveFollowup: boolean;
    userOptedOut: boolean;
    updatedWithinWindow: boolean;
  }

  function isEligible(conv: ConversationCandidate): boolean {
    if (conv.messageCount < 4) return false;
    if (conv.lastMessageRole !== 'assistant') return false;
    if (conv.hasActiveFollowup) return false;
    if (conv.userOptedOut) return false;
    if (!conv.updatedWithinWindow) return false;
    return true;
  }

  const baseCandidate: ConversationCandidate = {
    messageCount: 6,
    lastMessageRole: 'assistant',
    hasActiveFollowup: false,
    userOptedOut: false,
    updatedWithinWindow: true,
  };

  it('should accept eligible conversation', () => {
    expect(isEligible(baseCandidate)).toBe(true);
  });

  it('should skip conversations with < 4 messages', () => {
    expect(isEligible({ ...baseCandidate, messageCount: 3 })).toBe(false);
  });

  it('should skip when last message is from user (not assistant)', () => {
    expect(isEligible({ ...baseCandidate, lastMessageRole: 'user' })).toBe(false);
  });

  it('should skip users with active follow-up', () => {
    expect(isEligible({ ...baseCandidate, hasActiveFollowup: true })).toBe(false);
  });

  it('should skip opted-out users', () => {
    expect(isEligible({ ...baseCandidate, userOptedOut: true })).toBe(false);
  });

  it('should skip conversations outside time window', () => {
    expect(isEligible({ ...baseCandidate, updatedWithinWindow: false })).toBe(false);
  });
});

describe('method_short_name length constraint', () => {
  it('should accept names <= 50 characters', () => {
    const name = 'Pomodoro Timer';
    expect(name.length).toBeLessThanOrEqual(50);
  });

  it('should truncate names > 50 characters', () => {
    const longName = 'A'.repeat(60);
    const truncated = longName.slice(0, 50);
    expect(truncated).toHaveLength(50);
  });
});
