import { getSupabaseAdmin } from './supabase';
import { absoluteUrl } from './site-config';
import {
  BLOG_STATUSES,
  isPublicArticle,
  plainText,
  toAdhdFeedItem as buildAdhdFeedItem,
  type AdhdFeedItem,
  type BlogArticleRow,
  type BlogStatus,
} from './blog-contract';

export { BLOG_STATUSES, isPublicArticle, plainText } from './blog-contract';
export type { AdhdFeedItem, BlogArticleRow, BlogStatus } from './blog-contract';

export interface PublicBlogArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  contentMarkdown: string;
  category: string;
  imageUrl: string | null;
  canonicalUrl: string;
  seoTitle: string;
  seoDescription: string;
  publishedAt: string;
  updatedAt: string;
}

const PUBLIC_COLUMNS = 'id, slug, title, excerpt, content_markdown, status, category, author, image_url, canonical_url, seo_title, seo_description, is_public, allow_indexing, published_at, created_at, updated_at';

export function articleUrl(slug: string): string {
  return absoluteUrl(`/blog/${slug}`);
}

export function toPublicArticle(row: BlogArticleRow): PublicBlogArticle {
  // The public route is the source of truth. A stored canonical value is retained
  // for import compatibility but cannot make a Qimi article canonicalize elsewhere.
  const canonical = articleUrl(row.slug);
  return {
    id: row.id,
    slug: row.slug,
    title: plainText(row.title),
    excerpt: plainText(row.excerpt),
    contentMarkdown: row.content_markdown,
    category: plainText(row.category),
    imageUrl: row.image_url,
    canonicalUrl: canonical,
    seoTitle: plainText(row.seo_title || row.title),
    seoDescription: plainText(row.seo_description || row.excerpt),
    publishedAt: row.published_at!,
    updatedAt: row.updated_at,
  };
}

export function toAdhdFeedItem(row: BlogArticleRow): AdhdFeedItem {
  return buildAdhdFeedItem(row, articleUrl);
}

function publicQuery() {
  return getSupabaseAdmin()
    .from('blog_articles')
    .select(PUBLIC_COLUMNS)
    .eq('status', 'published')
    .eq('is_public', true)
    .lte('published_at', new Date().toISOString());
}

export async function listPublicArticles(limit = 50): Promise<PublicBlogArticle[]> {
  const safeLimit = Math.max(0, Math.min(limit, 50));
  const { data, error } = await publicQuery()
    .order('published_at', { ascending: false })
    .limit(safeLimit);
  if (error) throw error;
  return ((data || []) as unknown as BlogArticleRow[]).filter((row) => isPublicArticle(row)).map(toPublicArticle);
}

export async function listIndexableArticles(limit = 1000): Promise<PublicBlogArticle[]> {
  const safeLimit = Math.max(0, Math.min(limit, 1000));
  const { data, error } = await publicQuery()
    .eq('allow_indexing', true)
    .order('published_at', { ascending: false })
    .limit(safeLimit);
  if (error) throw error;
  return ((data || []) as unknown as BlogArticleRow[]).filter((row) => isPublicArticle(row)).map(toPublicArticle);
}

export async function listAdhdFeedItems(limit = 50): Promise<AdhdFeedItem[]> {
  const safeLimit = Math.max(0, Math.min(limit, 50));
  const { data, error } = await publicQuery()
    .eq('category', 'adhd')
    .order('published_at', { ascending: false })
    .limit(safeLimit);
  if (error) throw error;
  return ((data || []) as unknown as BlogArticleRow[]).filter((row) => isPublicArticle(row)).map(toAdhdFeedItem);
}

export async function getPublicArticleBySlug(slug: string): Promise<PublicBlogArticle | null> {
  const { data, error } = await publicQuery().eq('slug', slug).maybeSingle();
  if (error) throw error;
  const row = data as unknown as BlogArticleRow | null;
  return row && isPublicArticle(row) ? toPublicArticle(row) : null;
}

export function isBlogAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.BLOG_ADMIN_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
