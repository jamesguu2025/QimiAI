// pages/settings.tsx
// Minimal settings page — account deletion only (compliance MVP)
// Future: profile editing, notifications, subscription management

import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import AppLayout from '../components/Layout/AppLayout';
import { DeleteAccountSection } from '../components/Settings/DeleteAccountSection';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

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

  if (!session) {
    router.push('/login');
    return null;
  }

  return (
    <AppLayout>
      <Head><title>Settings - Qimi AI</title></Head>

      <div className="py-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Account Settings</h1>

        {/* Account info (read-only for now) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Account</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Email</span>
              <span className="text-slate-800">{session.user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Name</span>
              <span className="text-slate-800">{session.user?.name || 'Not set'}</span>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="mt-8">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">Danger Zone</h2>
          <DeleteAccountSection />
        </div>
      </div>
    </AppLayout>
  );
}
