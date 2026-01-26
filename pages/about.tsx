import Head from 'next/head';
import {
  Target,
  Brain,
  Heart,
  CheckCircle,
  Users,
  Sparkles,
  BookOpen,
  Calendar
} from 'lucide-react';
import LandingLayout from '../components/Landing/LandingLayout';

export default function About() {
  return (
    <LandingLayout>
      <Head>
        <title>About Us - Qimi AI | ADHD Family Support Platform</title>
        <meta name="description" content="Learn about Qimi AI - an ADHD family support platform built by parents, for parents. Practical guidance for real family life." />
      </Head>

      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white min-h-screen">
        <div className="max-w-5xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4 bg-primary-teal/10 text-primary-teal">
              <Users size={16} />
              Our Story
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
              About <span className="bg-gradient-to-r from-primary-teal to-primary-purple bg-clip-text text-transparent">Qimi AI</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
              Built by parents, for parents. Practical guidance that fits real family life.
            </p>
          </div>

          {/* Mission Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 hover:shadow-lg hover:border-primary-teal/20 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-teal/10 to-primary-purple/10 flex items-center justify-center mb-4">
                <Target size={24} className="text-primary-purple" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Our Mission</h3>
              <p className="text-slate-600 leading-relaxed">
                Qimi AI is an ADHD family support platform built by parents, for parents. We provide practical, step-by-step guidance that fits real family life — from emotional support for parents to daily action plans for children, covering learning, exercise, nutrition, sleep, and routines.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 hover:shadow-lg hover:border-primary-teal/20 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-teal/10 to-primary-purple/10 flex items-center justify-center mb-4">
                <Brain size={24} className="text-primary-purple" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Our Approach</h3>
              <p className="text-slate-600 leading-relaxed">
                Our approach blends evidence-based psychology with insights from traditional Chinese wellness, translated into actionable, trackable routines. Qimi AI learns your family&apos;s rhythm and adapts recommendations over time to help you build sustainable habits that actually work.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 hover:shadow-lg hover:border-primary-teal/20 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-teal/10 to-primary-purple/10 flex items-center justify-center mb-4">
                <Heart size={24} className="text-primary-purple" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Parent Support</h3>
              <p className="text-slate-600 leading-relaxed">
                We understand the emotional toll of parenting an ADHD child. Our platform provides emotional wellness strategies to help parents manage stress from children, work, family, and school pressures.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 hover:shadow-lg hover:border-primary-teal/20 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-teal/10 to-primary-purple/10 flex items-center justify-center mb-4">
                <CheckCircle size={24} className="text-primary-purple" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Comprehensive Plans</h3>
              <p className="text-slate-600 leading-relaxed">
                Evidence-based strategies covering learning, exercise, nutrition, and daily routines to help your child thrive. Every plan is tailored to your family&apos;s unique needs and circumstances.
              </p>
            </div>
          </div>

          {/* What We Offer Section */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 md:p-12 text-white mb-16">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">What We Offer</h2>
              <p className="text-slate-300">Comprehensive tools designed for ADHD families</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <Sparkles size={28} className="text-primary-teal mb-4" />
                <h4 className="font-bold text-lg mb-2">AI-Powered Guidance</h4>
                <p className="text-slate-300 text-sm">24/7 personalized support that understands your family&apos;s unique challenges</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <BookOpen size={28} className="text-primary-teal mb-4" />
                <h4 className="font-bold text-lg mb-2">IEP Assistance</h4>
                <p className="text-slate-300 text-sm">Generate and review IEP documents with expert guidance</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <Calendar size={28} className="text-primary-teal mb-4" />
                <h4 className="font-bold text-lg mb-2">Routine Builder</h4>
                <p className="text-slate-300 text-sm">Create visual schedules that help children succeed every day</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-gradient-to-r from-primary-teal/5 to-primary-purple/5 rounded-3xl p-8 md:p-12 border border-primary-teal/10">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
              Ready to Transform Your Family&apos;s Journey?
            </h2>
            <p className="text-slate-600 mb-8 max-w-xl mx-auto">
              Join thousands of families who are already building better habits with Qimi AI.
            </p>
            <a
              href="/#waitlist"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-primary-teal to-primary-purple text-white font-bold text-lg hover:shadow-lg hover:scale-105 transition-all"
            >
              Join Our Waitlist
            </a>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
}
