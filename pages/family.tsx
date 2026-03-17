// pages/family.tsx - Family Profile Page
// Displays child info, read-only challenges, AI-extracted facts, and family summary
// Updated: 2026-03-17 - Redesigned with read-only challenges

import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import AppLayout from '../components/Layout/AppLayout';
import { FamilyCompletionBar } from '../components/Family/FamilyCompletionBar';
import ChildInfoCard from '../components/Family/ChildInfoCard';
import ChallengeTags, { SelectedChallenge } from '../components/Family/ChallengeTags';
import FamilySummarySection from '../components/Family/FamilySummarySection';

// Internal ChildProfileData type (matches API response)
interface ChildProfileData {
  id?: string;
  userId?: string;
  name?: string;
  birthYear?: number;
  birthMonth?: number;
  gender?: 'boy' | 'girl' | 'other';
  challenges: SelectedChallenge[];
  createdAt?: string;
  updatedAt?: string;
}

export default function FamilyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State
  const [childProfile, setChildProfile] = useState<ChildProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch child profile on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch('/api/family');
        const data = await response.json();

        if (data.success) {
          setChildProfile(data.childProfile);
        } else {
          setError('Failed to load profile');
        }
      } catch (err) {
        setError('Unable to load family profile. Please refresh.');
        console.error('[family] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    if (session) {
      fetchProfile();
    }
  }, [session]);

  // Auth check - loading state
  if (status === 'loading') {
    return (
      <AppLayout>
        <Head><title>Family Profile - Qimi AI</title></Head>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-slate-200 rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  // Auth check - redirect if no session
  if (!session) {
    router.push('/login');
    return null;
  }

  // Handle save callback - merge with existing challenges since ChildInfoCard doesn't edit them
  const handleSaved = (savedInfo: {
    id?: string;
    userId?: string;
    name?: string;
    birthYear?: number;
    birthMonth?: number;
    gender?: 'boy' | 'girl' | 'other';
    createdAt?: string;
    updatedAt?: string;
  }) => {
    setChildProfile(prev => prev ? { ...prev, ...savedInfo } : { ...savedInfo, challenges: [] });
  };

  return (
    <AppLayout>
      <Head><title>Family Profile - Qimi AI</title></Head>

      <div className="py-8 max-w-2xl mx-auto space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Family Profile</h1>
          <p className="text-slate-600 mt-1">
            Keep your child's details current so Qimi can stay helpful and personalized.
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
              <div className="h-10 bg-slate-200 rounded mb-4" />
              <div className="h-10 bg-slate-200 rounded mb-4" />
              <div className="h-32 bg-slate-200 rounded" />
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Completion bar */}
            <FamilyCompletionBar childProfile={childProfile} />

            {/* Section 1: Child Info Card */}
            <ChildInfoCard
              childInfo={childProfile}
              onSaved={handleSaved}
            />

            {/* Section 2: Onboarding Challenges (Read-Only) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Initial Concerns</h2>
              <p className="text-sm text-slate-500 mb-4">From your onboarding session</p>
              <ChallengeTags challenges={childProfile?.challenges || []} />
            </div>

            {/* Section 3: What Qimi Knows (editable summary) */}
            <FamilySummarySection />
          </>
        )}

        {/* Medical disclaimer */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500 text-center">
            <strong>Disclaimer:</strong> Qimi AI is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
