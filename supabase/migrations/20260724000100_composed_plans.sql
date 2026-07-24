-- First-class composed plans. Saved Plan sources remain in plan_items.

CREATE TABLE IF NOT EXISTS composed_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  explanation_markdown TEXT,
  topic_categories TEXT[] NOT NULL DEFAULT '{}',
  intervention_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_plan_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT composed_plans_topic_categories_valid CHECK (
    topic_categories <@ ARRAY[
      'emotion', 'learning', 'exercise', 'nutrition',
      'social', 'sleep', 'school'
    ]::TEXT[]
  )
);

CREATE INDEX IF NOT EXISTS idx_composed_plans_user_updated
  ON composed_plans(user_id, updated_at DESC);

ALTER TABLE composed_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "composed_plans_select" ON composed_plans;
DROP POLICY IF EXISTS "composed_plans_insert" ON composed_plans;
DROP POLICY IF EXISTS "composed_plans_update" ON composed_plans;
DROP POLICY IF EXISTS "composed_plans_delete" ON composed_plans;

CREATE POLICY "composed_plans_select" ON composed_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "composed_plans_insert" ON composed_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "composed_plans_update" ON composed_plans
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "composed_plans_delete" ON composed_plans
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS composed_plans_updated_at ON composed_plans;
CREATE TRIGGER composed_plans_updated_at
  BEFORE UPDATE ON composed_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Repair the known composed plan that was previously stored as an Exercise source.
-- Preserve its id and structured content. The legacy row remains as a rollback shadow
-- and is hidden from the current source API by the follow-up expand-contract migration.
INSERT INTO composed_plans (
  id,
  user_id,
  title,
  summary,
  explanation_markdown,
  topic_categories,
  intervention_blocks,
  source_plan_ids,
  created_at,
  updated_at
)
SELECT
  legacy.id,
  legacy.user_id,
  legacy.pain_point,
  COALESCE(NULLIF(legacy.strategy_summary, ''), legacy.strategy),
  legacy.explanation_markdown,
  ARRAY(
    SELECT DISTINCT topic.category
    FROM jsonb_array_elements(legacy.intervention_blocks) AS block
    CROSS JOIN LATERAL (
      SELECT CASE lower(block->>'title')
        WHEN 'emotional support' THEN 'emotion'
        WHEN 'learning strategies' THEN 'learning'
        WHEN 'exercise & movement' THEN 'exercise'
        WHEN 'diet & nutrition' THEN 'nutrition'
        WHEN 'social skills' THEN 'social'
        WHEN 'sleep & rest' THEN 'sleep'
        WHEN 'school communication' THEN 'school'
        ELSE NULL
      END AS category
    ) AS topic
    WHERE topic.category IS NOT NULL
  ),
  legacy.intervention_blocks,
  ARRAY(
    SELECT source.id
    FROM plan_items AS source
    WHERE source.user_id = legacy.user_id
      AND source.id <> legacy.id
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(legacy.intervention_blocks) AS source_block
        WHERE lower(source_block->>'title') = 'plan sources'
          AND position(lower(source.pain_point) IN lower(source_block->>'contentMarkdown')) > 0
      )
  ),
  legacy.created_at,
  legacy.updated_at
FROM plan_items AS legacy
WHERE legacy.pain_point = 'Foot arch and balance routine; Memory and social skills plan'
ON CONFLICT (id) DO NOTHING;
