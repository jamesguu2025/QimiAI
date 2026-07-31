-- Public Blog content owned by Qimi. Bodies remain private to server-side reads.
CREATE TABLE IF NOT EXISTS blog_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  excerpt TEXT NOT NULL CHECK (char_length(excerpt) BETWEEN 1 AND 500),
  content_markdown TEXT NOT NULL CHECK (char_length(content_markdown) BETWEEN 1 AND 200000),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'unpublished', 'archived')),
  category TEXT NOT NULL DEFAULT 'adhd',
  author TEXT NOT NULL DEFAULT 'Qimi AI',
  image_url TEXT,
  canonical_url TEXT,
  seo_title TEXT CHECK (seo_title IS NULL OR char_length(seo_title) <= 200),
  seo_description TEXT CHECK (seo_description IS NULL OR char_length(seo_description) <= 500),
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  allow_indexing BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CHECK (canonical_url IS NULL OR canonical_url ~ '^https://(www\.)?qimiai\.to/blog/[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CHECK (image_url IS NULL OR image_url ~ '^https://(www\.)?qimiai\.to/')
);

CREATE INDEX IF NOT EXISTS idx_blog_articles_public_feed
  ON blog_articles (published_at DESC)
  WHERE status = 'published' AND is_public = TRUE;

ALTER TABLE blog_articles ENABLE ROW LEVEL SECURITY;

-- No browser role receives a policy. Server routes use the service role and enforce
-- public visibility or the BLOG_ADMIN_EMAILS allowlist before reading or writing.

DROP TRIGGER IF EXISTS blog_articles_updated_at ON blog_articles;
CREATE TRIGGER blog_articles_updated_at
  BEFORE UPDATE ON blog_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION set_blog_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_articles_set_published_at ON blog_articles;
CREATE TRIGGER blog_articles_set_published_at
  BEFORE INSERT OR UPDATE ON blog_articles
  FOR EACH ROW
  EXECUTE FUNCTION set_blog_published_at();
