import { LockKeyhole } from 'lucide-react';
import { useRouter } from 'next/router';
import { useAuthUIStore } from '@/stores/authUIStore';

interface AuthRequiredStateProps {
  title: string;
  description: string;
  reason: string;
}

export default function AuthRequiredState({ title, description, reason }: AuthRequiredStateProps) {
  const router = useRouter();
  const { openLoginModal } = useAuthUIStore();

  return (
    <div className="flex min-h-[420px] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-teal/10 text-primary-teal">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => openLoginModal('signup', reason)}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Sign up to unlock
          </button>
          <button
            type="button"
            onClick={() => router.push('/chat')}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Back to chat
          </button>
        </div>
      </div>
    </div>
  );
}
