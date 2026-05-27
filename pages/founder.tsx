import Head from 'next/head';
import Link from 'next/link';
import {
  GraduationCap,
  Rocket,
  Users,
  User,
  ExternalLink
} from 'lucide-react';
import LandingLayout from '../components/Landing/LandingLayout';

export default function Founder() {
  return (
    <LandingLayout>
      <Head>
        <title>Meet the Founder - Qimi AI | James Guu</title>
        <meta name="description" content="Meet James Guu, founder of Qimi AI - a 36-year-old ADHD adult, experienced educator, and serial entrepreneur helping families worldwide." />
      </Head>

      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white min-h-screen">
        <div className="max-w-5xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4 bg-primary-teal/10 text-primary-teal">
              <User size={16} />
              Founder&apos;s Story
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
              Meet the <span className="bg-gradient-to-r from-primary-teal to-primary-purple bg-clip-text text-transparent">Founder</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
              James Guu - From ADHD child to successful entrepreneur, helping families worldwide.
            </p>
          </div>

          {/* Founder Profile Section */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-16">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Photo Side */}
              <div className="bg-gradient-to-br from-primary-teal/10 to-primary-purple/10 p-8 lg:p-12 flex items-center justify-center">
                <div className="relative">
                  <div className="w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-xl">
                    <img
                      src="/james-family.jpg"
                      alt="James Guu with family"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-lg px-4 py-2">
                    <span className="text-sm font-bold text-slate-900">Founder & CEO</span>
                  </div>
                </div>
              </div>

              {/* Info Side */}
              <div className="p-8 lg:p-12">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">James Guu</h2>
                <p className="text-primary-purple font-medium mb-6">Founder & CEO of Qimi AI</p>

                <div className="space-y-4 text-slate-600 leading-relaxed mb-8">
                  <p>
                    James Guu is a 36-year-old ADHD adult, experienced educator, and serial entrepreneur who has helped families across North America and China. As a parent to an ADHD child, he turned years of learning into a practical system that families can apply day by day.
                  </p>
                  <p>
                    James believes every child deserves a path to succeed — and every parent deserves calm, clarity, and support. Qimi AI reflects that mission.
                  </p>
                </div>

                {/* Social Link */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-500 mb-3">Follow James for daily insights:</p>
                  <a
                    href="https://www.tiktok.com/@jamesguu2024"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                  >
                    <ExternalLink size={16} />
                    TikTok: @jamesguu2024
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Credentials Section */}
          <div className="mb-16">
            <h3 className="text-xl font-bold text-slate-900 text-center mb-8">Background & Experience</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-primary-teal/20 transition-all">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-teal/10 to-primary-purple/10 flex items-center justify-center mb-4">
                  <GraduationCap size={24} className="text-primary-purple" />
                </div>
                <h4 className="font-bold text-slate-900 mb-2">Experienced Educator</h4>
                <p className="text-sm text-slate-600">Years of teaching experience with deep understanding of learning processes</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-primary-teal/20 transition-all">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-teal/10 to-primary-purple/10 flex items-center justify-center mb-4">
                  <Rocket size={24} className="text-primary-purple" />
                </div>
                <h4 className="font-bold text-slate-900 mb-2">Serial Entrepreneur</h4>
                <p className="text-sm text-slate-600">Multiple successful ventures across North America and China</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-primary-teal/20 transition-all">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-teal/10 to-primary-purple/10 flex items-center justify-center mb-4">
                  <Users size={24} className="text-primary-purple" />
                </div>
                <h4 className="font-bold text-slate-900 mb-2">ADHD Parent</h4>
                <p className="text-sm text-slate-600">Personal experience raising an ADHD child, understanding the daily challenges</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-gradient-to-r from-primary-teal/5 to-primary-purple/5 rounded-3xl p-8 md:p-12 border border-primary-teal/10">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
              Ready to Join Our Community?
            </h2>
            <p className="text-slate-600 mb-8 max-w-xl mx-auto">
              Be part of the movement that&apos;s transforming ADHD family support.
            </p>
            <Link
              href="/#waitlist"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-primary-teal to-primary-purple text-white font-bold text-lg hover:shadow-lg hover:scale-105 transition-all"
            >
              Join Our Waitlist
            </Link>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
}
