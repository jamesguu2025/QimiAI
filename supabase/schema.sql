-- DEPRECATED: do not use this file to provision or update Qimi databases.
--
-- The versioned files under supabase/migrations/ are the only supported schema
-- source. They include ownership-scoped Row Level Security policies and later
-- security corrections that cannot be represented safely by this old snapshot.
--
-- Use `npm run supabase:reset` for an isolated local database or the validated
-- Supabase migration workflow for staging/production.

DO $$
BEGIN
  RAISE EXCEPTION 'supabase/schema.sql is deprecated; apply supabase/migrations instead';
END $$;
