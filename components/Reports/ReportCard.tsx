// components/Reports/ReportCard.tsx - Card for report list

import React from 'react';
import { useRouter } from 'next/router';
import AnalysisStatus from './AnalysisStatus';

interface ReportCardProps {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

const ReportCard: React.FC<ReportCardProps> = ({ id, title, status, createdAt }) => {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/reports/${id}`)}
      className="w-full text-left bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-slate-800 truncate">{title}</h3>
          <p className="text-xs text-slate-400 mt-1">
            {new Date(createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
        <AnalysisStatus status={status} />
      </div>
    </button>
  );
};

export default ReportCard;
