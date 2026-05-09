-- Compliance launch gate: parental consent audit table and user-owned RLS cleanup.

CREATE TABLE IF NOT EXISTS parental_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_text TEXT NOT NULL,
  consent_method TEXT NOT NULL DEFAULT 'parent_guardian_attestation',
  consent_version TEXT NOT NULL DEFAULT '2026-05-08',
  ip_address TEXT,
  user_agent TEXT,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT parental_consents_user_id_unique UNIQUE (user_id)
);

ALTER TABLE parental_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parental_consents_select" ON parental_consents;
CREATE POLICY "parental_consents_select" ON parental_consents
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP TRIGGER IF EXISTS parental_consents_updated_at ON parental_consents;
CREATE TRIGGER parental_consents_updated_at
  BEFORE UPDATE ON parental_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Users table
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Service can insert users" ON users;
DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;

CREATE POLICY "users_select" ON users
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "users_update" ON users
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "users_insert" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- Conversations table
DROP POLICY IF EXISTS "Conversations can be managed by server routes" ON conversations;
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
DROP POLICY IF EXISTS "conversations_update" ON conversations;
DROP POLICY IF EXISTS "conversations_delete" ON conversations;

CREATE POLICY "conversations_select" ON conversations
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "conversations_delete" ON conversations
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Messages table
DROP POLICY IF EXISTS "Messages can be managed by server routes" ON messages;
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;
DROP POLICY IF EXISTS "messages_delete" ON messages;

CREATE POLICY "messages_select" ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = (select auth.uid())
    )
  );

CREATE POLICY "messages_insert" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = (select auth.uid())
    )
  );

CREATE POLICY "messages_update" ON messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = (select auth.uid())
    )
  );

CREATE POLICY "messages_delete" ON messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = (select auth.uid())
    )
  );

-- Child profiles table
DROP POLICY IF EXISTS "child_profiles_select" ON child_profiles;
DROP POLICY IF EXISTS "child_profiles_insert" ON child_profiles;
DROP POLICY IF EXISTS "child_profiles_update" ON child_profiles;
DROP POLICY IF EXISTS "child_profiles_delete" ON child_profiles;

CREATE POLICY "child_profiles_select" ON child_profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "child_profiles_insert" ON child_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "child_profiles_update" ON child_profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "child_profiles_delete" ON child_profiles
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Profile summaries table
DROP POLICY IF EXISTS "profile_summaries_select" ON profile_summaries;
DROP POLICY IF EXISTS "profile_summaries_insert" ON profile_summaries;
DROP POLICY IF EXISTS "profile_summaries_update" ON profile_summaries;
DROP POLICY IF EXISTS "profile_summaries_delete" ON profile_summaries;

CREATE POLICY "profile_summaries_select" ON profile_summaries
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "profile_summaries_insert" ON profile_summaries
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "profile_summaries_update" ON profile_summaries
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "profile_summaries_delete" ON profile_summaries
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Memory items table
DROP POLICY IF EXISTS "memory_items_select" ON memory_items;
DROP POLICY IF EXISTS "memory_items_insert" ON memory_items;
DROP POLICY IF EXISTS "memory_items_update" ON memory_items;
DROP POLICY IF EXISTS "memory_items_delete" ON memory_items;

CREATE POLICY "memory_items_select" ON memory_items
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "memory_items_insert" ON memory_items
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "memory_items_update" ON memory_items
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "memory_items_delete" ON memory_items
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);
