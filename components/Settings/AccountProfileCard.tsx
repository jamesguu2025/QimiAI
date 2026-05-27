// components/Settings/AccountProfileCard.tsx
// Account profile display and edit card
// Created: 2026-03-17 - Settings module MVP

import { useState } from 'react';
import UserAvatar from '../UI/UserAvatar';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  provider: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AccountProfileCardProps {
  profile: UserProfile;
  onProfileSaved?: (profile: UserProfile) => void;
}

export function AccountProfileCard({ profile, onProfileSaved }: AccountProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Format provider for display
  const getProviderDisplay = () => {
    if (!profile.provider) return 'Email';
    return profile.provider.charAt(0).toUpperCase() + profile.provider.slice(1);
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      const data = await res.json();
      setSuccess(true);
      setIsEditing(false);
      
      // Notify parent component
      if (onProfileSaved) {
        onProfileSaved(data.profile);
      }

      // Clear success message after 2 seconds
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName(profile.name || '');
    setIsEditing(false);
    setError(null);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Account</h2>

      <div className="flex items-start gap-4 mb-6">
        {/* Avatar */}
        <UserAvatar
          src={profile.avatar}
          name={profile.name}
          email={profile.email}
          size="lg"
        />

        <div className="flex-1">
          {/* Name (editable) */}
          {isEditing ? (
            <div className="mb-3">
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your name"
                maxLength={100}
              />
            </div>
          ) : (
            <div className="mb-3">
              <span className="text-sm text-slate-500">Name</span>
              <p className="text-base font-medium text-slate-800">
                {profile.name || 'Not set'}
              </p>
            </div>
          )}

          {/* Email (read-only) */}
          <div className="mb-3">
            <span className="text-sm text-slate-500">Email</span>
            <p className="text-base text-slate-800">{profile.email}</p>
          </div>

          {/* Sign-in method (read-only) */}
          <div>
            <span className="text-sm text-slate-500">Sign-in method</span>
            <p className="text-base text-slate-800">{getProviderDisplay()}</p>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">Profile updated successfully!</p>
        </div>
      )}

      {/* Action buttons */}
      {isEditing ? (
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={loading || !name.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
        >
          Edit Name
        </button>
      )}
    </div>
  );
}
