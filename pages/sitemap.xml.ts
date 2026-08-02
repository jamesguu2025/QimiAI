import type { GetServerSideProps } from 'next';
import { listIndexableArticles, type PublicBlogArticle } from '@/lib/blog';
import { SITEMAP_STATIC_ROUTES, absoluteUrl } from '@/lib/site-config';
import { buildSitemap } from '@/lib/sitemap-contract';

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  let articles: PublicBlogArticle[] = [];
  try {
    articles = await listIndexableArticles();
  } catch (error) {
    console.error('[sitemap] Blog query failed', error);
  }
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  res.write(buildSitemap(SITEMAP_STATIC_ROUTES, articles, absoluteUrl));
  res.end();

  return { props: {} };
};

export default function Sitemap() {
  return null;
}
