-- Growth Plan chat source metadata.
-- Expand-only migration: existing manual plan items continue to work.

ALTER TABLE plan_items
  ADD COLUMN IF NOT EXISTS source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (source_type IN ('manual', 'chat'));

CREATE INDEX IF NOT EXISTS idx_plan_items_user_source_message
  ON plan_items(user_id, source_message_id)
  WHERE source_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_plan_items_user_source_conversation
  ON plan_items(user_id, source_conversation_id)
  WHERE source_conversation_id IS NOT NULL;
