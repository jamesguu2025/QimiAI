// components/Reports/AnalysisStatus.tsx - Status badge pill

import React from 'react';

interface AnalysisStatusProps {
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string; pulse?: boolean }> = {
  uploading: { label: 'Uploading', color: 'bg-yellow-50 text-yellow-700', dotColor: 'bg-yellow-400' },
  analyzing: { label: 'Analyzing', color: 'bg-blue-50 text-blue-700', dotColor: 'bg-blue-400', pulse: true },
  completed: { label: 'Complete', color: 'bg-emerald-50 text-emerald-700', dotColor: 'bg-emerald-400' },
  failed: { label: 'Failed', color: 'bg-red-50 text-red-700', dotColor: 'bg-red-400' },
};

const AnalysisStatus: React.FC<AnalysisStatusProps> = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.uploading;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} ${config.pulse ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  );
};

export default AnalysisStatus;
