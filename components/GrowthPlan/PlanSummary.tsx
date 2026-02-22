// components/GrowthPlan/PlanSummary.tsx - Stats bar

import React from 'react';

interface PlanSummaryProps {
  totalItems: number;
  starredCount: number;
  lastCheckIn: string | null;
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const PlanSummary: React.FC<PlanSummaryProps> = ({
  totalItems,
  starredCount,
  lastCheckIn,
}) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 text-center">
        <p className="text-2xl font-bold text-slate-800">{totalItems}</p>
        <p className="text-xs text-slate-400 mt-0.5">Total Items</p>
      </div>
      <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 text-center">
        <p className="text-2xl font-bold text-[#00D4AA]">{starredCount}</p>
        <p className="text-xs text-slate-400 mt-0.5">Starred</p>
      </div>
      <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 text-center">
        <p className="text-lg font-bold text-slate-600">
          {lastCheckIn ? formatRelativeDate(lastCheckIn) : 'Never'}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">Last Check-In</p>
      </div>
    </div>
  );
};

export default PlanSummary;
