import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { BookOpen, Calendar } from 'lucide-react';
import LandingLayout from '@/components/Landing/LandingLayout';
import { getPublicArticleBySlug, type PublicBlogArticle } from '@/lib/blog';
import { SITE_NAME } from '@/lib/site-config';

type Props = { article: PublicBlogArticle };

export const getServerSideProps: GetServerSideProps<Props> = async ({ params, res }) => {
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { notFound: true };
  try {
    const article = await getPublicArticleBySlug(slug);
    if (!article) return { notFound: true };
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
    return { props: { article } };
  } catch (error) {
    console.error('[blog/slug] Article query failed', error);
    throw error;
  }
};

export default function BlogArticlePage({ article }: Props) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    mainEntityOfPage: article.canonicalUrl,
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME },
    ...(article.imageUrl ? { image: [article.imageUrl] } : {}),
  };

  return (
    <LandingLayout>
      <Head>
        <title>{article.seoTitle}</title>
        <meta name="description" content={article.seoDescription} />
        <link rel="canonical" href={article.canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={article.seoTitle} />
        <meta property="og:description" content={article.seoDescription} />
        <meta property="og:url" content={article.canonicalUrl} />
        <meta property="og:site_name" content={SITE_NAME} />
        {article.imageUrl && <meta property="og:image" content={article.imageUrl} />}
        <meta name="twitter:card" content={article.imageUrl ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={article.seoTitle} />
        <meta name="twitter:description" content={article.seoDescription} />
        {article.imageUrl && <meta name="twitter:image" content={article.imageUrl} />}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      </Head>
      <main className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white min-h-screen">
        <article className="max-w-3xl mx-auto">
          <Link href="/blog" className="inline-flex mb-8 text-primary-purple hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-teal">Back to Blog</Link>
          <header className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-teal mb-3">{article.category}</p>
            <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">{article.title}</h1>
            <p className="text-lg text-slate-600 mb-4">{article.excerpt}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span>{article.author}</span>
              <time dateTime={article.publishedAt} className="inline-flex items-center gap-2"><Calendar size={15} aria-hidden="true" />{new Date(article.publishedAt).toLocaleDateString('en-US', { dateStyle: 'long' })}</time>
            </div>
          </header>
          {article.imageUrl ? <img src={article.imageUrl} alt="" className="w-full max-h-[28rem] object-cover rounded-2xl mb-8" /> : <div className="h-56 rounded-2xl mb-8 flex items-center justify-center bg-primary-teal/10"><BookOpen size={72} className="text-primary-teal" aria-hidden="true" /></div>}
          <div
            className="bg-white rounded-2xl p-6 md:p-10 shadow-sm border border-slate-100 prose prose-lg max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-a:text-primary-purple prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: article.contentHtml }}
          />
        </article>
      </main>
    </LandingLayout>
  );
}
