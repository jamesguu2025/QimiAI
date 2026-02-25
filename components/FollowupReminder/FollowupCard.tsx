// components/FollowupReminder/FollowupCard.tsx — Compact follow-up summary card
interface FollowupCardProps {
  methodShortName: string;
  parentProblem: string;
  suggestedMethod: string;
}

export default function FollowupCard({
  methodShortName,
  parentProblem,
  suggestedMethod,
}: FollowupCardProps) {
  return (
    <div className="border-l-4 border-purple-500 bg-white rounded-lg p-4 shadow-sm">
      <span className="inline-block bg-purple-100 text-purple-700 text-xs font-medium px-2.5 py-0.5 rounded-full mb-3">
        {methodShortName}
      </span>
      <div className="space-y-2">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Challenge</p>
          <p className="text-sm text-gray-700 mt-0.5">{parentProblem}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Suggested Approach</p>
          <p className="text-sm text-gray-700 mt-0.5">{suggestedMethod}</p>
        </div>
      </div>
    </div>
  );
}
