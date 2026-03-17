-- supabase/family_tables.sql
-- Child profiles table for family profile feature
-- Module: family-profile
-- Updated: 2026-03-17 - challenges changed from TEXT[] to JSONB

-- Create child_profiles table
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

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_child_profiles_user_id ON child_profiles(user_id);

-- Enable Row Level Security
ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own child's profile
CREATE POLICY "child_profiles_select" ON child_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "child_profiles_insert" ON child_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "child_profiles_update" ON child_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "child_profiles_delete" ON child_profiles FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at timestamp
DROP TRIGGER IF EXISTS child_profiles_updated_at ON child_profiles;
CREATE TRIGGER child_profiles_updated_at
  BEFORE UPDATE ON child_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Migration: If table exists with TEXT[] challenges, migrate to JSONB
-- NOTE: Run this migration block only if the table already exists with old schema
-- DO NOT run on fresh database
--
-- BEGIN MIGRATION BLOCK (uncomment to run)
-- ALTER TABLE child_profiles 
--   ALTER COLUMN challenges TYPE JSONB 
--   USING CASE 
--     WHEN challenges IS NULL OR challenges = '{}' THEN '[]'::jsonb
--     ELSE (
--       SELECT jsonb_agg(jsonb_build_object(
--         'id', elem,
--         'name', elem,
--         'categoryId', 'unknown',
--         'categoryName', 'Unknown'
--       ))
--       FROM unnest(challenges) AS elem
--     )
--   END;
-- END MIGRATION BLOCK
