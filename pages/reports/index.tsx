// pages/reports/index.tsx - Report list page

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AppLayout from '@/components/Layout/AppLayout';
import ReportCard from '@/components/Reports/ReportCard';

interface ReportListItem {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) {
      fetch('/api/reports')
        .then(async (res) => {
          if (!res.ok) throw new Error('Failed to load reports');
          const data = await res.json();
          setReports(data.reports);
        })
        .catch((err) => {
          console.error('[reports] fetch error:', err);
          setError('Failed to load reports. Please refresh.');
        })
        .finally(() => setLoading(false));
    }
  }, [session]);

  if (status === 'loading') {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <span className="text-slate-400">Loading...</span>
        </div>
      </AppLayout>
    );
  }

  if (!session) {
    router.push('/login');
    return null;
  }

  // Count reports this month for free tier notice
  const now = new Date();
  const reportsThisMonth = reports.filter((r) => {
    const d = new Date(r.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  return (
    <AppLayout>
      <Head>
        <title>My Reports - Qimi AI</title>
      </Head>
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">My Reports</h1>
          <Link
            href="/reports/upload"
            className="px-3 py-1.5 bg-[#00D4AA] text-white text-sm rounded-lg hover:bg-teal-500 transition-colors"
          >
            Upload Report
          </Link>
        </div>

        {/* Free tier notice */}
        <p className="text-xs text-slate-400">
          {reportsThisMonth} of 1 reports used this month (Free plan)
        </p>

        {/* Error */}
        {error && (
          <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">
            No reports yet. Upload your first report.
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <ReportCard key={r.id} {...r} />
            ))}
          </div>
        )}

        {/* Medical Disclaimer */}
        <p className="text-xs text-slate-400 text-center py-2">
          Not a substitute for professional medical advice.
        </p>
      </div>
    </AppLayout>
  );
}
