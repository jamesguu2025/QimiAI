// components/FollowupReminder/FollowupLanding.tsx — Main landing page component
import { useRouter } from 'next/router';
import FollowupCard from './FollowupCard';

interface FollowupLandingProps {
  followup: {
    id: string;
    status: string;
    parentProblem: string;
    suggestedMethod: string;
    methodShortName: string;
    followUpQuestion: string;
    createdAt: string;
  };
  onComplete: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
}

export default function FollowupLanding({
  followup,
  onComplete,
  onDismiss,
}: FollowupLandingProps) {
  const router = useRouter();
  const isHandled = followup.status === 'completed' || followup.status === 'dismissed';

  if (isHandled) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">✓</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Already Addressed
        </h2>
        <p className="text-gray-600 mb-6">
          You&apos;ve already addressed this follow-up. Keep up the great work!
        </p>
        <button
          onClick={() => router.push('/chat')}
          className="inline-block bg-[#00D4AA] text-white font-medium px-6 py-3 rounded-lg hover:bg-[#00b894] transition-colors"
        >
          Go to Chat
        </button>
      </div>
    );
  }

  const handleComplete = async () => {
    await onComplete(followup.id);
    router.push('/chat');
  };

  const handleDismiss = async () => {
    await onDismiss(followup.id);
    router.push('/chat');
  };

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back!
        </h1>
        <p className="text-gray-600">Let&apos;s check in on how things went.</p>
      </div>

      <FollowupCard
        methodShortName={followup.methodShortName}
        parentProblem={followup.parentProblem}
        suggestedMethod={followup.suggestedMethod}
      />

      <div className="mt-8 bg-purple-50 rounded-lg p-6 text-center">
        <p className="text-lg text-gray-800 font-medium leading-relaxed">
          {followup.followUpQuestion}
        </p>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <button
          onClick={handleComplete}
          className="w-full bg-[#00D4AA] text-white font-medium px-6 py-3 rounded-lg hover:bg-[#00b894] transition-colors text-center"
        >
          Chat with Qimi →
        </button>
        <button
          onClick={handleDismiss}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Not now
        </button>
      </div>

      <p className="mt-12 text-xs text-gray-400 text-center">
        This is not a substitute for professional medical advice. Please discuss
        any concerns with your child&apos;s healthcare provider.
      </p>
    </div>
  );
}
