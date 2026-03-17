// hooks/useMemoryExtraction.ts
// Fire-and-forget memory extraction trigger after chat stream completes
// Usage: call triggerExtraction() when the chat stream sends a 'done' event

import { useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

const DEBOUNCE_MS = 30_000; // 30 seconds per conversation

export function useMemoryExtraction() {
  const { data: session } = useSession();
  const lastTriggered = useRef<Record<string, number>>({});

  const triggerExtraction = useCallback(
    (conversationId: string | null) => {
      // Skip if not authenticated or no conversation
      if (!session?.user?.email || !conversationId) return;

      // Debounce: don't fire more than once per 30s per conversation
      const now = Date.now();
      const lastTime = lastTriggered.current[conversationId] || 0;
      if (now - lastTime < DEBOUNCE_MS) return;
      lastTriggered.current[conversationId] = now;

      // Fire-and-forget — do NOT await
      fetch('/api/memory/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      }).catch(() => {
        // Silent failure — extraction errors must not affect chat UX
      });
    },
    [session?.user?.email]
  );

  return { triggerExtraction };
}
