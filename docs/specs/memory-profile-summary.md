# Module Spec: Memory And Profile Summary

> Status: APPROVED — 2026-03-14 | Self-reviewed: 2026-03-14 | Second-pass reviewed: 2026-03-14 | Implementation status: Planned
> Module: memory-profile-summary
> Routes: none in MVP
> Scope: Editable profile summary + internal conversation-derived memory layer for prompt injection

---

## 0. Planning Baseline

This spec was re-checked against:

- The current repo structure and scripts in `/Users/jamesguu/qimi-ai-website/qimi-ai-website`
- The canonical Layer 1 architecture in `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/system-architecture.md`
- The cross-platform blueprint in `/Users/jamesguu/WeChatProjects/adhdhelper-cursor/docs/项目技术蓝图.md`
- The existing prompt contract in `/Users/jamesguu/qimi-ai-website/qimi-ai-website/lib/prompts.ts`
- The earlier adaptation notes in `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/Web INJECTION_SYSTEM_ARCHITECTURE.md`
- Mature long-term-memory patterns from LangGraph, Mem0, and OpenAI tool/state guidance

### Current Implementation Snapshot

- `lib/prompts.ts` currently accepts `familyNotes?: string` and `extractedFacts?: string[]`
- No database table for summary or memory items exists yet
- No UI editor for summary exists yet
- No extraction worker or memory retrieval route exists yet
- `docs/specs/user-profile.md` correctly keeps memory out of the core profile CRUD module

### MVP Boundary

- This module defines the storage and injection model only
- It does not require a dedicated route in this pass
- It does not require a “memory center” UI in this pass
- It does not attempt automatic write-back on every message in MVP
- It does not use embeddings, vector databases, or a separate memory service in MVP

### Execution Baseline

- This repo currently has `build`, but does not define `lint` or `test` npm scripts
- Validation commands in the task list therefore use `npx eslint`, `npx tsc --noEmit`, and `npm run build`

---

## 1. Design Goal

The web app needs a stable personalization layer that stays simpler than the mini-program version.

The mature MVP pattern is:

1. Keep the structured child profile as the primary source of explicit facts
2. Add one short editable summary (`profile_summary`) for reusable family context
3. Keep conversation-derived memory as an internal list of small records (`memory_items`)
4. Inject the summary on most turns, and retrieve only a few relevant memory items when needed

This avoids treating `extractedFacts` as a user-facing first-class profile field.

---

## 2. Why `extractedFacts` Should Not Be The Main Web Model

The mini-program architecture used `extractedFacts` as a visible concept because it evolved around prompt injection first.

For the web app, this is not the best long-term shape:

- `extractedFacts` mixes durable profile data with model-inferred memory
- A raw string array is hard to audit, rank, or expire
- It is not a strong schema for future user controls
- It encourages dumping too much context into the prompt on every turn

### Canonical Web Decision

- `familyNotes` should evolve into a single editable `profile_summary`
- `extractedFacts` should be treated as a backward-compatible prompt input only
- The stored system-of-record design should use `profile_summary` plus `memory_items`

---

## 3. Data Model

### 3.1 `profile_summaries`

File: `supabase/memory_profile_summary_tables.sql`

```sql
CREATE TABLE IF NOT EXISTS profile_summaries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  summary     TEXT NOT NULL DEFAULT '',
  source      TEXT NOT NULL DEFAULT 'user'
                CHECK (source IN ('user', 'assistant', 'system')),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profile_summaries_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_summaries_user_id
  ON profile_summaries(user_id);

ALTER TABLE profile_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_summaries_select"
  ON profile_summaries FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profile_summaries_insert"
  ON profile_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_summaries_update"
  ON profile_summaries FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "profile_summaries_delete"
  ON profile_summaries FOR DELETE USING (auth.uid() = user_id);
```

### 3.2 `memory_items`

```sql
CREATE TABLE IF NOT EXISTS memory_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'general',
  source          TEXT NOT NULL DEFAULT 'conversation'
                    CHECK (source IN ('conversation', 'report', 'plan', 'system')),
  source_ref      TEXT,
  confidence      NUMERIC(3,2) NOT NULL DEFAULT 0.70,
  status          TEXT NOT NULL DEFAULT 'system_inferred'
                    CHECK (status IN ('system_inferred', 'user_confirmed', 'archived')),
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_items_user_id
  ON memory_items(user_id);

CREATE INDEX IF NOT EXISTS idx_memory_items_user_status_updated
  ON memory_items(user_id, status, updated_at DESC);

ALTER TABLE memory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memory_items_select"
  ON memory_items FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "memory_items_insert"
  ON memory_items FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "memory_items_update"
  ON memory_items FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "memory_items_delete"
  ON memory_items FOR DELETE USING (auth.uid() = user_id);
```

### 3.3 Model Boundary

- `child_profiles` remains the authoritative source for structured profile fields
- `profile_summaries` stores one short human-readable summary
- `memory_items` stores internal, retrieval-oriented memory records
- Do not store memory in the `users` table
- Do not add `extracted_facts TEXT[]` to `child_profiles`

---

## 4. Injection Rules

### 4.1 Prompt Assembly Rule

The prompt should assemble user context in this order:

1. Structured child profile facts
2. `profile_summary` if non-empty
3. Top 3 to 5 relevant `memory_items`
4. Dynamic module injection

