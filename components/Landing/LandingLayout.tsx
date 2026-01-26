import { useEffect, useState, useRef, ReactNode } from 'react';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  ChevronDown,
  MessageSquare,
  FileText,
  Calendar,
  Heart,
  BookOpen,
  Lightbulb,
  Users,
  User,
  Menu,
  X
} from 'lucide-react';

// 下拉菜单数据类型
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

// 下拉菜单组件
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
  const [userCount, setUserCount] = useState(0);

  // 获取全球注册用户数
  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const response = await fetch('/api/user-stats');
        const data = await response.json();
        if (data.success) {
          setUserCount(data.count);
        }
      } catch (error) {
        console.error('Failed to fetch user stats:', error);
      }
    };
    fetchUserStats();
  }, []);

  // 导航菜单数据
  const featuresItems: DropdownItem[] = [
    { label: 'AI Chat', description: '24/7 personalized ADHD parenting support', href: '/chat', icon: <MessageSquare size={20} /> },
    { label: 'IEP Assistant', description: 'Generate and review IEP documents', href: '/chat?mode=iep', icon: <FileText size={20} /> },
    { label: 'Routine Builder', description: 'Create visual schedules for daily tasks', href: '/chat?mode=routine', icon: <Calendar size={20} /> },
    { label: 'Emotional Support', description: 'Guidance for difficult moments', href: '/chat?mode=support', icon: <Heart size={20} /> },
  ];

  const resourcesItems: DropdownItem[] = [
    { label: 'Blog', description: 'Latest articles and research insights', href: '/blog', icon: <BookOpen size={20} /> },
    { label: 'FAQ', description: 'Common questions answered', href: '/#faq', icon: <Lightbulb size={20} /> },
  ];

  const aboutItems: DropdownItem[] = [
    { label: 'Our Story', description: 'Why we built Qimi AI', href: '/about', icon: <Users size={20} /> },
    { label: "Founder's Letter", description: 'A personal message from James', href: '/founder', icon: <User size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-primary-teal/20">
      {/* Navbar - 固定在顶部 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Hamburger (mobile) / Logo (desktop) */}
            <div className="flex items-center gap-2 flex-1 md:flex-none">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {mobileMenuOpen ? <X size={24} className="text-slate-600" /> : <Menu size={24} className="text-slate-600" />}
              </button>
              <Link href="/" className="hidden md:flex items-center gap-2">
                <img src="/logo.svg" alt="Qimi AI" className="h-10 w-auto" />
              </Link>
            </div>
            {/* Center: Logo (mobile) / Nav (desktop) */}
            <div className="flex items-center justify-center">
              <Link href="/" className="md:hidden flex items-center gap-2">
                <img src="/logo.svg" alt="Qimi AI" className="h-10 w-auto" />
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <NavDropdown
                  label="Features"
                  items={featuresItems}
                  isOpen={openDropdown === 'features'}
                  onToggle={() => setOpenDropdown(openDropdown === 'features' ? null : 'features')}
                  onClose={() => setOpenDropdown(null)}
                />
                <NavDropdown
                  label="Resources"
                  items={resourcesItems}
                  isOpen={openDropdown === 'resources'}
                  onToggle={() => setOpenDropdown(openDropdown === 'resources' ? null : 'resources')}
                  onClose={() => setOpenDropdown(null)}
                />
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
            </div>
            {/* Right: Counter + Auth */}
            <div className="flex items-center gap-4 flex-1 md:flex-none justify-end">
              {session ? (
                <Link href="/dashboard" className="text-sm font-bold text-slate-900 hover:text-primary-purple">
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  {/* Live Counter - Always visible with context */}
                  <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-slate-50 rounded-full border border-slate-100">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs font-medium text-slate-600">
                      <span className="font-bold text-slate-900">{userCount.toLocaleString()}</span> families empowered
                    </span>
                  </div>

                  <button onClick={() => signIn()} className="hidden md:block text-sm font-medium text-slate-600 hover:text-slate-900">
                    Log in
                  </button>
                  <button
                    onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                    className="hidden md:block px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu drawer - 与主页保持一致的简洁设计 */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed top-16 left-0 right-0 bg-white border-b border-slate-100 shadow-lg">
            <div className="px-4 py-4 space-y-1">
              <Link
                href="/"
                className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/chat"
                className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                AI Parenting Assistant
              </Link>
              <Link
                href="/blog"
                className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                ADHD Insights
              </Link>
              <Link
                href="/#pricing"
                className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/about"
                className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                About Us
              </Link>
              <Link
                href="/founder"
                className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Founder&apos;s Letter
              </Link>

              {/* Auth buttons */}
              {!session && (
                <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 主内容区域 - 需要顶部 padding 避免被 navbar 遮挡 */}
      <main className="pt-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4 text-white">
                <img src="/logo.svg" alt="Qimi AI" className="h-8 w-8 brightness-0 invert" />
                <span className="font-bold text-xl">Qimi AI</span>
              </div>
              <p className="text-slate-400 max-w-xs">
                Empowering ADHD families with intelligent tools, emotional support, and a path forward.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/#how-it-works" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/founder" className="hover:text-white transition-colors">Founder&apos;s Story</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p>© 2025 Qimi AI. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
