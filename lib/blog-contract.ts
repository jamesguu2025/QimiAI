export const BLOG_STATUSES = ['draft', 'published', 'unpublished', 'archived'] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export interface BlogArticleRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_markdown: string;
  status: BlogStatus;
  category: string;
  author: string;
  image_url: string | null;
  canonical_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  is_public: boolean;
  allow_indexing: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdhdFeedItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  updatedAt: string;
  url: string;
  category: 'adhd';
  author: 'Qimi AI';
  imageUrl: string | null;
  status: 'published';
}

export function plainText(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isPublicArticle(row: BlogArticleRow, now = new Date()): boolean {
  if (row.status !== 'published' || !row.is_public || !row.published_at) return false;
  const publishedAt = Date.parse(row.published_at);
  return Number.isFinite(publishedAt) && publishedAt <= now.getTime();
}

export function toAdhdFeedItem(row: BlogArticleRow, articleUrl: (slug: string) => string): AdhdFeedItem {
  return {
    id: row.id,
    slug: row.slug,
    title: plainText(row.title),
    excerpt: plainText(row.excerpt),
    publishedAt: row.published_at!,
    updatedAt: row.updated_at,
    url: articleUrl(row.slug),
    category: 'adhd',
    author: 'Qimi AI',
    imageUrl: row.image_url,
    status: 'published',
  };
}
