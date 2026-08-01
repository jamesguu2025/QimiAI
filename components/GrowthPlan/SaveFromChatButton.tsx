import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookmarkPlus, Check } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useAuthUIStore } from '@/stores/authUIStore';
import { trackClientEvent } from '@/lib/client-analytics';

interface SaveFromChatButtonProps {
  assistantContent: string;
  conversationId?: string | null;
  sourceMessageId?: string | null;
  clientMessageId?: string;
  sourceTime?: string;
  userContext?: string;
}

export default function SaveFromChatButton({
  assistantContent,
  conversationId,
  sourceMessageId,
  clientMessageId,
  sourceTime,
  userContext,
}: SaveFromChatButtonProps) {
  const { data: session } = useSession();
  const { openLoginModal } = useAuthUIStore();
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [duplicateCanOverride, setDuplicateCanOverride] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldOfferSave, setShouldOfferSave] = useState(false);
  const [offeredCategory, setOfferedCategory] = useState<string>('unknown');

  useEffect(() => {
    if (!session || (!sourceMessageId && !conversationId)) {
      setSaved(false);
      return;
    }

    const controller = new AbortController();
    fetch('/api/plan/saved-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceMessageId,
        sourceConversationId: conversationId,
      }),
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : { saved: false })
      .then((data) => {
        if (!controller.signal.aborted) {
          setSaved(data?.saved === true);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSaved(false);
        }
      });

    return () => controller.abort();
  }, [session, sourceMessageId, conversationId]);

  useEffect(() => {
    const trimmedContent = assistantContent.trim();
    if (trimmedContent.length < 100) {
      setShouldOfferSave(false);
      return;
    }

    const controller = new AbortController();
    setShouldOfferSave(false);

    fetch('/api/plan/decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assistantContent: trimmedContent }),
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : { shouldPropose: false })
      .then((data) => {
        if (!controller.signal.aborted) {
          const shouldShow = data?.shouldPropose === true;
          setShouldOfferSave(shouldShow);
          setOfferedCategory(data?.category || 'unknown');
          if (shouldShow) {
            trackClientEvent('plan:save_prompt_show', {
              prompt_source: 'chat',
              category: data?.category || 'unknown',
            });
          }
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setShouldOfferSave(false);
        }
      });

    return () => controller.abort();
  }, [assistantContent]);

  if (saved) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          <Check className="h-3.5 w-3.5" />
          Saved to Growth Plan
        </div>
        <Link
          href="/plan"
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary-purple/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary-purple transition-colors hover:border-primary-purple/40 hover:bg-primary-purple/5"
        >
          View and Compose Plans
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  if (!shouldOfferSave) return null;

  async function handleSave(duplicateOverride = false) {
    trackClientEvent('plan:save_prompt_click', {
      prompt_source: 'chat',
      category: offeredCategory,
    });

    if (!session) {
      openLoginModal('signup');
      return;
    }

    setIsSaving(true);
    setError(null);
    if (!duplicateOverride) setDuplicateCanOverride(false);

    try {
      const response = await fetch('/api/plan/save-from-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          sourceMessageId,
          clientMessageId,
          sourceTime,
          assistantContent,
          userContext,
          duplicateOverride,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.status === 409) {
        setDuplicateCanOverride(data.duplicate?.reason !== 'same source message');
        throw new Error(data.error || 'This suggestion already looks saved.');
      }
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save plan item');
      }

      setSaved(true);
      setDuplicateCanOverride(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save plan item');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary-teal/30 bg-white px-3 py-1.5 text-xs font-semibold text-primary-teal transition-colors hover:bg-primary-teal/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <BookmarkPlus className="h-3.5 w-3.5" />
          {isSaving ? 'Saving...' : 'Save to Growth Plan'}
        </button>

        {duplicateCanOverride && (
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-60"
          >
            Save Anyway
          </button>
        )}
      </div>

      {error && (
        <p className="mt-2 max-w-md text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
