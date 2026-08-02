import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { BookOpen, Calendar, ChevronRight } from 'lucide-react';
import LandingLayout from '@/components/Landing/LandingLayout';
import { listPublicArticles, type PublicBlogArticle } from '@/lib/blog';

type Props = { articles: PublicBlogArticle[] };

export const getServerSideProps: GetServerSideProps<Props> = async ({ res }) => {
  try {
    const articles = await listPublicArticles(50);
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
    return { props: { articles } };
  } catch (error) {
    console.error('[blog] Listing query failed', error);
    res.setHeader('Cache-Control', 'no-store');
    return { props: { articles: [] } };
  }
};

export default function BlogPage({ articles }: Props) {
  return (
    <LandingLayout>
      <Head>
        <title>ADHD Blog | Qimi AI</title>
        <meta name="description" content="Evidence-informed ADHD articles and practical strategies for families." />
      </Head>
      <main className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white min-h-screen">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4 bg-primary-teal/10 text-primary-teal">
              <BookOpen size={16} aria-hidden="true" />
              Research and insights
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">ADHD Knowledge Hub</h1>
            <p className="text-lg text-slate-600">Evidence-informed articles and practical strategies for ADHD families.</p>
          </div>

          {articles.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">No published articles are available yet. Please check back soon.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {articles.map((article) => (
                <Link key={article.id} href={`/blog/${article.slug}`} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-teal">
                  {article.imageUrl ? (
                    <img src={article.imageUrl} alt="" className="h-44 w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-44 flex items-center justify-center bg-primary-teal/10"><BookOpen size={48} className="text-primary-teal" aria-hidden="true" /></div>
                  )}
                  <div className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary-teal mb-2">{article.category}</p>
                    <h2 className="font-bold text-lg text-slate-900 mb-2">{article.title}</h2>
                    <p className="text-sm text-slate-600 mb-4">{article.excerpt}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <time dateTime={article.publishedAt} className="flex items-center gap-1"><Calendar size={12} aria-hidden="true" />{new Date(article.publishedAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}</time>
                      <ChevronRight size={16} aria-hidden="true" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </LandingLayout>
  );
}
