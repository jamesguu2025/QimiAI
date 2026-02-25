// pages/followup/[id].tsx — Follow-up landing page
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AppLayout from '@/components/Layout/AppLayout';
import FollowupLanding from '@/components/FollowupReminder/FollowupLanding';

interface FollowupData {
  id: string;
  status: string;
  parentProblem: string;
  suggestedMethod: string;
  methodShortName: string;
  followUpQuestion: string;
  createdAt: string;
}

export default function FollowupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;

  const [followup, setFollowup] = useState<FollowupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFollowup = useCallback(async (followupId: string) => {
    try {
      const res = await fetch(`/api/followup/${followupId}`);
      if (res.status === 404) {
        setError('not_found');
        return;
      }
      if (!res.ok) {
        setError('error');
        return;
      }
      const data = await res.json();
      setFollowup(data.followup);
    } catch {
      setError('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push(`/login?callbackUrl=/followup/${id}`);
      return;
    }
    if (id && typeof id === 'string') {
      fetchFollowup(id);
    }
  }, [session, status, id, router, fetchFollowup]);

  const handleComplete = async (followupId: string) => {
    await fetch('/api/followup/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: followupId }),
    });
  };

  const handleDismiss = async (followupId: string) => {
    await fetch('/api/followup/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: followupId }),
    });
  };

  if (status === 'loading' || loading) {
    return (
      <AppLayout>
        <Head>
          <title>Follow Up - Qimi AI</title>
        </Head>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-gray-500">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (error === 'not_found') {
    return (
      <AppLayout>
        <Head>
          <title>Follow Up - Qimi AI</title>
        </Head>
        <div className="max-w-lg mx-auto py-12 px-4 text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Follow-up Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            This follow-up may have expired or doesn&apos;t exist.
          </p>
          <button
            onClick={() => router.push('/chat')}
            className="inline-block bg-[#00D4AA] text-white font-medium px-6 py-3 rounded-lg hover:bg-[#00b894] transition-colors"
          >
            Go to Chat
          </button>
        </div>
      </AppLayout>
    );
  }

  if (error || !followup) {
    return (
      <AppLayout>
        <Head>
          <title>Follow Up - Qimi AI</title>
        </Head>
        <div className="max-w-lg mx-auto py-12 px-4 text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-6">
            Please try again later.
          </p>
          <button
            onClick={() => router.push('/chat')}
            className="inline-block bg-[#00D4AA] text-white font-medium px-6 py-3 rounded-lg hover:bg-[#00b894] transition-colors"
          >
            Go to Chat
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Head>
        <title>Follow Up - Qimi AI</title>
      </Head>
      <FollowupLanding
        followup={followup}
        onComplete={handleComplete}
        onDismiss={handleDismiss}
      />
    </AppLayout>
  );
}