### 4.2 Injection Size Rule

- `profile_summary` should be short enough to stay under roughly 800 characters
- `memory_items` should be injected selectively, not wholesale
- If no retrieval logic exists yet, inject zero memory items rather than all memory items

### 4.3 Backward Compatibility Rule

`lib/prompts.ts` may keep accepting:

- `familyNotes?: string`
- `extractedFacts?: string[]`

But the canonical storage mapping should become:

- `familyNotes` -> `profile_summary`
- `extractedFacts` -> temporary compatibility alias for retrieved `memory_items`

---

## 5. API Shape

All routes under `pages/api/memory/`.

### API Boundary Rule

- Browser does not write memory directly to Supabase
- Summary writes go through authenticated API routes
- Memory extraction and memory updates remain server-owned

### 5.1 `GET /api/memory/summary`

Returns the current summary for the logged-in user.

```json
{
  "summary": {
    "text": "Child is 7, struggles with transitions, benefits from visual schedules.",
    "source": "user",
    "updatedAt": "2026-03-14T10:00:00Z"
  }
}
```

### 5.2 `PUT /api/memory/summary`

Updates the user-editable summary.

```json
{
  "summary": "Child is 7, struggles with transitions, benefits from visual schedules."
}
```

Rules:

- auth required
- max length 800 characters
- trim whitespace
- empty string allowed
- update or upsert the per-user summary record

### 5.3 `POST /api/memory/extract`

Internal route for server-side extraction from a conversation turn or report result.

Input:

```json
{
  "source": "conversation",
  "sourceRef": "conversation_id",
  "content": "raw conversation transcript or derived payload"
}
```

Rules:

- internal or protected route only
- deduplicate near-identical memory items
- cap inserts to a small number per run
- writes `memory_items` only, not `child_profiles`

### 5.4 `GET /api/memory/relevant`

Returns a small list of currently relevant memory items for prompt injection.

```json
{
  "items": [
    {
      "id": "uuid",
      "content": "Transitions before school are especially difficult on Mondays.",
      "category": "routine",
      "status": "system_inferred"
    }
  ]
}
```

Rules:

- auth required
- default limit 3
- absolute max limit 5
- retrieval can start with keyword/rule heuristics for MVP
- do not introduce vector search unless a later scale need is proven

---

## 6. UI Scope

### 6.1 MVP UI

- Add a small editable summary section later as part of the profile experience
- Do not add a memory management screen in MVP
- Do not expose raw `memory_items` yet

### 6.2 Future UI, Not In This Pass

- “What Qimi remembers” inspection screen
- user confirmation flow for inferred memories
- archive / delete controls for individual memory items

---

## 7. Prompt Builder Alignment

`lib/prompts.ts` should evolve toward:

- `familyNotes` becoming a compatibility field backed by `profile_summary`
- `extractedFacts` no longer meaning “all facts ever extracted”
- `buildUserContextSection()` receiving already-curated memory input

The prompt builder should not become the system of record for memory design.

---

## 8. Acceptance Criteria

- [ ] The architecture clearly separates structured profile, summary, and memory layers
- [ ] `extractedFacts` is no longer treated as the canonical stored web data model
- [ ] No new route is required for MVP adoption
- [ ] The summary remains user-editable and short
- [ ] Memory item injection is capped and selective
- [ ] `npx eslint` passes with no new warnings
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes

---

## 9. Execution Task List

### Task Execution Metadata

- Implementation mode: `linear`
- Acceptance mode: `single-item gate`
- Machine gate:
  - required checks: `npx eslint`, `npx tsc --noEmit`, `npm run build`
  - smoke test: summary read/write plus relevant-memory retrieval must work manually for the affected slice
  - contract consistency check: prompt contract, schema, and API boundaries must remain aligned with `/docs/system-architecture.md` and this spec
- Human gate: allowed only after machine gate passes and P0/P1 review findings are zero

### T001: Add schema spec
- **File**: `supabase/memory_profile_summary_tables.sql`
- **Do**: Add `profile_summaries` and `memory_items` tables with RLS and per-user indexes.
- **Verify**: schema aligns with this spec and existing `users` / `child_profiles` ownership rules.
- **Commit**: `[T001] feat: add memory and profile summary schema`

### T002: Add summary API
- **File**: `pages/api/memory/summary.ts`
- **Do**: Implement authenticated GET/PUT for the single per-user summary record.
- **Verify**: `npx eslint` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T002] feat: add profile summary API`

### T003: Add internal extraction route
- **File**: `pages/api/memory/extract.ts`
- **Do**: Implement a protected server-owned path that writes a few deduplicated `memory_items`.
- **Verify**: `npx eslint` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T003] feat: add memory extraction route`

### T004: Add relevant-memory retrieval route
- **File**: `pages/api/memory/relevant.ts`
- **Do**: Return up to 3 to 5 relevant memory items for injection using simple heuristics first.
- **Verify**: `npx eslint` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T004] feat: add relevant memory retrieval route`

### T005: Align prompt builder
- **File**: `lib/prompts.ts`
- **Do**: Keep backward-compatible fields, but treat `familyNotes` as summary input and `extractedFacts` as curated retrieved memory input rather than canonical storage.
- **Verify**: `npx eslint` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T005] refactor: align prompt builder with summary and memory layering`
