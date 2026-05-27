import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  summary: string | null;
  emptyText: string;
  href?: string;
  icon: React.ReactNode;
  loading?: boolean;
  error?: boolean;
  disabled?: boolean;
  badge?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  summary,
  emptyText,
  href,
  icon,
  loading = false,
  error = false,
  disabled = false,
  badge,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <div className="w-5 h-5 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="w-24 h-5 bg-slate-200 rounded animate-pulse mb-2" />
            <div className="w-32 h-4 bg-slate-300 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
            <div className="w-5 h-5 bg-red-200 rounded animate-pulse" />
          </div>
          <div className="flex-1 ml-1">
            <h3 className="font-semibold text-slate-800">{title}</h3>
            <p className="text-sm text-red-500">Unable to load</p>
          </div>
        </div>
      </div>
    );
  }

  const content = (
    <>
      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 ml-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          {badge && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-600">{summary || emptyText}</p>
      </div>
      {!disabled && <ChevronRight className="text-slate-400 flex-shrink-0" size={20} />}
    </>
  );

  if (disabled || !href) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-3 opacity-75">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow flex items-center gap-3"
    >
      {content}
    </Link>
  );
};
