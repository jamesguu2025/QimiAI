-- conversation_rag_contexts: server-side answer-time RAG paper context
-- Stores full retrieved abstracts for same-topic follow-up reuse.
-- Not a public paper browser. No public API exposes these rows.

create table if not exists conversation_rag_contexts (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid null references conversations(id) on delete cascade,
  user_id uuid null references users(id) on delete cascade,
  guest_session_id text null,
  topic_key text null,
  query text not null,
  question text not null,
  papers jsonb not null,
  sources jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint conversation_rag_context_owner_check
    check (conversation_id is not null or guest_session_id is not null)
);

-- Enable RLS
alter table conversation_rag_contexts enable row level security;

-- No anon or authenticated policies — server-side service-role access only.
-- Ownership is enforced in API code before read/write.

-- Indexes
create index idx_rag_ctx_conv_created on conversation_rag_contexts (conversation_id, created_at desc);
create index idx_rag_ctx_guest_created on conversation_rag_contexts (guest_session_id, created_at desc);
create index idx_rag_ctx_expires on conversation_rag_contexts (expires_at);
