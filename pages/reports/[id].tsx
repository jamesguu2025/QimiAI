// pages/reports/[id].tsx - Single report view

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AppLayout from '@/components/Layout/AppLayout';
import ReportImage from '@/components/Reports/ReportImage';
import ReportAnalysis from '@/components/Reports/ReportAnalysis';
import AnalysisStatus from '@/components/Reports/AnalysisStatus';

interface Report {
  id: string;
  title: string;
  imageUrl: string;
  analysis: string | null;
  status: string;
  createdAt: string;
}

export default function ReportViewPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const { id } = router.query;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReport = useCallback(async () => {
    if (!id || typeof id !== 'string') return;
    try {
      const res = await fetch(`/api/reports/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Report not found');
        throw new Error('Failed to load report');
      }
      const data = await res.json();
      setReport(data.report);
    } catch (err) {
      console.error('[reports/[id]] fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (session && id) fetchReport();
  }, [session, id, fetchReport]);

  // Poll while analyzing
  useEffect(() => {
    if (!report || report.status !== 'analyzing') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/reports/${report.id}`);
        if (res.ok) {
          const data = await res.json();
          setReport(data.report);
          if (data.report.status !== 'analyzing') {
            clearInterval(interval);
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [report]);

  const handleRetryAnalysis = async () => {
    if (!report) return;
    setReport((prev) => prev ? { ...prev, status: 'analyzing' } : prev);
    try {
      const res = await fetch(`/api/reports/analyze?id=${report.id}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setReport((prev) => prev ? { ...prev, status: data.report.status, analysis: data.report.analysis } : prev);
      }
    } catch (err) {
      console.error('[reports/[id]] retry error:', err);
      setReport((prev) => prev ? { ...prev, status: 'failed' } : prev);
    }
  };

  const handleDelete = async () => {
    if (!report || !window.confirm('Delete this report? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/reports/${report.id}`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        router.push('/reports');
      }
    } catch (err) {
      console.error('[reports/[id]] delete error:', err);
      alert('Failed to delete report');
    }
  };

  if (authStatus === 'loading') {
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

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <span className="text-slate-400">Loading report...</span>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto space-y-4">
          <Link href="/reports" className="text-sm text-slate-400 hover:text-slate-600">
            ← My Reports
          </Link>
          <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</div>
        </div>
      </AppLayout>
    );
  }

  if (!report) return null;

  return (
    <AppLayout>
      <Head>
        <title>{report.title} - Qimi AI</title>
      </Head>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/reports" className="text-sm text-slate-400 hover:text-slate-600">
            ← My Reports
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-800">{report.title}</h1>
            <AnalysisStatus status={report.status} />
          </div>
          <button
            type="button"
            onClick={handleDelete}
            className="px-3 py-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>

        {/* Medical Disclaimer */}
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
          <p className="text-xs text-amber-700">
            AI analysis is not a substitute for professional medical advice. Always discuss report results with your child&apos;s healthcare provider.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Image */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <ReportImage imageUrl={report.imageUrl} title={report.title} />
          </div>

          {/* Analysis */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <h2 className="text-sm font-medium text-slate-600 mb-3">Analysis</h2>
            <ReportAnalysis
              analysis={report.analysis}
              status={report.status}
              onRetry={handleRetryAnalysis}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
