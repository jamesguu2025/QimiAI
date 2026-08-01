-- Reconcile the legacy production baseline with the migration-managed schema.
-- Existing rows are preserved. Every operation is safe to repeat.

ALTER TABLE public.users
  ALTER COLUMN provider SET DEFAULT 'google';

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS guest_migration_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_email
  ON public.users(email);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id
  ON public.conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
  ON public.conversations(updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_guest_migration
  ON public.conversations(user_id, guest_migration_id)
  WHERE guest_migration_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON public.messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_created_at
  ON public.messages(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_child_profiles_user_unique
  ON public.child_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_profile_summaries_user_id
  ON public.profile_summaries(user_id);

CREATE INDEX IF NOT EXISTS idx_memory_items_user_id
  ON public.memory_items(user_id);

CREATE INDEX IF NOT EXISTS idx_memory_items_user_category
  ON public.memory_items(user_id, category);

CREATE INDEX IF NOT EXISTS idx_memory_items_user_active
  ON public.memory_items(user_id, status, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_items_user_category_key
  ON public.memory_items(user_id, category, fact_key)
  WHERE status = 'active';

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS conversations_updated_at ON public.conversations;
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS child_profiles_updated_at ON public.child_profiles;
CREATE TRIGGER child_profiles_updated_at
  BEFORE UPDATE ON public.child_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.conversations
  SET
    message_count = (
      SELECT COUNT(*)
      FROM public.messages
      WHERE conversation_id = NEW.conversation_id
    ),
    last_message = NEW.content,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_update_conversation ON public.messages;
CREATE TRIGGER messages_update_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_on_message();

-- Normalize legacy production child profile challenges from text[] values that
-- contain JSON objects to the JSONB array used by the current application.

CREATE OR REPLACE FUNCTION public.qimi_text_json_array_to_jsonb(p_values TEXT[])
RETURNS JSONB
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT COALESCE(jsonb_agg(value::jsonb), '[]'::jsonb)
  FROM unnest(COALESCE(p_values, '{}'::text[])) AS value;
$$;

DO $$
DECLARE
  challenges_type TEXT;
BEGIN
  SELECT columns.udt_name
  INTO challenges_type
  FROM information_schema.columns AS columns
  WHERE columns.table_schema = 'public'
    AND columns.table_name = 'child_profiles'
    AND columns.column_name = 'challenges';

  IF challenges_type = '_text' THEN
    ALTER TABLE public.child_profiles
      ALTER COLUMN challenges DROP DEFAULT;

    ALTER TABLE public.child_profiles
      ALTER COLUMN challenges TYPE JSONB
      USING public.qimi_text_json_array_to_jsonb(challenges);
  ELSIF challenges_type IS DISTINCT FROM 'jsonb' THEN
    RAISE EXCEPTION 'Unsupported child_profiles.challenges type: %', challenges_type;
  END IF;
END
$$;

ALTER TABLE public.child_profiles
  ALTER COLUMN challenges SET DEFAULT '[]'::jsonb,
  ALTER COLUMN challenges SET NOT NULL;

ALTER TABLE public.child_profiles
  DROP CONSTRAINT IF EXISTS child_profiles_challenges_is_array;

ALTER TABLE public.child_profiles
  ADD CONSTRAINT child_profiles_challenges_is_array
  CHECK (jsonb_typeof(challenges) = 'array') NOT VALID;

ALTER TABLE public.child_profiles
  VALIDATE CONSTRAINT child_profiles_challenges_is_array;

DROP FUNCTION public.qimi_text_json_array_to_jsonb(TEXT[]);
