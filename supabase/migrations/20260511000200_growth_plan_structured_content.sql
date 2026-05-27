-- Growth Plan structured content for chat-saved plans

ALTER TABLE plan_items
  ADD COLUMN IF NOT EXISTS strategy_summary TEXT,
  ADD COLUMN IF NOT EXISTS explanation_markdown TEXT,
  ADD COLUMN IF NOT EXISTS intervention_blocks JSONB NOT NULL DEFAULT '[]'::jsonb;
