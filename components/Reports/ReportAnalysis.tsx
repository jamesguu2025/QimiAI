// components/Reports/ReportAnalysis.tsx - Display formatted analysis text

import React from 'react';

interface ReportAnalysisProps {
  analysis: string | null;
  status: string;
  onRetry?: () => void;
}

function parseAnalysis(text: string): React.ReactNode[] {
  const lines = text.split('\n').filter((l) => l.trim());
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // Numbered section header (e.g., "1. Report Type")
    if (/^\d+\.\s/.test(trimmed)) {
      elements.push(
        <h3 key={i} className="text-sm font-bold text-slate-800 mt-4 mb-1">
          {trimmed}
        </h3>
      );
    }
    // Bullet point
    else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      elements.push(
        <li key={i} className="text-sm text-slate-700 ml-4 mb-1">
          {trimmed.slice(2)}
        </li>
      );
    }
    // Bold text (wrapped in **)
    else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      elements.push(
        <p key={i} className="text-sm font-semibold text-slate-800 mt-3 mb-1">
          {trimmed.replace(/\*\*/g, '')}
        </p>
      );
    }
    // Regular paragraph
    else {
      elements.push(
        <p key={i} className="text-sm text-slate-700 mb-2">
          {trimmed}
        </p>
      );
    }
  });

  return elements;
}

const ReportAnalysis: React.FC<ReportAnalysisProps> = ({ analysis, status, onRetry }) => {
  if (status === 'analyzing') {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-3">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Analyzing your report...</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-sm text-red-500">Analysis failed. Please try again.</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-1.5 bg-[#00D4AA] text-white text-sm rounded-lg hover:bg-teal-500 transition-colors"
          >
            Retry Analysis
          </button>
        )}
      </div>
    );
  }

  if (!analysis) {
    return (
      <p className="text-sm text-slate-400 text-center py-8">
        No analysis available yet.
      </p>
    );
  }

  return (
    <div>
      {parseAnalysis(analysis)}
      <p className="text-xs text-slate-400 italic mt-4 pt-3 border-t border-slate-100">
        This summary is not a substitute for professional medical advice. Please discuss these results with your child&apos;s healthcare provider.
      </p>
    </div>
  );
};

export default ReportAnalysis;
