import { useEffect, useState, useRef, ReactNode } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  ChevronDown,
  Users,
  User,
  Menu,
  X
} from 'lucide-react';
import UserMenu from '@/components/UI/UserMenu';
import ContactModal from '@/components/Landing/ContactModal';

interface DropdownItem {
  label: string;
  description: string;
  href: string;
  icon: ReactNode;
}

interface NavDropdownProps {
  label: string;
  items: DropdownItem[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

const NavDropdown = ({ label, items, isOpen, onToggle, onClose }: NavDropdownProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
      >
        {label}
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
          {items.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
              onClick={onClose}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary-teal/10 to-primary-purple/10 flex items-center justify-center text-primary-purple">
                {item.icon}
              </div>
              <div>
                <div className="font-medium text-slate-900 text-sm">{item.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

interface LandingLayoutProps {
  children: ReactNode;
}

export default function LandingLayout({ children }: LandingLayoutProps) {
  const { data: session } = useSession();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  const aboutItems: DropdownItem[] = [
    { label: 'Our Story', description: 'Why we built Qimi AI', href: '/about', icon: <Users size={20} /> },
    { label: "Founder's Letter", description: 'A personal message from James', href: '/founder', icon: <User size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-primary-teal/20">
      {/* Navbar - xingbanai.cn style */}
      <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid #f1f5f9' }}>
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          {/* Left: Logo with gradient text */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors mr-1"
            >
              {mobileMenuOpen ? <X size={24} className="text-slate-600" /> : <Menu size={24} className="text-slate-600" />}
            </button>
            <Link href="/" className="flex items-center">
              <span className="font-outfit text-xl font-semibold tracking-[-0.02em] text-transparent bg-clip-text bg-gradient-to-r from-primary-teal to-primary-purple">
                Qimi AI
              </span>
            </Link>
          </div>

          {/* Center: Nav links (desktop) */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/chat" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              AI Parenting Assistant
            </Link>
            <Link href="/blog" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              ADHD Insights
            </Link>
            <Link href="/#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Pricing
            </Link>
            <NavDropdown
              label="About"
              items={aboutItems}
              isOpen={openDropdown === 'about'}
              onToggle={() => setOpenDropdown(openDropdown === 'about' ? null : 'about')}
              onClose={() => setOpenDropdown(null)}
            />
          </div>

          {/* Right: Auth + Contact */}
          <div className="flex items-center gap-3">
            {session ? (
              <UserMenu />
            ) : (
              <>
                <button onClick={() => signIn()} className="hidden md:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                  Log in
                </button>
                <button
                  onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                  className="hidden md:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Sign up
                </button>
              </>
            )}
            <button
              onClick={() => setContactModalOpen(true)}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-full transition-all duration-200 hover:bg-slate-800 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
            >
              Contact Us
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-16 left-0 right-0 bg-white border-b border-slate-100 shadow-lg">
            <div className="px-4 py-4 space-y-1">
              <Link href="/" className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                Home
              </Link>
              <Link href="/chat" className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                AI Parenting Assistant
              </Link>
              <Link href="/blog" className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                ADHD Insights
              </Link>
              <Link href="/#pricing" className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                Pricing
              </Link>
              <Link href="/about" className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                About Us
              </Link>
              <Link href="/founder" className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                Founder&apos;s Letter
              </Link>

              <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
                {session ? (
                  <>
                    <Link
                      href="/chat"
                      className="flex items-center gap-2 px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User size={18} />
                      Go to Chat
                    </Link>
                    <button
                      onClick={() => { setMobileMenuOpen(false); signOut({ callbackUrl: '/' }); }}
                      className="w-full px-4 py-3 text-base font-medium text-red-600 hover:bg-red-50 rounded-lg text-left"
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setMobileMenuOpen(false); signIn(); }}
                      className="w-full px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg text-left"
                    >
                      Log in
                    </button>
                    <button
                      onClick={() => { setMobileMenuOpen(false); signIn('google', { callbackUrl: '/dashboard' }); }}
                      className="w-full px-4 py-3 rounded-lg bg-slate-900 text-white text-base font-bold hover:bg-slate-800 transition-colors"
                    >
                      Sign up
                    </button>
                  </>
                )}
                <button
                  onClick={() => { setMobileMenuOpen(false); setContactModalOpen(true); }}
                  className="w-full px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg text-left"
                >
                  Contact Us
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="pt-16">
        {children}
      </main>

      {/* Footer - xingbanai.cn simplified style */}
      <footer className="bg-slate-900 text-slate-400" style={{ padding: '48px 24px 24px' }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-wrap justify-between items-start gap-8 pb-8 border-b border-slate-800">
            <div className="max-w-[300px]">
              <div className="flex items-center mb-3">
                <span className="font-outfit text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-teal to-primary-purple">Qimi AI</span>
              </div>
              <p className="text-sm leading-relaxed">
                Empowering ADHD families with intelligent tools, emotional support, and a path forward.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Contact</h4>
              <p className="text-sm">
                Email: <a href="mailto:support@qimiai.com" className="text-primary-teal hover:text-primary-teal/80 transition-colors">support@qimiai.com</a>
              </p>
            </div>
          </div>

          <div className="pt-6 flex flex-wrap justify-between items-center gap-4 text-[13px]">
            <div className="flex flex-wrap gap-4">
              <a href="/privacy" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="text-slate-400 hover:text-white transition-colors">Terms of Service</a>
            </div>
            <span>&copy; 2025 Qimi AI. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* Contact Modal */}
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />
    </div>
  );
}
