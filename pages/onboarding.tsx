import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import GuestOnboarding, {
  OnboardingInitialData,
  SelectedChallenge,
} from '@/components/Chat/GuestOnboarding';
import { useAuthUIStore } from '@/stores/authUIStore';

function safeReturnTo(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard';
  }
  if (value.startsWith('/consent') || value.startsWith('/onboarding')) {
    return '/dashboard';
  }
  return value;
}

export default function RegisteredOnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { openLoginModal } = useAuthUIStore();
  const [initialData, setInitialData] = useState<OnboardingInitialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const returnTo = useMemo(() => safeReturnTo(router.query.returnTo), [router.query.returnTo]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      openLoginModal('login', 'Log in to finish setting up your family profile.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadStatus() {
      try {
        const consentResponse = await fetch('/api/compliance/consent-status');
        if (!consentResponse.ok) {
          throw new Error('Unable to verify consent status');
        }
        const consent = await consentResponse.json();
        if (consent.hasConsent === false) {
          router.replace(`/consent?returnTo=${encodeURIComponent(router.asPath)}`);
          return;
        }

        const response = await fetch('/api/onboarding/status');
        if (!response.ok) throw new Error('Unable to load your setup status');
        const data = await response.json();
        if (cancelled) return;

        if (data.completed) {
          router.replace(returnTo);
          return;
        }

        setInitialData(data.profile || {});
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load your setup status');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStatus();
    return () => { cancelled = true; };
  }, [session, status, openLoginModal, returnTo, router]);

  async function handleComplete(data: {
    childName: string;
    childBirthday: { year: number; month: number };
    gender: 'boy' | 'girl' | 'other';
    challenges: SelectedChallenge[];
    firstQuestion: string;
  }) {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childName: data.childName,
          childBirthday: data.childBirthday,
          gender: data.gender,
          challenges: data.challenges,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Unable to save your family profile');
      }

      router.replace(returnTo);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your family profile');
      setSaving(false);
    }
  }

  if (loading || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Head><title>Set up your profile | Qimi AI</title></Head>
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-primary-teal" />
          <p className="mt-4 text-sm text-slate-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  if (error && !initialData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Head><title>Set up your profile | Qimi AI</title></Head>
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">We could not load your profile</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button
            type="button"
            onClick={() => router.reload()}
            className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-50">
      <Head><title>Set up your profile | Qimi AI</title></Head>
      {saving && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-primary-teal" />
            <p className="mt-4 text-sm font-medium text-slate-700">Saving your profile...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="mx-auto mt-4 w-full max-w-xl px-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        </div>
      )}
      <GuestOnboarding
        initialData={initialData || {}}
        includeFirstQuestion={false}
        analyticsMode="registered"
        onComplete={handleComplete}
      />
    </div>
  );
}
