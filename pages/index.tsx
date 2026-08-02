import Head from 'next/head';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Hero from '../components/Landing/Hero';
import { PricingCard } from '../components/Landing/PricingCard';
import { ArticleCard } from '../components/Landing/ArticleCard';
import LandingHeader from '@/components/Landing/LandingHeader';
import { SHOW_ADHD_INSIGHTS_HOME, SHOW_PRICING } from '@/components/Landing/landingVisibility';
import { trackClientEvent } from '@/lib/client-analytics';
import { useAuthUIStore } from '@/stores/authUIStore';

import { HowItWorks } from '../components/Landing/HowItWorks';
import { FAQ } from '../components/Landing/FAQ';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  const { openLoginModal } = useAuthUIStore();
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [paperCount, setPaperCount] = useState(0);
  const currentYear = new Date().getFullYear();

  const handleStart = () => {
    trackClientEvent('landing:cta_click', {
      cta_id: 'start',
      cta_location: 'landing',
      destination: session ? '/dashboard' : 'signup_modal',
      auth_state: session ? 'authenticated' : 'guest',
    });

    if (session) {
      router.push('/dashboard');
      return;
    }

    openLoginModal('signup');
  };

  const fetchUserStats = async () => {
    try {
      const [userRes, paperRes] = await Promise.all([
        fetch('/api/user-stats'),
        fetch('/api/rag/stats')
      ]);
      const userData = await userRes.json();
      const paperData = await paperRes.json();
      if (userData.success) {
        setWaitlistCount(userData.count);
      }
      if (paperData.success) {
        setPaperCount(paperData.totalPapers);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, []);

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

      <LandingHeader />

      <main>
        {/* Hero Section */}
        <Hero session={session} userCount={waitlistCount} paperCount={paperCount} />

        {/* How It Works */}
        <div id="how-it-works">
          <HowItWorks />
        </div>

        {/* Resources Section */}
        {SHOW_ADHD_INSIGHTS_HOME && <section id="resources" className="py-24 bg-white">
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
        </section>}

        {/* Pricing Section */}
        {SHOW_PRICING && <section id="pricing" className="py-24 bg-slate-50 overflow-hidden">
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
                onCtaClick={handleStart}
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
                onCtaClick={handleStart}
              />
            </div>
          </div>
        </section>}

        {/* FAQ */}
        <FAQ />

        {/* Footer - xingbanai.cn simplified style */}
        <footer className="bg-slate-900 text-slate-400" style={{ padding: '48px 24px 24px' }}>
          <div className="max-w-[1200px] mx-auto">
            {/* Top: Brand */}
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

            {/* Bottom: Legal + Copyright */}
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
      </main>

    </div>
  );
}
