import Head from 'next/head';
import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import Hero from '../components/Landing/Hero';
import { PricingCard } from '../components/Landing/PricingCard';
import { ArticleCard } from '../components/Landing/ArticleCard';
import LoginModal from '../components/Auth/LoginModal';

import { HowItWorks } from '../components/Landing/HowItWorks';
import { FAQ } from '../components/Landing/FAQ';
import {
  ArrowRight,
  ChevronDown,
  Users,
  User,
  Menu,
  X
} from 'lucide-react';

// 下拉菜单组件
interface DropdownItem {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
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
            <a
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
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const { data: session } = useSession();
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginModalTab, setLoginModalTab] = useState<'login' | 'signup'>('login');

  // 导航菜单数据
  const aboutItems: DropdownItem[] = [
    { label: 'Our Story', description: 'Why we built Qimi AI', href: '/about', icon: <Users size={20} /> },
    { label: "Founder's Letter", description: 'A personal message from James', href: '/founder', icon: <User size={20} /> },
  ];

  // 获取全球注册用户数（小程序 + 网页版）
  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/user-stats');
      const data = await response.json();
      if (data.success) {
        setWaitlistCount(data.count);
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, []);

  // 处理登录后的自动订阅 (Preserved Logic)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const subscribed = urlParams.get('subscribed');

    if (subscribed === 'true' && session?.user?.email) {
      fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.user.email,
          name: session.user.name || '',
          source: 'google_login',
        }),
      }).then(response => response.json())
        .then(data => {
          if (data.success) {
            alert('Welcome! You\'ve been added to our waitlist.');
            fetchUserStats();
          }
        })
        .catch(error => console.error('Auto-subscription error:', error));

      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [session]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-primary-teal/20">
      <Head>
        <title>Qimi AI - Empowering Every ADHD Family</title>
        <meta name="description" content="Your 24/7 AI copilot for IEPs, routines, and emotional regulation." />
      </Head>

      {/* Navbar */}
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
              <a href="/" className="hidden md:flex items-center gap-2 hover:opacity-80 transition-opacity">
                <img src="/logo.svg" alt="Qimi AI" className="h-10 w-auto" />
              </a>
            </div>
            {/* Center: Logo (mobile) / Nav (desktop) */}
            <div className="flex items-center justify-center">
              <a href="/" className="md:hidden flex items-center gap-2 hover:opacity-80 transition-opacity">
                <img src="/logo.svg" alt="Qimi AI" className="h-10 w-auto" />
              </a>
              <div className="hidden md:flex items-center gap-6">
                <a href="/chat" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                  AI Parenting Assistant
                </a>
                <a href="/blog" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                  ADHD Insights
                </a>
                <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Pricing</a>
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
                <a href="/dashboard" className="text-sm font-bold text-slate-900 hover:text-primary-purple">
                  Go to Dashboard
                </a>
              ) : (
                <>
                  {/* Live Counter - Always visible with context */}
                  <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-slate-50 rounded-full border border-slate-100">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs font-medium text-slate-600">
                      <span className="font-bold text-slate-900">{waitlistCount.toLocaleString()}</span> families empowered
                    </span>
                  </div>

                  <button onClick={() => { setLoginModalTab('login'); setLoginModalOpen(true); }} className="hidden md:block text-sm font-medium text-slate-600 hover:text-slate-900">Log in</button>
                  <button onClick={() => { setLoginModalTab('signup'); setLoginModalOpen(true); }} className="hidden md:block px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors">
                    Sign up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu drawer */}
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
              <a
                href="/"
                className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </a>
              <a
                href="/chat"
                className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                AI Parenting Assistant
              </a>
              <a
                href="/blog"
                className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                ADHD Insights
              </a>
              <a
                href="#pricing"
                className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </a>
              <a
                href="/about"
                className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                About Us
              </a>
              <a
                href="/founder"
                className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Founder&apos;s Letter
              </a>

              <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
                <button
                  onClick={() => { setMobileMenuOpen(false); setLoginModalTab('login'); setLoginModalOpen(true); }}
                  className="w-full px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg text-left"
                >
                  Log in
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); setLoginModalTab('signup'); setLoginModalOpen(true); }}
                  className="w-full px-4 py-3 rounded-lg bg-slate-900 text-white text-base font-bold hover:bg-slate-800 transition-colors"
                >
                  Sign up
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main>
        {/* 1. Hero Section */}
        <Hero />

        {/* Social Proof moved inside Hero */}



        {/* 4. How It Works (New) */}
        <div id="how-it-works">
          <HowItWorks />
        </div>

        {/* 5. Resources Section */}
        <section id="resources" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Latest from the Library</h2>
                <p className="text-slate-600">Expert insights and practical guides.</p>
              </div>
              <a href="#" className="hidden md:flex items-center font-bold text-primary-purple hover:text-primary-teal transition-colors">
                View all resources <ArrowRight size={20} className="ml-2" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <ArticleCard
                category="Education"
                title="5 Signs Your Child Needs an IEP Update"
                excerpt="How to spot when current accommodations aren't working and what to do about it."
                readTime="5 min read"
                imageGradient="bg-gradient-to-br from-blue-100 to-cyan-50"
              />
              <ArticleCard
                category="Lifestyle"
                title="The Dopamine Menu: A Guide"
                excerpt="Creating healthy stimulation sources for the ADHD brain to prevent boredom-seeking behaviors."
                readTime="8 min read"
                imageGradient="bg-gradient-to-br from-purple-100 to-pink-50"
              />
              <ArticleCard
                category="Science"
                title="Sleep & Executive Function"
                excerpt="Why rest is the foundation of focus, and realistic strategies to improve it."
                readTime="6 min read"
                imageGradient="bg-gradient-to-br from-teal-100 to-emerald-50"
              />
            </div>
          </div>
        </section>

        {/* 6. Pricing Section */}
        <section id="pricing" className="py-24 bg-slate-50 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Simple, transparent pricing</h2>
              <p className="text-lg text-slate-600">Start for free, upgrade when you need more power.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <PricingCard
                title="Free Starter"
                price="$0"
                period="/month"
                features={[
                  "Basic Chat Support",
                  "Access to Community Library",
                  "3 Routine Templates",
                  "Weekly Newsletter"
                ]}
                ctaText="Get Started Free"
                onCtaClick={() => signIn('google', { callbackUrl: '/dashboard' })}
              />
              <PricingCard
                title="Family Pro"
                price="$19"
                period="/month"
                isPopular={true}
                features={[
                  "Unlimited AI Chat",
                  "Advanced IEP Generator",
                  "Custom Visual Schedules",
                  "Priority Support",
                  "Parent Coaching Modules"
                ]}
                ctaText="Start 14-Day Trial"
                onCtaClick={() => signIn('google', { callbackUrl: '/dashboard' })}
              />
            </div>
          </div>
        </section>

        {/* 7. FAQ (New) */}
        <FAQ />

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
                  <li><a href="#how-it-works" className="hover:text-white transition-colors">Features</a></li>
                  <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-4">Company</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="/about" className="hover:text-white transition-colors">About Us</a></li>
                  <li><a href="/founder" className="hover:text-white transition-colors">Founder's Story</a></li>
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
      </main>

      {/* Login Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        defaultTab={loginModalTab}
      />
    </div>
  );
}
