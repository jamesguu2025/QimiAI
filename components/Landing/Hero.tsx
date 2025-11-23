
import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, MessageCircle, BookOpen, Heart } from 'lucide-react';

const Hero = () => {
  const [hoveredChip, setHoveredChip] = useState<string | null>(null);

  const chips = [
    {
      id: 'coach',
      icon: <MessageCircle className="w-5 h-5" />,
      label: '24/7 ADHD Parenting Coach',
      description: 'Instant, personalized guidance for your daily parenting challenges.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
      hoverBorder: 'group-hover:border-blue-200',
      hoverShadow: 'group-hover:shadow-blue-100'
    },
    {
      id: 'expert',
      icon: <BookOpen className="w-5 h-5" />,
      label: 'Expert Knowledge',
      description: 'Science-backed strategies from leading ADHD research and specialists.',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100',
      hoverBorder: 'group-hover:border-purple-200',
      hoverShadow: 'group-hover:shadow-purple-100'
    },
    {
      id: 'emotion',
      icon: <Heart className="w-5 h-5" />,
      label: 'Emotional Support',
      description: 'A judgment-free space to vent, recharge, and find your balance.',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-100',
      hoverBorder: 'group-hover:border-teal-200',
      hoverShadow: 'group-hover:shadow-teal-100'
    },
  ];

  return (
    <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary-purple/20 blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-primary-teal/20 blur-[100px] animate-pulse delay-700" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

        {/* Badge */}
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/50 backdrop-blur-sm border border-slate-200 shadow-sm mb-8 animate-fade-in-up">
          <span className="w-2 h-2 rounded-full bg-primary-teal mr-2 animate-pulse" />
          <span className="text-sm font-medium text-slate-600">New: Emotional Support Module is Live</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-8 animate-fade-in-up delay-100">
          Empowering Every <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-teal to-primary-purple">
            ADHD Family
          </span>
        </h1>

        {/* Interactive Feature Chips (Premium Glass Capsules) */}
        <div className="relative z-10 flex flex-wrap justify-center gap-4 mb-12 animate-fade-in-up delay-200 max-w-5xl mx-auto">
          {chips.map((chip) => (
            <div
              key={chip.id}
              className={`group relative flex items-center gap-3 px-5 py-3 rounded-full border transition-all duration-300 cursor-default bg-white shadow-sm hover:scale-105 hover:shadow-lg ${chip.hoverBorder} ${chip.hoverShadow}`}
              onMouseEnter={() => setHoveredChip(chip.id)}
              onMouseLeave={() => setHoveredChip(null)}
            >
              {/* Icon Bubble */}
              <div className={`flex items - center justify - center w - 8 h - 8 rounded - full ${chip.bgColor} ${chip.color} transition - transform duration - 300 group - hover: scale - 110`}>
                {chip.icon}
              </div>

              {/* Label */}
              <span className="font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                {chip.label}
              </span>

              {/* Description Tooltip (Floating below) */}
              <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-6 w-64 p-4 bg-white rounded-xl shadow-xl border border-slate-100 text-left z-50 transition-all duration-200 ${hoveredChip === chip.id ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
                }`}>
                <div className={`absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t border-l border-slate-100 transform rotate-45`} />
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  {chip.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up delay-300">
          <Link href="/api/auth/signin" className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white transition-all duration-200 bg-slate-900 rounded-full hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900">
            Get Started
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Dashboard Preview */}
        <div className="relative mx-auto max-w-5xl animate-fade-in-up delay-500">
          <div className="relative rounded-2xl border border-slate-200 bg-white/50 backdrop-blur-xl shadow-2xl overflow-hidden p-2">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/50 to-transparent pointer-events-none z-10" />

            {/* Browser Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-white/80">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="ml-4 flex-1 max-w-xl mx-auto">
                <div className="h-6 rounded-md bg-slate-100/50 w-full" />
              </div>
            </div>

            {/* Image Container */}
            <div className="relative aspect-[16/10] bg-slate-50 overflow-hidden">
              <img
                src="/dashboard-preview.png"
                alt="Qimi AI Dashboard Interface"
                className="w-full h-full object-cover object-top transform hover:scale-[1.01] transition-transform duration-700"
              />
            </div>
          </div>

          {/* Decorative Elements around image */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-primary-purple/30 rounded-full blur-3xl -z-10 animate-pulse" />
          <div className="absolute -left-12 -top-12 w-64 h-64 bg-primary-teal/30 rounded-full blur-3xl -z-10 animate-pulse delay-1000" />
        </div>
      </div>
    </div>
  );
};

export default Hero;

