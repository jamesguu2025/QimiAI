import type { GetServerSideProps } from 'next';
import { INDEXABLE_PUBLIC_ROUTES, absoluteUrl } from '@/lib/site-config';
import { listIndexableArticles, type PublicBlogArticle } from '@/lib/blog';

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function buildSitemap(articles: PublicBlogArticle[]): string {
  const staticUrls = [...Array.from(INDEXABLE_PUBLIC_ROUTES), '/blog']
    .map((pathname) => `  <url><loc>${escapeXml(absoluteUrl(pathname))}</loc></url>`);
  const articleUrls = articles.map((article) => `  <url><loc>${escapeXml(article.canonicalUrl)}</loc><lastmod>${escapeXml(article.updatedAt)}</lastmod></url>`);
  const urls = [...staticUrls, ...articleUrls]
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  let articles: PublicBlogArticle[] = [];
  try {
    articles = await listIndexableArticles();
  } catch (error) {
    console.error('[sitemap] Blog query failed', error);
  }
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  res.write(buildSitemap(articles));
  res.end();

  return { props: {} };
};

export default function Sitemap() {
  return null;
}
