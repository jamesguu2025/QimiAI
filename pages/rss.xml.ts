import type { GetServerSideProps } from 'next';
import { listIndexableArticles } from '@/lib/blog';
import { SITE_NAME, absoluteUrl } from '@/lib/site-config';

function xml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  try {
    const articles = await listIndexableArticles(50);
    const items = articles.map((article) => `<item>
<guid isPermaLink="true">${xml(article.canonicalUrl)}</guid>
<link>${xml(article.canonicalUrl)}</link>
<title>${xml(article.title)}</title>
<description>${xml(article.excerpt)}</description>
<pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>
</item>`).join('\n');
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${xml(`${SITE_NAME} ADHD Blog`)}</title>
<link>${xml(absoluteUrl('/blog'))}</link>
<description>Evidence-informed ADHD articles and practical strategies for families.</description>
${items}
</channel></rss>`;
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
    res.write(body);
    res.end();
    return { props: {} };
  } catch (error) {
    console.error('[rss] Blog query failed', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.end('<?xml version="1.0"?><error>Unable to build feed</error>');
    return { props: {} };
  }
};

export default function Rss() {
  return null;
}
