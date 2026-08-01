import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Menu, User, X } from 'lucide-react';
import UserMenu from '@/components/UI/UserMenu';
import ContactModal from '@/components/Landing/ContactModal';
import { useAuthUIStore } from '@/stores/authUIStore';
import { trackClientEvent } from '@/lib/client-analytics';
import { SHOW_ADHD_INSIGHTS, SHOW_PRICING } from './landingVisibility';

export default function LandingHeader() {
  const router = useRouter();
  const { data: session } = useSession();
  const { openLoginModal } = useAuthUIStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  const handleStart = () => {
    if (session) {
      router.push('/dashboard');
      return;
    }
    openLoginModal('signup');
  };

  const openContact = () => {
    trackClientEvent('landing:cta_click', {
      cta_id: 'nav_contact',
      cta_location: 'navbar',
      destination: 'contact_modal',
      auth_state: session ? 'authenticated' : 'guest',
    });
    setContactModalOpen(true);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid #f1f5f9' }}>
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors mr-1"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? <X size={24} className="text-slate-600" /> : <Menu size={24} className="text-slate-600" />}
            </button>
            <Link href="/" className="flex items-center">
              <span className="font-outfit text-xl font-semibold tracking-[-0.02em] text-transparent bg-clip-text bg-gradient-to-r from-primary-teal to-primary-purple">
                Qimi AI
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <Link href={session ? '/dashboard' : '/chat'} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              AI Parenting Assistant
            </Link>
            {SHOW_ADHD_INSIGHTS && (
              <Link href="/blog" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                ADHD Insights
              </Link>
            )}
            {SHOW_PRICING && (
              <Link href="/#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Pricing
              </Link>
            )}
            <Link href="/about" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Our Story
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {session ? (
              <UserMenu />
            ) : (
              <>
                <button onClick={() => openLoginModal('login')} className="hidden md:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                  Log in
                </button>
                <button onClick={() => openLoginModal('signup')} className="hidden md:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                  Sign up
                </button>
              </>
            )}
            <button
              onClick={openContact}
              className="hidden md:inline-flex px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-full transition-all duration-200 hover:bg-slate-800 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
            >
              Contact Us
            </button>
            <button onClick={handleStart} className="md:hidden px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-full transition-all duration-200 hover:bg-slate-800">
              Start
            </button>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-16 left-0 right-0 bg-white border-b border-slate-100 shadow-lg">
            <div className="px-4 py-4 space-y-1">
              <Link href="/" className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>Home</Link>
              <Link href={session ? '/dashboard' : '/chat'} className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>AI Parenting Assistant</Link>
              {SHOW_ADHD_INSIGHTS && <Link href="/blog" className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>ADHD Insights</Link>}
              {SHOW_PRICING && <Link href="/#pricing" className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>}
              <Link href="/about" className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>Our Story</Link>

              <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
                {session ? (
                  <>
                    <Link href="/chat" className="flex items-center gap-2 px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                      <User size={18} /> Go to Chat
                    </Link>
                    <button onClick={() => { setMobileMenuOpen(false); signOut({ callbackUrl: '/' }); }} className="w-full px-4 py-3 text-base font-medium text-red-600 hover:bg-red-50 rounded-lg text-left">
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setMobileMenuOpen(false); openLoginModal('login'); }} className="w-full px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg text-left">Log in</button>
                    <button onClick={() => { setMobileMenuOpen(false); openLoginModal('signup'); }} className="w-full px-4 py-3 rounded-lg bg-slate-900 text-white text-base font-bold hover:bg-slate-800 transition-colors">Start</button>
                  </>
                )}
                <button onClick={() => { setMobileMenuOpen(false); openContact(); }} className="w-full px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg text-left">Contact Us</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ContactModal isOpen={contactModalOpen} onClose={() => setContactModalOpen(false)} />
    </>
  );
}
