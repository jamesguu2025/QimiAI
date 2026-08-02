import type { ReactNode } from 'react';
import Link from 'next/link';
import LandingHeader from '@/components/Landing/LandingHeader';

interface LandingLayoutProps {
  children: ReactNode;
}

export default function LandingLayout({ children }: LandingLayoutProps) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-primary-teal/20">
      <LandingHeader />

      <main className="pt-16">
        {children}
      </main>

      <footer className="bg-slate-900 text-slate-400" style={{ padding: '48px 24px 24px' }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-start pb-8 border-b border-slate-800">
            <div className="max-w-[300px]">
              <div className="flex items-center mb-3">
                <span className="font-outfit text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-teal to-primary-purple">Qimi AI</span>
              </div>
              <p className="text-sm leading-relaxed">
                Empowering ADHD families with intelligent tools, emotional support, and a path forward.
              </p>
            </div>
          </div>

          <div className="pt-6 flex flex-wrap justify-between items-center gap-4 text-[13px]">
            <div className="flex flex-wrap gap-4">
              <Link href="/blog" className="text-slate-400 hover:text-white transition-colors">ADHD Insights</Link>
              <Link href="/privacy" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="text-slate-400 hover:text-white transition-colors">Terms of Service</Link>
            </div>
            <span>&copy; {currentYear} Qimi AI. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
