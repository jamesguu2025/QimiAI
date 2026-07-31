import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { BLOG_STATUSES, isBlogAdmin, type BlogStatus } from './blog';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const QIMI_ARTICLE_URL_PATTERN = /^https:\/\/(?:www\.)?qimiai\.to\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const QIMI_IMAGE_URL_PATTERN = /^https:\/\/(?:www\.)?qimiai\.to\//;

export type BlogWritePayload = {
  slug?: string;
  title?: string;
  excerpt?: string;
  content_markdown?: string;
  status?: BlogStatus;
  category?: string;
  image_url?: string | null;
  canonical_url?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  is_public?: boolean;
  allow_indexing?: boolean;
  published_at?: string | null;
};

export async function requireBlogAdmin(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  const session = await getServerSession(req, res, authOptions);
  const email = session?.user?.email;
  if (!email) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  if (!isBlogAdmin(email)) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return email;
}

function optionalText(value: unknown, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error('Expected text');
  const text = value.trim();
  if (text.length > max) throw new Error(`Text exceeds ${max} characters`);
  return text;
}

export function validateBlogWrite(input: unknown, partial = false): BlogWritePayload {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid request body');
  const body = input as Record<string, unknown>;
  const payload: BlogWritePayload = {};

  const requiredText = (key: 'slug' | 'title' | 'excerpt' | 'content_markdown', max: number) => {
    const value = body[key];
    if (value === undefined && partial) return;
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
      throw new Error(`${key} is required and must be at most ${max} characters`);
    }
    payload[key] = value.trim();
  };
  requiredText('slug', 160);
  requiredText('title', 200);
  requiredText('excerpt', 500);
  requiredText('content_markdown', 200000);

  if (payload.slug && !SLUG_PATTERN.test(payload.slug)) throw new Error('Invalid slug');
  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !BLOG_STATUSES.includes(body.status as BlogStatus)) throw new Error('Invalid status');
    payload.status = body.status as BlogStatus;
  }
  if (!partial && payload.status === undefined) payload.status = 'draft';

  if (body.category !== undefined) {
    if (typeof body.category !== 'string' || !body.category.trim() || body.category.trim().length > 80) throw new Error('Invalid category');
    payload.category = body.category.trim().toLowerCase();
  }
  if (!partial && payload.category === undefined) payload.category = 'adhd';

  for (const key of ['image_url', 'canonical_url', 'seo_title', 'seo_description'] as const) {
    const max = key === 'seo_description' ? 500 : key === 'seo_title' ? 200 : 2048;
    payload[key] = optionalText(body[key], max);
  }
  if (payload.canonical_url && !QIMI_ARTICLE_URL_PATTERN.test(payload.canonical_url)) throw new Error('canonical_url must be a Qimi Blog HTTPS URL');
  if (payload.image_url && !QIMI_IMAGE_URL_PATTERN.test(payload.image_url)) throw new Error('image_url must be a Qimi HTTPS URL');

  for (const key of ['is_public', 'allow_indexing'] as const) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== 'boolean') throw new Error(`${key} must be boolean`);
      payload[key] = body[key] as boolean;
    }
  }
  if (!partial) {
    if (payload.is_public === undefined) payload.is_public = false;
    if (payload.allow_indexing === undefined) payload.allow_indexing = false;
  }

  if (body.published_at !== undefined) {
    if (body.published_at === null || body.published_at === '') payload.published_at = null;
    else if (typeof body.published_at !== 'string' || !Number.isFinite(Date.parse(body.published_at))) throw new Error('Invalid published_at');
    else payload.published_at = new Date(body.published_at).toISOString();
  }
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)) as BlogWritePayload;
}
