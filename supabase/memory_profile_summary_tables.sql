-- Memory & Profile Summary tables
-- Created: 2026-03-17
-- Spec: docs/specs/memory-profile-summary.md

-- ============================================
-- profile_summaries: one natural-language family summary per user (≤200 chars)
-- ============================================
CREATE TABLE IF NOT EXISTS profile_summaries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  summary     TEXT NOT NULL DEFAULT ''
                CHECK (char_length(summary) <= 200),
  source      TEXT NOT NULL DEFAULT 'system'
                CHECK (source IN ('user', 'system')),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profile_summaries_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_summaries_user_id
  ON profile_summaries(user_id);

ALTER TABLE profile_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_summaries_select"
  ON profile_summaries FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profile_summaries_insert"
  ON profile_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_summaries_update"
  ON profile_summaries FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "profile_summaries_delete"
  ON profile_summaries FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- memory_items: conversation-derived structured facts (A.U.D.N. system)
-- 10 categories from blueprint § 6.3
-- ============================================
CREATE TABLE IF NOT EXISTS memory_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category        TEXT NOT NULL
                    CHECK (category IN (
                      'child_info', 'school', 'family', 'behavior',
                      'preference', 'medical', 'concern', 'goal',
                      'progress', 'sports'
                    )),
  fact_key        TEXT NOT NULL,
  fact_value      TEXT NOT NULL,
  confidence      NUMERIC(3,2) NOT NULL DEFAULT 0.70,
  source          TEXT NOT NULL DEFAULT 'conversation'
                    CHECK (source IN ('conversation', 'report', 'plan')),
  source_ref      TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'archived')),
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_items_user_id
  ON memory_items(user_id);

CREATE INDEX IF NOT EXISTS idx_memory_items_user_category
  ON memory_items(user_id, category);

CREATE INDEX IF NOT EXISTS idx_memory_items_user_active
  ON memory_items(user_id, status, updated_at DESC);

-- Prevent duplicate active facts: same user + category + key = one fact
CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_items_user_category_key
  ON memory_items(user_id, category, fact_key) WHERE status = 'active';

ALTER TABLE memory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memory_items_select"
  ON memory_items FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "memory_items_insert"
  ON memory_items FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "memory_items_update"
  ON memory_items FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "memory_items_delete"
  ON memory_items FOR DELETE USING (auth.uid() = user_id);
