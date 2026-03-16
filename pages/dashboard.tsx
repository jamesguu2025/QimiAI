import Head from 'next/head';
import AppLayout from '../components/Layout/AppLayout';

// Placeholder — full Dashboard module coming next
export default function DashboardPage() {
    return (
        <AppLayout>
            <Head><title>Dashboard - Qimi AI</title></Head>
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Dashboard</h1>
                <p className="text-slate-500">Coming soon — your family hub will live here.</p>
            </div>
        </AppLayout>
    );
}
