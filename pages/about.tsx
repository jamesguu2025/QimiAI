import Head from 'next/head';
import Link from 'next/link';
import {
  Target,
  Brain,
  Heart,
  CheckCircle,
  Users,
  Sparkles,
  Bookmark,
  LayoutList
} from 'lucide-react';
import LandingLayout from '../components/Landing/LandingLayout';

export default function About() {
  return (
    <LandingLayout>
      <Head>
        <title>Our Story - Qimi AI | ADHD Family Support Platform</title>
        <meta name="description" content="Learn why Qimi AI was created: to help parents turn complex ADHD questions and scattered advice into clear, practical next steps." />
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
              Why <span className="bg-gradient-to-r from-primary-teal to-primary-purple bg-clip-text text-transparent">Qimi AI</span> Was Built
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
              To help parents turn complicated questions, scattered advice, and hard-won family experience into practical next steps.
            </p>
          </div>

          {/* Origin Story */}
          <div className="mb-16 border-y border-slate-200 py-10 md:py-12">
            <div className="max-w-3xl mx-auto space-y-5 text-lg leading-relaxed text-slate-700">
              <p>
                Families supporting a child with ADHD often receive useful information from many places: conversations with teachers, clinicians, coaches, other parents, and their own daily observations. The difficult part is turning all of it into something clear enough to use on a busy weekday.
              </p>
              <p>
                Qimi AI was created to make that next step easier. It gives parents a place to think through a challenge, save the strategies that matter, and organize those saved ideas into a focused plan they can review with the people supporting their child.
              </p>
              <p>
                Qimi does not replace professional care or make decisions for a family. Its role is to help parents ask better questions, preserve useful context, and move from information to action with greater clarity.
              </p>
            </div>
          </div>

          {/* Mission Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 hover:shadow-lg hover:border-primary-teal/20 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-teal/10 to-primary-purple/10 flex items-center justify-center mb-4">
                <Target size={24} className="text-primary-purple" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Our Mission</h3>
              <p className="text-slate-600 leading-relaxed">
                Help parents make sense of complex ADHD-related challenges and turn useful conversations into clear, realistic actions that fit family life.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 hover:shadow-lg hover:border-primary-teal/20 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-teal/10 to-primary-purple/10 flex items-center justify-center mb-4">
                <Brain size={24} className="text-primary-purple" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Our Approach</h3>
              <p className="text-slate-600 leading-relaxed">
                Qimi combines evidence-informed guidance with the family context you choose to share and save. It helps organize source material without presenting assumptions as facts, and keeps parents in control of what becomes part of a plan.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 hover:shadow-lg hover:border-primary-teal/20 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-teal/10 to-primary-purple/10 flex items-center justify-center mb-4">
                <Heart size={24} className="text-primary-purple" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Parent Support</h3>
              <p className="text-slate-600 leading-relaxed">
                Parenting decisions can carry emotional, practical, and school-related pressure. Qimi provides a calm space to work through one challenge at a time and prepare for conversations with teachers, clinicians, and family members.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 hover:shadow-lg hover:border-primary-teal/20 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-teal/10 to-primary-purple/10 flex items-center justify-center mb-4">
                <CheckCircle size={24} className="text-primary-purple" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Plans You Can Return To</h3>
              <p className="text-slate-600 leading-relaxed">
                Save useful strategies from conversations, combine related items across topics, and turn them into a readable visual plan. The original saved material remains visible so families can review where each part came from.
              </p>
            </div>
          </div>

          {/* What We Offer Section */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 md:p-12 text-white mb-16">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">What We Offer</h2>
              <p className="text-slate-300">A focused set of tools for turning questions into next steps</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <Sparkles size={28} className="text-primary-teal mb-4" />
                <h4 className="font-bold text-lg mb-2">Guided Conversations</h4>
                <p className="text-slate-300 text-sm">Explore a parenting question, clarify the situation, and identify practical options without treating AI as professional care.</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <Bookmark size={28} className="text-primary-teal mb-4" />
                <h4 className="font-bold text-lg mb-2">Saved Strategies</h4>
                <p className="text-slate-300 text-sm">Keep the ideas that matter, organize them by topic, and return to the original context when you need it.</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <LayoutList size={28} className="text-primary-teal mb-4" />
                <h4 className="font-bold text-lg mb-2">Visual Growth Plans</h4>
                <p className="text-slate-300 text-sm">Combine selected saved plans into a structured view of what to do, when to do it, and what to revisit later.</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-gradient-to-r from-primary-teal/5 to-primary-purple/5 rounded-3xl p-8 md:p-12 border border-primary-teal/10">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
              Start With One Question
            </h2>
            <p className="text-slate-600 mb-8 max-w-xl mx-auto">
              Bring the challenge that is on your mind today. Qimi can help you organize what you know and decide what to explore next.
            </p>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-primary-teal to-primary-purple text-white font-bold text-lg hover:shadow-lg hover:scale-105 transition-all"
            >
              Start with Qimi
            </Link>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
}
