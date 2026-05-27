-- Child profiles table for family profile feature.

CREATE TABLE IF NOT EXISTS child_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  birth_year INTEGER CHECK (birth_year >= 2000 AND birth_year <= 2030),
  birth_month INTEGER CHECK (birth_month >= 1 AND birth_month <= 12),
  gender TEXT CHECK (gender IN ('boy', 'girl', 'other')),
  challenges JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT child_profiles_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_child_profiles_user_id ON child_profiles(user_id);

ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "child_profiles_select" ON child_profiles FOR SELECT USING (true);
CREATE POLICY "child_profiles_insert" ON child_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "child_profiles_update" ON child_profiles FOR UPDATE USING (true);
CREATE POLICY "child_profiles_delete" ON child_profiles FOR DELETE USING (true);

DROP TRIGGER IF EXISTS child_profiles_updated_at ON child_profiles;
CREATE TRIGGER child_profiles_updated_at
  BEFORE UPDATE ON child_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
