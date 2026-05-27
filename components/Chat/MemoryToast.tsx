// components/Chat/MemoryToast.tsx
// Auto-dismissing toast when Qimi extracts new family info from conversation
// Tracks fact count delta — only shows when NEW facts are added/updated

import { useState, useEffect, useRef } from 'react';
import { Brain, X } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface MemoryToastProps {
  conversationId: string | null;
  isStreaming: boolean;
}

export default function MemoryToast({ conversationId, isStreaming }: MemoryToastProps) {
  const { data: session } = useSession();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const prevFactCountRef = useRef<number | null>(null);
  const wasStreamingRef = useRef(false);
  const checkInFlightRef = useRef(false);

  // Load initial fact count on mount
  useEffect(() => {
    if (!session?.user?.email) return;
    fetch('/api/memory/facts')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) prevFactCountRef.current = data.facts?.length || 0;
      })
      .catch(() => {});
  }, [session?.user?.email]);

  useEffect(() => {
    // Detect stream completion: was streaming, now stopped
    if (wasStreamingRef.current && !isStreaming && conversationId && session?.user?.email) {
      // Prevent overlapping checks
      if (checkInFlightRef.current) {
        wasStreamingRef.current = false;
        return;
      }
      checkInFlightRef.current = true;

      // Wait for server-side extraction to complete (~3s)
      const timer = setTimeout(async () => {
        try {
          const response = await fetch('/api/memory/facts');
          if (!response.ok) return;

          const data = await response.json();
          const newCount = data.facts?.length || 0;
          const prevCount = prevFactCountRef.current ?? 0;
          const delta = newCount - prevCount;

          prevFactCountRef.current = newCount;

          if (delta > 0) {
            setMessage(
              delta === 1
                ? 'Learned 1 new insight about your family'
                : `Learned ${delta} new insights about your family`
            );
            setVisible(true);
            setTimeout(() => setVisible(false), 4000);
          }
        } catch {
          // Silent failure
        } finally {
          checkInFlightRef.current = false;
        }
      }, 3500);

      wasStreamingRef.current = false;
      return () => {
        clearTimeout(timer);
        checkInFlightRef.current = false;
      };
    }

    wasStreamingRef.current = isStreaming;
  }, [isStreaming, conversationId, session?.user?.email]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
      <div
        className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-lg border border-teal-100 max-w-sm"
        style={{ animation: 'fadeInUp 0.3s ease-out' }}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
          <Brain className="w-4 h-4 text-primary-teal" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800">
            Qimi is learning
          </p>
          <p className="text-xs text-slate-500">
            {message}
          </p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="flex-shrink-0 p-1 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
