import { useCallback, useEffect, useState } from 'react';

export type AiQuotaStatus = {
  authState: 'guest' | 'authenticated';
  chat: { limit: number; used: number; remaining: number; period: 'lifetime' | 'day' };
  planAi: { limit: number; used: number; remaining: number; period: 'week' } | null;
};

export function useAiQuota(enabled = true) {
  const [quota, setQuota] = useState<AiQuotaStatus | null>(null);

  const refreshQuota = useCallback(async () => {
    if (!enabled) return null;
    try {
      const response = await fetch('/api/quota/status', { cache: 'no-store' });
      if (!response.ok) return null;
      const nextQuota = await response.json() as AiQuotaStatus;
      setQuota(nextQuota);
      return nextQuota;
    } catch {
      return null;
    }
  }, [enabled]);

  useEffect(() => { void refreshQuota(); }, [refreshQuota]);
  return { quota, refreshQuota, setQuota };
}
