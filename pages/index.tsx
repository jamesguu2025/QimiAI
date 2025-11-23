import Head from 'next/head';
import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Hero from '../components/Landing/Hero';
import { PricingCard } from '../components/Landing/PricingCard';
import { ArticleCard } from '../components/Landing/ArticleCard';

import { HowItWorks } from '../components/Landing/HowItWorks';
import { FAQ } from '../components/Landing/FAQ';
import {
  ArrowRight
} from 'lucide-react';

export default function Home() {
  const { data: session, status } = useSession();
  const [waitlistCount, setWaitlistCount] = useState(0);

  // 获取等待列表数量 (Preserved Logic)
  const fetchWaitlistCount = async () => {
    try {
      const response = await fetch('/api/waitlist-count');
      const data = await response.json();
      if (data.success) {
        setWaitlistCount(data.count);
      }
    } catch (error) {
      console.error('Failed to fetch waitlist count:', error);
    }
  };

  useEffect(() => {
    fetchWaitlistCount();
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
            fetchWaitlistCount();
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
        <link rel="icon" href="/favicon.svg" />
      </Head>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="Qimi AI" className="h-10 w-auto" />
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">How it Works</a>
              <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Pricing</a>
            </div>
            <div className="flex items-center gap-4">
              {session ? (
                <a href="/dashboard" className="text-sm font-bold text-slate-900 hover:text-primary-purple">
                  Go to Dashboard
                </a>
              ) : (
                <>
                  {/* Live Counter */}
                  <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100 mr-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs font-medium text-slate-600">
                      <span className="font-bold text-slate-900">{waitlistCount.toLocaleString()}</span> families empowered
                    </span>
                  </div>

                  <button onClick={() => signIn()} className="text-sm font-medium text-slate-600 hover:text-slate-900">Log in</button>
                  <button onClick={() => signIn('google', { callbackUrl: '/dashboard' })} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors">
                    Sign up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

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
                  <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Resources</a></li>
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
    </div>
  );
}
