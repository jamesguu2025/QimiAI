-- ===========================================
-- Reports Table
-- ===========================================
CREATE TABLE IF NOT EXISTS reports (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT    NOT NULL,
  image_url   TEXT    NOT NULL,
  analysis    TEXT,
  status      TEXT    NOT NULL DEFAULT 'uploading'
                CHECK (status IN ('uploading', 'analyzing', 'completed', 'failed')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_user_id
  ON reports(user_id);

CREATE INDEX IF NOT EXISTS idx_reports_user_created
  ON reports(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies (defense-in-depth; server-side uses service_role key which bypasses RLS)
CREATE POLICY "reports_select" ON reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reports_update" ON reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reports_delete" ON reports FOR DELETE USING (auth.uid() = user_id);

-- Auto-update trigger
DROP TRIGGER IF EXISTS reports_updated_at ON reports;
CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
