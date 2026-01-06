import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  BookOpen,
  Clock,
  Share2,
  Bookmark,
  Tag
} from 'lucide-react';
import LandingLayout from '../../components/Landing/LandingLayout';

// 博客文章数据（后续可改为从 API/CMS 获取）
const blogPosts: Record<string, {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  color: string;
  sourceInfo: string;
  content: string;
}> = {
  'adhd-sleep-research-2025': {
    id: 1,
    slug: 'adhd-sleep-research-2025',
    title: 'ADHD and Sleep: 2025 Research Breakthrough',
    excerpt: 'New studies reveal that improving sleep quality can significantly boost attention in ADHD children.',
    category: 'Research',
    date: 'Jan 3, 2025',
    readTime: '5 min read',
    color: '#6C5CE7',
    sourceInfo: 'Based on Harvard Medical School 2024 research',
    content: `Understanding the connection between sleep and ADHD is crucial for parents looking to support their children's development. Recent research from leading institutions has shed new light on this important relationship.

## Key Findings

A 2024 study conducted by Harvard Medical School found that children with ADHD who maintained consistent sleep schedules showed a **40% improvement** in attention span during daytime activities. This groundbreaking research involved over 500 participants and spanned 18 months.

> 💡 **Key Insight:** Consistent bedtimes are more important than total sleep duration for ADHD children.

## Practical Strategies

- Establish a consistent bedtime routine (30-45 minutes before sleep)
- Reduce screen time at least 1 hour before bed
- Create a cool, dark, and quiet sleep environment
- Consider melatonin supplements (consult your pediatrician first)
- Use weighted blankets for calming sensory input

By implementing these evidence-based strategies, many families have reported significant improvements in their children's focus, mood, and overall behavior.`
  },
  'executive-function-strategies': {
    id: 2,
    slug: 'executive-function-strategies',
    title: "Building Executive Function: A Parent's Guide",
    excerpt: "Executive function is the brain's CEO. Learn practical strategies to help your child develop planning, organization, and self-control skills.",
    category: 'Parenting',
    date: 'Jan 1, 2025',
    readTime: '8 min read',
    color: '#00D4AA',
    sourceInfo: "Based on Dr. Peg Dawson's research",
    content: `Executive function skills are the mental processes that help us plan, focus attention, remember instructions, and juggle multiple tasks successfully.

## What is Executive Function?

Think of executive function as the brain's CEO - it manages and coordinates various cognitive processes. For children with ADHD, these skills often develop more slowly.

## Core Executive Function Skills

1. **Working Memory** - Holding information in mind while using it
2. **Flexible Thinking** - Adapting to new situations
3. **Self-Control** - Managing impulses and emotions

## Strategies to Build These Skills

- Use visual schedules and checklists
- Break tasks into smaller steps
- Practice "stop and think" techniques
- Play strategy games together
- Model organizational strategies`
  },
  'nutrition-focus-connection': {
    id: 3,
    slug: 'nutrition-focus-connection',
    title: 'The Nutrition-Focus Connection in ADHD',
    excerpt: 'Discover how omega-3 fatty acids, protein timing, and blood sugar stability can naturally support attention.',
    category: 'Nutrition',
    date: 'Dec 28, 2024',
    readTime: '6 min read',
    color: '#96CEB4',
    sourceInfo: 'Based on NIH dietary intervention studies',
    content: `What your child eats can significantly impact their ability to focus and regulate behavior. Research shows specific nutrients play key roles in brain function.

## Key Nutrients for ADHD

### Omega-3 Fatty Acids
Studies show children with ADHD often have lower levels of omega-3s. Supplementation has been linked to improved attention in some studies.

### Protein
Protein helps produce neurotransmitters that regulate attention. Include protein at breakfast for better morning focus.

### Iron and Zinc
These minerals are essential for dopamine production. Low levels are associated with more severe ADHD symptoms.

## Practical Tips

- Start the day with a protein-rich breakfast
- Limit sugar and processed foods
- Include fatty fish 2-3 times per week
- Consider a multivitamin after consulting your pediatrician`
  },
  'emotional-regulation-toolkit': {
    id: 4,
    slug: 'emotional-regulation-toolkit',
    title: 'Emotional Regulation Toolkit for ADHD Kids',
    excerpt: 'Big emotions are common in ADHD. This toolkit provides practical techniques to help children manage their feelings.',
    category: 'Emotional Health',
    date: 'Dec 25, 2024',
    readTime: '7 min read',
    color: '#FF6B6B',
    sourceInfo: 'Based on Yale RULER approach research',
    content: `Children with ADHD often experience emotions more intensely and have difficulty regulating their responses. This is a core part of ADHD, not a behavior problem.

## Understanding Emotional Dysregulation

The ADHD brain has differences in the prefrontal cortex, which manages emotional responses. This means big feelings can feel overwhelming.

## The RULER Approach

1. **Recognize** emotions in yourself and others
2. **Understand** the causes and consequences
3. **Label** emotions accurately
4. **Express** emotions appropriately
5. **Regulate** emotions effectively

## Practical Tools

- Create a "calm down corner" at home
- Use feeling thermometers to identify emotion intensity
- Practice deep breathing techniques together
- Develop a personalized calm-down plan
- Validate feelings before problem-solving`
  },
  'iep-advocacy-guide': {
    id: 5,
    slug: 'iep-advocacy-guide',
    title: 'IEP Advocacy: Getting Your Child the Support They Need',
    excerpt: 'Navigate the IEP process with confidence. Learn your rights and how to advocate effectively.',
    category: 'Education',
    date: 'Dec 20, 2024',
    readTime: '10 min read',
    color: '#FDCB6E',
    sourceInfo: 'Based on CHADD advocacy guidelines',
    content: `An Individualized Education Program (IEP) can provide crucial support for students with ADHD. Understanding the process empowers you to advocate effectively.

## Does Your Child Qualify?

ADHD can qualify under "Other Health Impairment" (OHI) if it substantially limits learning. You have the right to request an evaluation.

## Key Accommodations for ADHD

- Extended time on tests
- Preferential seating
- Frequent breaks
- Written instructions
- Check-ins for assignment comprehension
- Use of organizational tools

## Tips for IEP Meetings

1. **Prepare** - Review current IEP, gather work samples, list concerns
2. **Participate** - You are an equal team member
3. **Document** - Take notes or bring someone to help
4. **Follow up** - Get everything in writing

## Your Rights

- Free Appropriate Public Education (FAPE)
- Request evaluations at any time
- Disagree with the school's decisions
- Bring an advocate to meetings`
  }
};

