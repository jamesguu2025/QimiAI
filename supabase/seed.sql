-- Minimal local seed data for smoke testing chat persistence.

INSERT INTO users (
  id,
  email,
  name,
  provider,
  password_hash
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'local-parent@example.com',
  'Local Parent',
  'credentials',
  '$2b$10$BiSf7iwjdgOs5i8oYaNceerZnqRLYSbZbgYnlIe42YP9.eJTOiRNi'
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  provider = EXCLUDED.provider,
  password_hash = EXCLUDED.password_hash;

INSERT INTO child_profiles (
  user_id,
  name,
  birth_year,
  birth_month,
  challenges
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Local Child',
  2018,
  5,
  '[{"id":"waiting","name":"Waiting without grabbing","categoryId":"behavior","categoryName":"Behavior"}]'::jsonb
) ON CONFLICT (user_id) DO UPDATE SET
  name = EXCLUDED.name,
  birth_year = EXCLUDED.birth_year,
  birth_month = EXCLUDED.birth_month,
  challenges = EXCLUDED.challenges;

INSERT INTO conversations (
  id,
  user_id,
  title,
  guest_migration_id
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Local Seed Conversation',
  'seed-local-conversation'
) ON CONFLICT (user_id, guest_migration_id) WHERE guest_migration_id IS NOT NULL DO NOTHING;

INSERT INTO messages (
  conversation_id,
  role,
  content,
  created_at
) VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'user',
    'How do I test local chat persistence?',
    NOW()
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'assistant',
    'This seed conversation confirms local Supabase is connected.',
    NOW() + INTERVAL '1 millisecond'
  );
