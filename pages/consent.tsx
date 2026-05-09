import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useAuthUIStore } from '@/stores/authUIStore';
import { PARENTAL_CONSENT_TEXT } from '@/lib/compliance/consent';

export default function ConsentPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { openLoginModal } = useAuthUIStore();
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const returnTo = typeof router.query.returnTo === 'string' && router.query.returnTo.startsWith('/')
    ? router.query.returnTo
    : '/dashboard';

  useEffect(() => {
    if (status !== 'loading' && !session) {
      openLoginModal('login');
    }
  }, [status, session, openLoginModal]);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    async function checkExistingConsent() {
      try {
        const response = await fetch('/api/compliance/consent-status');
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && data.hasConsent === true) {
          router.replace(returnTo);
        }
      } catch (err) {
        console.error('[consent] Existing consent check failed:', err);
      }
    }

    checkExistingConsent();

    return () => {
      cancelled = true;
    };
  }, [session, returnTo, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!checked) {
      setError('Please confirm before continuing.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/compliance/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentText: PARENTAL_CONSENT_TEXT }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Unable to record consent');
      }

      router.replace(returnTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record consent');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Head><title>Before You Continue - Qimi AI</title></Head>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary-teal" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Head><title>Consent - Qimi AI</title></Head>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <Head><title>Before You Continue - Qimi AI</title></Head>

      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <img src="/logo.svg" alt="Qimi AI" className="mx-auto mb-4 h-10" />
          <h1 className="text-2xl font-bold text-slate-900">Before you continue</h1>
          <p className="mt-2 text-sm text-slate-600">
            Please review this before saving child or family information in Qimi.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => {
                setChecked(event.target.checked);
                setError(null);
              }}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-teal focus:ring-primary-teal"
            />
            <span>
              By continuing, I confirm that I am 18 or older, that I will only provide child or family information I am authorized to share, and that I agree to the{' '}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary-teal hover:underline"
              >
                Privacy Policy
              </a>
              {' '}and{' '}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary-teal hover:underline"
              >
                Terms of Service
              </a>.
            </span>
          </label>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!checked || submitting}
            className="mt-6 w-full rounded-xl bg-slate-900 py-3 font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-400"
          >
            {submitting ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
