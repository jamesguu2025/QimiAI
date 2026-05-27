// components/Family/FamilyCompletionBar.tsx
// Progress bar showing family profile completion
// Updated: 2026-03-17 - Adapted for JSONB challenges

import React from 'react';
import { SelectedChallenge } from './ChallengeTags';

interface ChildProfileData {
  name?: string;
  birthYear?: number;
  birthMonth?: number;
  challenges: SelectedChallenge[];
}

interface FamilyCompletionBarProps {
  childProfile: ChildProfileData | null;
}

function computeCompletion(profile: ChildProfileData | null): { percent: number; completed: number; total: number; missing: string[] } {
  if (!profile) {
    return { percent: 0, completed: 0, total: 3, missing: ['Child name', 'Birth date', 'Challenges'] };
  }

  let completed = 0;
  const missing: string[] = [];

  // Check name
  if (profile.name && profile.name.trim()) {
    completed++;
  } else {
    missing.push('Child name');
  }

  // Check birth date
  if (profile.birthYear && profile.birthMonth) {
    completed++;
  } else {
    missing.push('Birth date');
  }

  // Check challenges (JSONB array)
  if (profile.challenges && profile.challenges.length > 0) {
    completed++;
  } else {
    missing.push('Challenges');
  }

  const percent = Math.round((completed / 3) * 100);
  return { percent, completed, total: 3, missing };
}

export const FamilyCompletionBar: React.FC<FamilyCompletionBarProps> = ({ childProfile }) => {
  const { percent, completed, total, missing } = computeCompletion(childProfile);

  // Bar color based on completion
  let barColor = 'bg-slate-300'; // 0%
  if (percent >= 67) {
    barColor = 'bg-primary-teal'; // 67-100%
  } else if (percent >= 33) {
    barColor = 'bg-amber-400'; // 33%
  }

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">
          Family Profile
        </span>
        <span className="text-sm text-slate-500">
          {percent}% complete ({completed}/{total})
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Missing items hint */}
      {missing.length > 0 && (
        <p className="mt-2 text-xs text-slate-400">
          Missing: {missing.join(', ')}
        </p>
      )}
    </div>
  );
};

export default FamilyCompletionBar;
