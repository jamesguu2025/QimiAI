import { createHash } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';

export const AI_USAGE_LIMITS = {
  guestChatLifetime: 10,
  freeChatDaily: 30,
  planAiWeekly: 10,
  perMinute: 5,
} as const;

export type AiQuotaFeature = 'chat' | 'plan_ai';

function shanghaiDateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function shanghaiDayKey(now = new Date()) {
  const parts = shanghaiDateParts(now);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function shanghaiWeekKey(now = new Date()) {
  const day = shanghaiDayKey(now);
  const noonUtc = new Date(`${day}T04:00:00.000Z`);
  const weekday = noonUtc.getUTCDay() || 7;
  noonUtc.setUTCDate(noonUtc.getUTCDate() - weekday + 1);
  const monday = shanghaiDateParts(noonUtc);
  return `week:${monday.year}-${monday.month}-${monday.day}`;
}

export function actorKey(kind: 'user' | 'guest', id: string) {
  if (kind === 'user') return `user:${id}`;
  return `guest:${createHash('sha256').update(id).digest('hex')}`;
}

export async function consumeAiQuota(options: {
  actorKey: string;
  feature: AiQuotaFeature;
  windowKey: string;
  limit: number;
}) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc('consume_ai_quota', {
    p_actor_key: options.actorKey,
    p_feature: options.feature,
    p_window_key: options.windowKey,
    p_limit: options.limit,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Quota result missing');
  return {
    allowed: Boolean(row.allowed),
    used: Number(row.used_count || 0),
    remaining: Number(row.remaining || 0),
  };
}

export async function consumePersistentRateLimit(options: {
  actorKey: string;
  scope: string;
  limit?: number;
}) {
  const supabase = getSupabaseAdmin();
  const limit = options.limit || AI_USAGE_LIMITS.perMinute;
  const { data, error } = await supabase.rpc('consume_api_rate_limit', {
    p_actor_key: options.actorKey,
    p_scope: options.scope,
    p_limit: limit,
    p_window_seconds: 60,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Rate-limit result missing');
  return {
    allowed: Boolean(row.allowed),
    remaining: Number(row.remaining || 0),
    retryAfterSeconds: Number(row.retry_after_seconds || 0),
  };
}

export async function readAiQuota(actor: string, feature: AiQuotaFeature, windowKey: string, limit: number) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('ai_usage_quotas')
    .select('used_count')
    .eq('actor_key', actor)
    .eq('feature', feature)
    .eq('window_key', windowKey)
    .maybeSingle();
  if (error) throw error;
  const used = Number(data?.used_count || 0);
  return { limit, used, remaining: Math.max(0, limit - used) };
}

export async function consumePlanAiQuota(userId: string) {
  return consumeAiQuota({
    actorKey: actorKey('user', userId),
    feature: 'plan_ai',
    windowKey: shanghaiWeekKey(),
    limit: AI_USAGE_LIMITS.planAiWeekly,
  });
}
