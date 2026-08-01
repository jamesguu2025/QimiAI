import { absoluteUrl } from './site-config';
import { decodeHtmlEntities, plainText, toAdhdFeedItem, type AdhdFeedItem } from './blog-contract';

export { decodeHtmlEntities, plainText } from './blog-contract';
export type { AdhdFeedItem } from './blog-contract';

const WORDPRESS_SITE = process.env.WORDPRESS_SITE || 'qimiai.wordpress.com';
const WORDPRESS_API = `https://public-api.wordpress.com/wp/v2/sites/${encodeURIComponent(WORDPRESS_SITE)}`;

export interface WordPressTerm {
  id: number;
  name: string;
  slug: string;
  taxonomy: 'category' | 'post_tag';
}

interface WordPressPost {
  id: number;
  date: string;
  modified: string;
  slug: string;
  title: { rendered: string };
  content: { rendered: string; protected: boolean };
  excerpt: { rendered: string; protected: boolean };
  jetpack_featured_media_url?: string;
  _embedded?: {
    author?: Array<{ name: string }>;
    'wp:term'?: WordPressTerm[][];
  };
}

export interface PublicBlogArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  category: string;
  author: string;
  imageUrl: string | null;
  canonicalUrl: string;
  seoTitle: string;
  seoDescription: string;
  publishedAt: string;
  updatedAt: string;
  terms: WordPressTerm[];
}

function postTerms(post: WordPressPost): WordPressTerm[] {
  return (post._embedded?.['wp:term']?.flat() || []).map((term) => ({
    ...term,
    name: decodeHtmlEntities(term.name),
  }));
}

export function articleUrl(slug: string): string {
  return absoluteUrl(`/blog/${slug}`);
}

function toPublicArticle(post: WordPressPost): PublicBlogArticle {
  const terms = postTerms(post);
  const category = terms.find((term) => term.taxonomy === 'category' && term.slug !== 'uncategorized');
  const title = plainText(post.title.rendered);
  const excerpt = plainText(post.excerpt.rendered);

  return {
    id: String(post.id),
    slug: post.slug,
    title,
    excerpt,
    contentHtml: post.content.rendered,
    category: category?.name || 'ADHD',
    author: 'Qimi AI',
    imageUrl: post.jetpack_featured_media_url || null,
    canonicalUrl: articleUrl(post.slug),
    seoTitle: `${title} | Qimi AI`,
    seoDescription: excerpt.slice(0, 200),
    publishedAt: post.date,
    updatedAt: post.modified,
    terms,
  };
}

async function wordpressFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${WORDPRESS_API}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`WordPress request failed with status ${response.status}`);
  return response.json() as Promise<T>;
}

export async function listPublicArticles(limit = 50): Promise<PublicBlogArticle[]> {
  const posts = await wordpressFetch<WordPressPost[]>('/posts', {
    per_page: String(Math.max(1, Math.min(limit, 100))),
    _embed: '1',
    status: 'publish',
  });
  return posts.map(toPublicArticle);
}

export async function listIndexableArticles(limit = 100): Promise<PublicBlogArticle[]> {
  return listPublicArticles(limit);
}

export async function getPublicArticleBySlug(slug: string): Promise<PublicBlogArticle | null> {
  const posts = await wordpressFetch<WordPressPost[]>('/posts', {
    slug,
    per_page: '1',
    _embed: '1',
    status: 'publish',
  });
  return posts[0] ? toPublicArticle(posts[0]) : null;
}

export async function listAdhdFeedItems(limit = 50): Promise<AdhdFeedItem[]> {
  const articles = await listPublicArticles(limit);
  return articles.map(toAdhdFeedItem);
}
