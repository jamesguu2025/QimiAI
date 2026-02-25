-- ===========================================
-- Follow-Up Reminder Module — Database Migration
-- Run in Supabase SQL Editor after schema.sql
-- ===========================================

-- ===========================================
-- 1. Follow-Up Items Table
-- ===========================================
CREATE TABLE IF NOT EXISTS followup_items (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status              TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'scheduled', 'completed', 'dismissed')),
  parent_problem      TEXT        NOT NULL,
  suggested_method    TEXT        NOT NULL,
  method_short_name   VARCHAR(50) NOT NULL,
  follow_up_question  TEXT        NOT NULL,
  source_conversation_id UUID    REFERENCES conversations(id) ON DELETE SET NULL,
  scheduled_at        TIMESTAMPTZ,
  sent_at             TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_followup_items_user_id
  ON followup_items(user_id);

CREATE INDEX IF NOT EXISTS idx_followup_items_user_status
  ON followup_items(user_id, status);

CREATE INDEX IF NOT EXISTS idx_followup_items_status_created
  ON followup_items(status, created_at DESC);

-- Prevent duplicate active follow-ups per user (race condition guard)
CREATE UNIQUE INDEX IF NOT EXISTS idx_followup_items_one_active_per_user
  ON followup_items(user_id)
  WHERE status IN ('pending', 'scheduled');

-- Enable RLS
ALTER TABLE followup_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "followup_items_select" ON followup_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "followup_items_insert" ON followup_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "followup_items_update" ON followup_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "followup_items_delete" ON followup_items
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-update trigger (uses existing update_updated_at function from schema.sql)
DROP TRIGGER IF EXISTS followup_items_updated_at ON followup_items;
CREATE TRIGGER followup_items_updated_at
  BEFORE UPDATE ON followup_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- 2. Follow-Up Preferences Table
-- ===========================================
CREATE TABLE IF NOT EXISTS followup_preferences (
  user_id     UUID    PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE followup_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "followup_prefs_select" ON followup_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "followup_prefs_insert" ON followup_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "followup_prefs_update" ON followup_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Auto-update trigger
DROP TRIGGER IF EXISTS followup_preferences_updated_at ON followup_preferences;
CREATE TRIGGER followup_preferences_updated_at
  BEFORE UPDATE ON followup_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
