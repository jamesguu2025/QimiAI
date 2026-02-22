-- ===========================================
-- Plan Items Table
-- ===========================================
CREATE TABLE IF NOT EXISTS plan_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category    TEXT        NOT NULL CHECK (category IN (
                'emotion', 'learning', 'exercise',
                'nutrition', 'social', 'sleep', 'school'
              )),
  pain_point  TEXT        NOT NULL,
  strategy    TEXT        NOT NULL,
  star        BOOLEAN     NOT NULL DEFAULT false,
  check_in_days TEXT[]    NOT NULL DEFAULT '{}',
  last_check_in TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plan_items_user_id
  ON plan_items(user_id);

CREATE INDEX IF NOT EXISTS idx_plan_items_user_category
  ON plan_items(user_id, category);

CREATE INDEX IF NOT EXISTS idx_plan_items_user_star
  ON plan_items(user_id, star DESC);

-- Enable RLS
ALTER TABLE plan_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies (defense-in-depth; server-side uses service_role key which bypasses RLS)
CREATE POLICY "plan_items_select" ON plan_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "plan_items_insert" ON plan_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plan_items_update" ON plan_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "plan_items_delete" ON plan_items FOR DELETE USING (auth.uid() = user_id);

-- Auto-update trigger (reuses shared update_updated_at function)
DROP TRIGGER IF EXISTS plan_items_updated_at ON plan_items;
CREATE TRIGGER plan_items_updated_at
  BEFORE UPDATE ON plan_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
