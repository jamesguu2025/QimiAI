import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  ChevronRight
} from 'lucide-react';
import LandingLayout from '../../components/Landing/LandingLayout';

// 博客文章数据
const blogPosts = [
  {
    id: 1,
    slug: 'adhd-sleep-research-2025',
    title: 'ADHD and Sleep: 2025 Research Breakthrough',
    excerpt: 'New studies reveal that improving sleep quality can significantly boost attention in ADHD children. Harvard researchers found a 40% improvement in focus after implementing structured bedtime routines.',
    category: 'Research',
    date: 'Jan 3, 2025',
    readTime: '5 min read',
    color: '#6C5CE7',
  },
  {
    id: 2,
    slug: 'executive-function-strategies',
    title: "Building Executive Function: A Parent's Guide",
    excerpt: "Executive function is the brain's CEO. Learn practical strategies to help your child develop planning, organization, and self-control skills through everyday activities.",
    category: 'Parenting',
    date: 'Jan 1, 2025',
    readTime: '8 min read',
    color: '#00D4AA',
  },
  {
    id: 3,
    slug: 'nutrition-focus-connection',
    title: 'The Nutrition-Focus Connection in ADHD',
    excerpt: 'Discover how omega-3 fatty acids, protein timing, and blood sugar stability can naturally support attention and reduce hyperactivity symptoms in children.',
    category: 'Nutrition',
    date: 'Dec 28, 2024',
    readTime: '6 min read',
    color: '#96CEB4',
  },
  {
    id: 4,
    slug: 'emotional-regulation-toolkit',
    title: 'Emotional Regulation Toolkit for ADHD Kids',
    excerpt: 'Big emotions are common in ADHD. This evidence-based toolkit provides 10 practical techniques to help children identify, express, and manage their feelings.',
    category: 'Emotional Health',
    date: 'Dec 25, 2024',
    readTime: '7 min read',
    color: '#FF6B6B',
  },
  {
    id: 5,
    slug: 'iep-advocacy-guide',
    title: 'IEP Advocacy: Getting Your Child the Support They Need',
    excerpt: 'Navigate the IEP process with confidence. Learn key accommodations for ADHD students, how to prepare for meetings, and your rights as a parent advocate.',
    category: 'Education',
    date: 'Dec 20, 2024',
    readTime: '10 min read',
    color: '#FDCB6E',
  },
];

const categories = ['All', 'Research', 'Parenting', 'Nutrition', 'Emotional Health', 'Education'];

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredPosts = activeCategory === 'All'
    ? blogPosts
    : blogPosts.filter(post => post.category === activeCategory);

  return (
    <LandingLayout>
      <Head>
        <title>Blog - Qimi AI | ADHD Knowledge Hub</title>
        <meta name="description" content="Evidence-based articles, research summaries, and practical strategies for ADHD families." />
      </Head>

      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white min-h-screen">
        <div className="max-w-5xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4 bg-primary-teal/10 text-primary-teal">
              <BookOpen size={16} />
              Research & Insights
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              ADHD Knowledge Hub
            </h1>
            <p className="text-lg text-slate-600">
              Evidence-based articles, research summaries, and practical strategies for ADHD families.
            </p>
          </div>

          {/* 分类筛选 */}
          <div className="flex flex-wrap gap-2 mb-10">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-gradient-to-r from-primary-teal to-primary-purple text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 博客文章列表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredPosts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 transition-all hover:shadow-lg hover:scale-[1.02] hover:border-primary-teal/20"
              >
                {/* 文章封面 */}
                <div
                  className="h-40 relative"
                  style={{ background: `linear-gradient(135deg, ${post.color}20 0%, ${post.color}40 100%)` }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen size={48} style={{ color: post.color, opacity: 0.5 }} />
                  </div>
                  <div className="absolute top-4 left-4">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                      style={{ background: post.color }}
                    >
                      {post.category}
                    </span>
                  </div>
                </div>

                {/* 文章信息 */}
                <div className="p-5">
                  <h3 className="font-bold text-lg text-slate-900 mb-2 line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {post.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {post.readTime}
                      </span>
                    </div>
                    <ChevronRight size={16} style={{ color: post.color }} />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* 加载更多 */}
          <div className="text-center mt-12">
            <button className="px-6 py-3 rounded-xl font-semibold text-slate-600 border-2 border-slate-200 hover:bg-slate-50 transition-colors">
              Load More Articles
            </button>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
}
