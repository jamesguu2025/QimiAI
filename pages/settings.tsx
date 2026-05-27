// pages/settings.tsx
// Account settings page — profile editing + account deletion
// Updated: 2026-03-17 - Settings module MVP

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import AppLayout from '../components/Layout/AppLayout';
import { useAuthUIStore } from '@/stores/authUIStore';
import { AccountProfileCard } from '../components/Settings/AccountProfileCard';
import { DeleteAccountSection } from '../components/Settings/DeleteAccountSection';
import AuthRequiredState from '@/components/Auth/AuthRequiredState';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  provider: string | null;
  createdAt: string;
  updatedAt: string;
}

const SETTINGS_AUTH_REASON = 'Log in or sign up to manage your account settings and keep your family data protected.';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const { openLoginModal } = useAuthUIStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile on mount
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      fetchProfile();
    }
  }, [status, session]);

  useEffect(() => {
    if (status !== 'loading' && !session) {
      openLoginModal('signup', SETTINGS_AUTH_REASON);
    }
  }, [status, session, openLoginModal]);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/settings');

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load profile');
      }

      const data = await res.json();
      setProfile(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSaved = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
  };

  // Loading state
  if (status === 'loading') {
    return (
      <AppLayout>
        <Head><title>Settings - Qimi AI</title></Head>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-slate-200 rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  // Auth redirect
  if (!session) {
    return (
      <AppLayout>
        <Head><title>Settings - Qimi AI</title></Head>
        <AuthRequiredState
          title="Sign up to manage settings"
          description="Account settings are available after you create an account or log in."
          reason={SETTINGS_AUTH_REASON}
        />
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <Head><title>Settings - Qimi AI</title></Head>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-slate-200 rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AppLayout>
        <Head><title>Settings - Qimi AI</title></Head>
        <div className="py-8 max-w-2xl">
          <h1 className="text-2xl font-bold text-slate-800 mb-6">Account Settings</h1>
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={fetchProfile}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // No profile state (should not happen if API is working correctly)
  if (!profile) {
    return (
      <AppLayout>
        <Head><title>Settings - Qimi AI</title></Head>
        <div className="py-8 max-w-2xl">
          <h1 className="text-2xl font-bold text-slate-800 mb-6">Account Settings</h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <p className="text-yellow-700">Unable to load profile data.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Head><title>Settings - Qimi AI</title></Head>

      <div className="py-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Account Settings</h1>

        {/* Account section */}
        <div className="mb-6">
          <AccountProfileCard profile={profile} onProfileSaved={handleProfileSaved} />
        </div>

        {/* Membership placeholder */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Membership</h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Current plan</span>
              <span className="text-sm font-medium text-slate-800">Free plan</span>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Billing tools will be added after MVP
            </p>
          </div>
        </div>

        {/* Danger zone */}
        <div className="mt-8">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">
            Danger Zone
          </h2>
          <DeleteAccountSection />
        </div>
      </div>
    </AppLayout>
  );
}
