import { useMemo, useState } from 'react';
import { BookmarkPlus, Check } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useAuthUIStore } from '@/stores/authUIStore';

interface SaveFromChatButtonProps {
  assistantContent: string;
  conversationId?: string | null;
  sourceMessageId?: string | null;
  clientMessageId?: string;
  sourceTime?: string;
  userContext?: string;
}

function hasActionableShape(content: string) {
  const normalized = content.toLowerCase();
  const actionWords = [
    'try',
    'start',
    'use',
    'create',
    'set up',
    'practice',
    'write',
    'ask',
    'prepare',
    'track',
    'routine',
    'strategy',
    'step',
    'plan',
    'table',
    'checklist',
  ];

  return content.trim().length > 80 && actionWords.some((word) => normalized.includes(word));
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

  const shouldOfferSave = useMemo(() => hasActionableShape(assistantContent), [assistantContent]);

  if (!shouldOfferSave) return null;

  async function handleSave(duplicateOverride = false) {
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

  if (saved) {
    return (
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
        <Check className="h-3.5 w-3.5" />
        Saved to Growth Plan
      </div>
    );
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
