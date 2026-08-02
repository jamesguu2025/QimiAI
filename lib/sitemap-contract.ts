export interface SitemapArticle {
  canonicalUrl: string;
  updatedAt: string;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function buildSitemap(
  staticRoutes: string[],
  articles: SitemapArticle[],
  absoluteUrl: (pathname: string) => string,
): string {
  const staticUrls = staticRoutes.map(
    (pathname) => `  <url><loc>${escapeXml(absoluteUrl(pathname))}</loc></url>`,
  );
  const articleUrls = articles.map(
    (article) => `  <url><loc>${escapeXml(article.canonicalUrl)}</loc><lastmod>${escapeXml(article.updatedAt)}</lastmod></url>`,
  );
  const urls = [...staticUrls, ...articleUrls].join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}
