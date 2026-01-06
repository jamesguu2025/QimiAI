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
  User
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
            <Link href="/" className="flex items-center gap-2">
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
            <div className="flex items-center gap-4">
              {session ? (
                <Link href="/dashboard" className="text-sm font-bold text-slate-900 hover:text-primary-purple">
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <button onClick={() => signIn()} className="text-sm font-medium text-slate-600 hover:text-slate-900">
                    Log in
                  </button>
                  <button
                    onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

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
