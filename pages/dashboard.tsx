import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { User, BookOpen, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import AppLayout from '../components/Layout/AppLayout';
import { DashboardCard } from '../components/Dashboard/DashboardCard';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Stats state
  const [userCount, setUserCount] = useState<number | null>(null);
  const [paperCount, setPaperCount] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch stats on parallel
  useEffect(() => {
    async function fetchStats() {
      setStatsLoading(true);
      try {
        const [userRes, paperRes] = await Promise.all([
        fetch('/api/user-stats').then(r => r.json()),
        fetch('/api/rag/stats').then(r => r.json())
      ]);

        if (userRes.success) {
          setUserCount(userRes.count || 0);
        }
        if (paperRes.success) {
          setPaperCount(paperRes.totalPapers || 0);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setStatsLoading(false);
      }
    }
    fetchStats();
  }, []);

  // Auth check
  if (status === 'loading') {
    return (
      <AppLayout>
        <Head><title>Dashboard - Qimi AI</title></Head>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-slate-200 rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!session) {
    router.push('/login');
    return null;
  }

  const userName = session.user?.name || session.user?.email?.split('@')[0] || 'there';

  return (
    <AppLayout>
      <Head><title>Dashboard - Qimi AI</title></Head>

      <div className="py-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Dashboard</h1>
        <p className="text-slate-600 mb-6">
          Hi{userName ? ` ${userName}` : 'there'}, here's your family overview.
        </p>

        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-12 mx-auto" />
                <div className="h-4 bg-slate-200 rounded w-16 mx-auto" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-primary-teal">
                  {userCount !== null ? userCount.toLocaleString() : '0'}
                </div>
                <div className="text-sm text-slate-500">Active Families</div>
              </>
            )}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-12 mx-auto" />
                <div className="h-4 bg-slate-200 rounded w-16 mx-auto" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-primary-teal">
                  {paperCount !== null ? paperCount.toLocaleString() : '0'}
                </div>
                <div className="text-sm text-slate-500">Research Papers</div>
              </>
            )}
          </div>
        </div>

        {/* Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DashboardCard
            title="Family Profile"
            summary={null}
            emptyText="Set up your child's profile to get started"
            href="/family"
            icon={<User size={20} className="text-slate-600" />}
          />
          <DashboardCard
            title="Growth Plan"
            summary={null}
            emptyText="Suggestions from your conversations will appear here"
            href="/plan"
            icon={<BookOpen size={20} className="text-slate-600" />}
          />
          <DashboardCard
            title="Reports"
            summary={null}
            emptyText="Upload assessment reports for AI analysis"
            href="/reports"
            icon={<FileText size={20} className="text-slate-600" />}
          />
        </div>

        {/* Medical disclaimer */}
        <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500 text-center">
            <strong>Disclaimer:</strong> Qimi AI provides general information only, not medical advice, diagnosis, or or treatment. Always consult a qualified healthcare provider for medical decisions.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
