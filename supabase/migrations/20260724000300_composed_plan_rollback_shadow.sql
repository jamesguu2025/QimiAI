-- Keep the pre-composed plan row as a hidden rollback shadow.
-- The current app excludes these rows from Saved Plan source queries, while the
-- previously deployed app can still read the original record after a rollback.

ALTER TABLE plan_items
  ADD COLUMN IF NOT EXISTS legacy_composed_shadow BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO plan_items (
  id,
  user_id,
  category,
  pain_point,
  strategy,
  strategy_summary,
  explanation_markdown,
  intervention_blocks,
  star,
  check_in_days,
  source_type,
  created_at,
  updated_at,
  legacy_composed_shadow
)
SELECT
  composed.id,
  composed.user_id,
  'exercise',
  composed.title,
  composed.summary,
  composed.summary,
  composed.explanation_markdown,
  composed.intervention_blocks,
  FALSE,
  '{}'::TEXT[],
  'manual',
  composed.created_at,
  composed.updated_at,
  TRUE
FROM composed_plans AS composed
WHERE composed.title = 'Foot arch and balance routine; Memory and social skills plan'
  AND NOT EXISTS (
    SELECT 1
    FROM plan_items AS existing
    WHERE existing.id = composed.id
  )
ON CONFLICT (id) DO NOTHING;

UPDATE plan_items AS legacy
SET legacy_composed_shadow = TRUE
WHERE legacy.pain_point = 'Foot arch and balance routine; Memory and social skills plan'
  AND EXISTS (
    SELECT 1
    FROM composed_plans AS composed
    WHERE composed.id = legacy.id
      AND composed.user_id = legacy.user_id
  );

CREATE INDEX IF NOT EXISTS idx_plan_items_user_visible
  ON plan_items(user_id, created_at DESC)
  WHERE legacy_composed_shadow = FALSE;