export default function BlogPost() {
  const router = useRouter();
  const { slug } = router.query;

  // 处理动态路由加载
  if (!slug || typeof slug !== 'string') {
    return (
      <LandingLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-slate-400">Loading...</div>
        </div>
      </LandingLayout>
    );
  }

  const post = blogPosts[slug];

  // 文章不存在
  if (!post) {
    return (
      <LandingLayout>
        <div className="min-h-screen flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Article Not Found</h1>
          <Link href="/blog" className="text-primary-purple hover:underline">
            ← Back to Blog
          </Link>
        </div>
      </LandingLayout>
    );
  }

  // 获取相关文章
  const relatedPosts = Object.values(blogPosts)
    .filter(p => p.slug !== slug)
    .slice(0, 2);

  return (
    <LandingLayout>
      <Head>
        <title>{post.title} - Qimi AI Blog</title>
        <meta name="description" content={post.excerpt} />
      </Head>

      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white min-h-screen">
        <div className="max-w-3xl mx-auto">
          {/* 文章头部 */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                style={{ background: post.color }}
              >
                {post.category}
              </span>
              <span className="text-sm text-slate-400">{post.date}</span>
              <span className="text-sm text-slate-400">•</span>
              <span className="text-sm text-slate-400 flex items-center gap-1">
                <Clock size={14} />
                {post.readTime}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {post.title}
            </h1>
            <p className="text-lg text-slate-600">
              {post.excerpt}
            </p>
          </div>

          {/* 文章封面 */}
          <div
            className="h-64 rounded-2xl mb-8 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${post.color}20 0%, ${post.color}40 100%)` }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen size={80} style={{ color: post.color, opacity: 0.3 }} />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3 mb-8">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
              <Share2 size={16} />
              Share
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
              <Bookmark size={16} />
              Save
            </button>
          </div>

          {/* 文章内容 */}
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 mb-8">
            <div className="prose prose-lg max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700 prose-blockquote:border-primary-teal prose-blockquote:bg-primary-teal/5 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg">
              {post.content.split('\n\n').map((paragraph, index) => {
                // 处理标题
                if (paragraph.startsWith('## ')) {
                  return (
                    <h2 key={index} className="text-xl font-bold mt-8 mb-4">
                      {paragraph.replace('## ', '')}
                    </h2>
                  );
                }
                if (paragraph.startsWith('### ')) {
                  return (
                    <h3 key={index} className="text-lg font-semibold mt-6 mb-3">
                      {paragraph.replace('### ', '')}
                    </h3>
                  );
                }
                // 处理引用
                if (paragraph.startsWith('>')) {
                  return (
                    <div key={index} className="rounded-xl p-4 my-6 bg-primary-teal/10 border-l-4 border-primary-teal">
                      <p className="text-sm font-medium text-primary-teal m-0">
                        {paragraph.replace('> ', '')}
                      </p>
                    </div>
                  );
                }
                // 处理列表
                if (paragraph.startsWith('- ') || paragraph.startsWith('1. ')) {
                  const items = paragraph.split('\n').filter(item => item.trim());
                  const isOrdered = paragraph.startsWith('1. ');
                  const ListTag = isOrdered ? 'ol' : 'ul';
                  return (
                    <ListTag key={index} className={`my-4 ${isOrdered ? 'list-decimal' : 'list-disc'} pl-6 space-y-2`}>
                      {items.map((item, i) => (
                        <li key={i}>{item.replace(/^[-\d.]\s*/, '')}</li>
                      ))}
                    </ListTag>
                  );
                }
                // 普通段落
                return (
                  <p key={index} className="mb-4 leading-relaxed">
                    {paragraph}
                  </p>
                );
              })}
            </div>
          </div>

          {/* 来源信息 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-8">
            <div className="flex items-start gap-3">
              <Tag size={20} className="text-primary-teal flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">Source Information</h4>
                <p className="text-sm text-slate-600">{post.sourceInfo}</p>
                <p className="text-xs text-slate-400 mt-2">
                  This article has been AI-rewritten for clarity while maintaining factual accuracy.
                </p>
              </div>
            </div>
          </div>

          {/* 相关文章 */}
          <div>
            <h3 className="font-bold text-lg text-slate-900 mb-4">Related Articles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.id}
                  href={`/blog/${relatedPost.slug}`}
                  className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 transition-all hover:shadow-md flex gap-4"
                >
                  <div
                    className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{ background: `${relatedPost.color}20` }}
                  >
                    <BookOpen size={24} style={{ color: relatedPost.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-slate-900 line-clamp-2 mb-1">
                      {relatedPost.title}
                    </h4>
                    <span className="text-xs text-slate-400">{relatedPost.readTime}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
}
