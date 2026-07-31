import assert from 'node:assert/strict';
import { isPublicArticle, plainText, toAdhdFeedItem } from '../lib/blog-contract.ts';

const now = new Date('2026-07-26T12:00:00.000Z');
const base = {
  id: '642e632f-d570-4d87-a569-e0746e54384f',
  slug: 'supporting-adhd-routines',
  title: '<b>Supporting</b> ADHD\nRoutines',
  excerpt: 'Safe <script>alert(1)</script> summary &amp; guidance',
  content_markdown: '# Full body\n\nPrivate from feed',
  status: 'published',
  category: 'adhd',
  author: 'Qimi AI',
  image_url: 'https://www.qimiai.to/images/supporting-adhd-routines.jpg',
  canonical_url: null,
  seo_title: null,
  seo_description: null,
  is_public: true,
  allow_indexing: true,
  published_at: '2026-07-26T10:00:00.000Z',
  created_at: '2026-07-26T09:00:00.000Z',
  updated_at: '2026-07-26T11:00:00.000Z',
};

assert.equal(isPublicArticle(base, now), true, 'published ADHD article must be public');
for (const status of ['draft', 'unpublished', 'archived']) {
  assert.equal(isPublicArticle({ ...base, status }, now), false, `${status} must not be public`);
}
assert.equal(isPublicArticle({ ...base, is_public: false }, now), false, 'private article must not be public');
assert.equal(isPublicArticle({ ...base, published_at: '2026-07-27T10:00:00.000Z' }, now), false, 'future article must not be public');
assert.equal(plainText(base.title), 'Supporting ADHD Routines');

const item = toAdhdFeedItem(base, (slug) => `https://www.qimiai.to/blog/${slug}`);
assert.deepEqual(Object.keys(item).sort(), ['author', 'category', 'excerpt', 'id', 'imageUrl', 'publishedAt', 'slug', 'status', 'title', 'updatedAt', 'url'].sort());
assert.equal(item.category, 'adhd');
assert.equal(item.author, 'Qimi AI');
assert.equal(item.status, 'published');
assert.match(item.url, /^https:\/\/(?:www\.)?qimiai\.to\/blog\//);
assert.equal('content_markdown' in item, false, 'feed must not expose body');
assert.ok(Number.isFinite(Date.parse(item.publishedAt)));
assert.ok(Number.isFinite(Date.parse(item.updatedAt)));

const newestFirst = [base, { ...base, id: 'new', published_at: '2026-07-26T11:00:00.000Z' }]
  .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
assert.equal(newestFirst[0].id, 'new');

console.log('Blog contract checks passed.');
