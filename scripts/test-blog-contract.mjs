import assert from 'node:assert/strict';
import { decodeHtmlEntities, plainText, toAdhdFeedItem } from '../lib/blog-contract.ts';

assert.equal(decodeHtmlEntities('Qimi &amp; Families &#39;Guide&#39;'), "Qimi & Families 'Guide'");
assert.equal(plainText('<b>Supporting</b> ADHD\nRoutines &amp; Families'), 'Supporting ADHD Routines & Families');
assert.equal(plainText('<script>alert(1)</script><p>Safe summary</p>'), 'Safe summary');

const item = toAdhdFeedItem({
  id: '42',
  slug: 'supporting-adhd-routines',
  title: 'Supporting ADHD Routines',
  excerpt: 'Safe and practical guidance',
  publishedAt: '2026-07-26T10:00:00.000Z',
  updatedAt: '2026-07-26T11:00:00.000Z',
  canonicalUrl: 'https://www.qimiai.to/blog/supporting-adhd-routines',
  imageUrl: 'https://qimiai.files.wordpress.com/2026/07/routines.jpg',
});

assert.deepEqual(Object.keys(item).sort(), ['author', 'category', 'excerpt', 'id', 'imageUrl', 'publishedAt', 'slug', 'status', 'title', 'updatedAt', 'url'].sort());
assert.equal(item.category, 'adhd');
assert.equal(item.author, 'Qimi AI');
assert.equal(item.status, 'published');
assert.match(item.url, /^https:\/\/(?:www\.)?qimiai\.to\/blog\//);
assert.equal('contentHtml' in item, false, 'public metadata feed must not expose article body');

console.log('WordPress Blog contract checks passed.');
