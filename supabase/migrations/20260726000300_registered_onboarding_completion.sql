-- Record authenticated onboarding completion independently from browser state.
-- This migration is forward-only and preserves all existing profile data.

ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

UPDATE public.child_profiles
SET onboarding_completed_at = COALESCE(updated_at, created_at, NOW())
WHERE onboarding_completed_at IS NULL
  AND NULLIF(BTRIM(name), '') IS NOT NULL
  AND birth_year IS NOT NULL
  AND birth_month IS NOT NULL
  AND gender IS NOT NULL
  AND jsonb_typeof(challenges) = 'array'
  AND jsonb_array_length(challenges) > 0;
