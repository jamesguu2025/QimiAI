import React from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, BookOpen, Users, Lightbulb, FileText } from 'lucide-react';
import { Session } from 'next-auth';

interface HeroProps {
  session: Session | null;
  userCount?: number;
}

const features = [
  {
    icon: Clock,
    title: '24/7 Parenting Coach',
    description: 'Late-night anxiety, sudden meltdowns — expert support whenever you need it.',
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-500/10',
  },
  {
    icon: BookOpen,
    title: 'Expert Knowledge Base',
    stat: '10,000+ Studies',
    description: 'Every recommendation backed by peer-reviewed ADHD research.',
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-500/10',
  },
  {
    icon: Users,
    title: 'Personalized Plans',
    description: 'A growth plan unique to your family, precisely matched to your child.',
    iconColor: 'text-primary-teal',
    iconBg: 'bg-primary-teal/10',
  },
  {
    icon: Lightbulb,
    title: 'Adaptive Intelligence',
    description: 'The more you use it, the smarter it gets — every suggestion more precise.',
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-500/10',
  },
  {
    icon: FileText,
    title: 'Progress Tracking',
    description: 'Upload reports, AI extracts structured insights — data at a glance.',
    iconColor: 'text-pink-500',
    iconBg: 'bg-pink-500/10',
  },
];

const Hero = ({ session, userCount = 0 }: HeroProps) => {
  return (
    <section className="min-h-screen flex items-center" style={{ padding: '100px 0 60px' }}>
      <div className="w-full max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 lg:gap-[60px] items-start">
        {/* Left: Introduction */}
        <div className="text-center lg:text-left">
          {/* Headline */}
          <h1 className="font-bold leading-[1.15] mb-4 tracking-[-0.02em]" style={{ fontSize: 'clamp(36px, 6vw, 64px)' }}>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-teal to-primary-purple">
              Empowering Every
            </span>
            <br />
            <span className="text-slate-900">ADHD Family</span>
          </h1>

          {/* Subtitle */}
          <p className="font-medium text-slate-500 mb-10 tracking-[0.05em]" style={{ fontSize: 'clamp(22px, 3.5vw, 32px)' }}>
            Your AI parenting companion
          </p>

          {/* Feature List */}
          <div className="flex flex-col gap-6 mb-8">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-3.5">
                {/* Icon */}
                <div className={`w-11 h-11 rounded-xl ${feature.iconBg} ${feature.iconColor} flex items-center justify-center flex-shrink-0`}>
                  <feature.icon size={22} />
                </div>
                {/* Text */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <span className="text-base font-semibold text-slate-900">{feature.title}</span>
                    {feature.stat && (
                      <span className="text-[13px] font-medium text-primary-teal bg-primary-teal/10 px-2.5 py-0.5 rounded-full">
                        {feature.stat}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Stats + Preview + CTA */}
        <div className="flex flex-col items-center lg:items-end gap-6">
          {/* User Stats Badge */}
          {userCount > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-full text-sm text-slate-600">
              <span className="w-2 h-2 bg-primary-teal rounded-full animate-pulse" />
              <span>
                <strong className="text-slate-900">{userCount.toLocaleString()}</strong> families empowered
              </span>
            </div>
          )}

          {/* Dashboard Preview Card */}
          <div className="bg-white rounded-3xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-slate-100">
            <img
              src="/dashboard-preview.png"
              alt="Qimi AI Dashboard"
              className="w-[280px] lg:w-[320px] rounded-2xl"
            />
          </div>

          {/* CTA Button */}
          <Link
            href="/chat"
            className="group inline-flex items-center justify-center gap-2.5 px-9 py-4 bg-slate-900 text-white text-base font-semibold rounded-full transition-all duration-200 hover:bg-slate-800 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)] w-full max-w-[280px]"
          >
            {session ? 'Continue to Chat' : 'Get Started'}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          <p className="text-[13px] text-slate-400 text-center w-full max-w-[280px]">
            Free to start, no credit card required
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
