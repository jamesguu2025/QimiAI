// components/Settings/DeleteAccountSection.tsx
// Self-service account deletion UI — COPPA compliance

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { clearConversationsCache } from '@/stores/chatStore';
import { guestStorage } from '@/utils/guest-storage';

export function DeleteAccountSection() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      // Account deleted — sign out and redirect to landing
      clearConversationsCache();
      guestStorage.clear();
      await signOut({ callbackUrl: '/' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  if (!showConfirm) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Delete Account</h2>
        <p className="text-sm text-slate-600 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          onClick={() => setShowConfirm(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
        >
          Delete My Account
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-red-200 p-6">
      <h2 className="text-lg font-semibold text-red-700 mb-2">Confirm Account Deletion</h2>
      <p className="text-sm text-slate-600 mb-4">
        This will permanently delete your account and all data including your child&apos;s profile,
        conversations, and AI-learned insights. This cannot be undone.
      </p>

      <div className="mb-4">
        <label htmlFor="confirm-delete" className="block text-sm font-medium text-slate-700 mb-1">
          Type <span className="font-bold text-red-600">DELETE</span> to confirm
        </label>
        <input
          id="confirm-delete"
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          disabled={loading}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-4">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleDelete}
          disabled={confirmText !== 'DELETE' || loading}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Deleting...' : 'Permanently Delete'}
        </button>
        <button
          onClick={() => {
            setShowConfirm(false);
            setConfirmText('');
            setError(null);
          }}
          disabled={loading}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
