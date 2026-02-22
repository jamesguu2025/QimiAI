// pages/reports/upload.tsx - Upload report page

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AppLayout from '@/components/Layout/AppLayout';
import ReportUploader from '@/components/Reports/ReportUploader';
import AnalysisStatus from '@/components/Reports/AnalysisStatus';

export default function UploadReportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [uploading, setUploading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [error, setError] = useState('');

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

  const handleUpload = async (file: File, title: string) => {
    setUploading(true);
    setError('');
    setCurrentStatus('uploading');

    try {
      // Upload
      const formData = new FormData();
      formData.append('file', file);
      if (title) formData.append('title', title);

      const uploadRes = await fetch('/api/reports/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        throw new Error(data.error || 'Upload failed');
      }

      const uploadData = await uploadRes.json();
      const reportId = uploadData.report.id;

      // Trigger analysis
      setCurrentStatus('analyzing');
      const analyzeRes = await fetch(`/api/reports/analyze?id=${reportId}`, {
        method: 'POST',
      });

      if (!analyzeRes.ok) {
        const data = await analyzeRes.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const analyzeData = await analyzeRes.json();
      setCurrentStatus(analyzeData.report.status);

      // Navigate to report view
      router.push(`/reports/${reportId}`);
    } catch (err) {
      console.error('[reports/upload] error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setCurrentStatus(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout>
      <Head>
        <title>Upload Report - Qimi AI</title>
      </Head>
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/reports"
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← My Reports
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Upload a Report</h1>

        {/* Medical Disclaimer */}
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
          <p className="text-xs text-amber-700">
            AI analysis is not a substitute for professional medical advice. Always discuss report results with your child&apos;s healthcare provider.
          </p>
        </div>

        {/* Status */}
        {currentStatus && (
          <div className="flex justify-center">
            <AnalysisStatus status={currentStatus} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</div>
        )}

        {/* Uploader */}
        <ReportUploader
          onUpload={handleUpload}
          isLoading={uploading}
          userTier="free"
        />
      </div>
    </AppLayout>
  );
}
