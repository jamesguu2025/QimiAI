# ADHD Blog Publishing

> Status: Implemented, not yet human-accepted | Created: 2026-07-26

## Scope

Qimi owns and renders the full article. Jamesguu.com consumes metadata only from the public ADHD JSON feed and links to the Qimi canonical article URL.

## Architecture

- `blog_articles` is the only persistent Blog content source.
- Article bodies are stored as Markdown and rendered without raw HTML support.
- Public reads use server-side routes with the Supabase service client. Browser clients do not receive database access.
- Management routes require an authenticated NextAuth session whose normalized email is listed in `BLOG_ADMIN_EMAILS`.
- Public visibility requires `status = 'published'`, `is_public = true`, and `published_at <= now()`.

## Public contracts

- Article listing: `/blog`
- Article detail: `/blog/{slug}`
- ADHD feed: `/api/public/content/adhd`
- RSS: `/rss.xml`
- Sitemap: `/sitemap.xml`

The feed returns at most 50 records ordered by `published_at` descending. It contains metadata only. Category, author, and status are normalized to `adhd`, `Qimi AI`, and `published`.

## Publishing behavior

- Draft, unpublished, archived, future-dated, and private records are excluded from all public surfaces.
- Changing a published record to another status removes it on the next uncached origin response.
- Deleting a record removes it from all public surfaces.
- Publishing without `published_at` assigns the current database time.
- A published article slug is stable because updates do not rewrite it implicitly.

## Acceptance

Technical acceptance covers migration replay, focused contract tests, type checking, production build, and local HTTP checks. Human acceptance follows technical acceptance and must validate management workflow and rendered article content before deployment.
