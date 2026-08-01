# ADHD Blog Publishing

> Status: Implemented, not yet human-accepted | Created: 2026-07-26 | Architecture updated: 2026-08-01

## Scope

Qimi AI uses the free WordPress.com site at `qimiai.wordpress.com` as its writing interface and public read-only content source. Qimi AI owns and renders the canonical article pages. Jamesguu.com consumes metadata only from the public ADHD JSON feed and links to the Qimi AI canonical article URL.

## Architecture

- WordPress.com is the only active Blog content source.
- The website makes anonymous `GET` requests to the official WordPress.com REST API.
- No WordPress password, API key, plugin, custom domain, new server, or Blog database is required.
- Published posts render on the existing Next.js site at `/blog/{slug}`.
- WordPress HTML is accepted only from trusted Qimi AI authors and is sanitized by WordPress.com before the public API returns it.
- WordPress responses are cached at the Qimi AI edge for at most five minutes.
- The historical `blog_articles` migration remains in migration history but is not read or written by the active Blog application.

## Publishing flow

```text
Write and publish in WordPress.com
  -> WordPress.com public REST API
  -> qimiai.to/blog and /blog/{slug}
  -> metadata, canonical URL, BlogPosting JSON-LD, sitemap and RSS
```

## Public contracts

- Article listing: `/blog`
- Article detail: `/blog/{slug}`
- ADHD metadata feed: `/api/public/content/adhd`
- RSS: `/rss.xml`
- Sitemap: `/sitemap.xml`

The metadata feed contains no article body. Category, author, and status are normalized to `adhd`, `Qimi AI`, and `published` for the Jamesguu.com consumer contract.

## Search and duplicate content

- `https://www.qimiai.to/blog/{slug}` is the canonical public article URL.
- Keep the WordPress.com search engine visibility discouragement enabled.
- Do not promote or internally link to the WordPress.com article URL.
- Qimi AI supplies server-rendered article HTML, metadata, canonical URL, Open Graph data, `BlogPosting` JSON-LD, Sitemap and RSS.

## Configuration

- `WORDPRESS_SITE=qimiai.wordpress.com`
- `NEXT_PUBLIC_SITE_URL=https://www.qimiai.to`

The default WordPress site value works without runtime configuration. No publishing credential is stored in this codebase.

## Acceptance

Technical acceptance covers focused contract tests, type checking, production build and local HTTP checks. Human acceptance follows technical acceptance and validates one published WordPress test post on the Qimi AI Blog list and detail page before deployment.
