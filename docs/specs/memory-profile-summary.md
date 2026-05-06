# Module Spec: Memory And Profile Summary

> Status: REVISED — 2026-03-17 | Self-reviewed: 2026-03-17 | Cross-reviewed: 2026-03-17, 2 P0 + 5 P1 fixed | Implementation status: Partially implemented
> Module: memory-profile-summary
> Routes: `pages/api/memory/`
> Scope: Conversation-derived memory extraction (A.U.D.N.) + editable family summary + prompt injection
> SOP v2.4 status: Requires refresh before prompt/chat integration; current-code facts must use line evidence.

---

## 0. Planning Baseline

### Blueprint Traceability

| Spec Element | Blueprint Source | Blueprint Text |
|---|---|---|
| 10 fact categories | § 6.3 记忆提取系统 | `child_info, school, family, behavior, preference, medical, concern, goal, progress, sports` |
| A.U.D.N. lifecycle | § 6.3 Decision | `ADD / UPDATE / DELETE / NOOP` |
| Extraction trigger | § 6.3 + 后台处理 | `每次用户对话后自动运行` / `异步执行：记忆提取` |
| Extraction input | § 6.3 Extract | `LLM 从最近 10 条用户消息中提取结构化事实` |
| Extraction principle | § 6.3 | `宁多勿漏，不确定的降低 confidence` |
| familyNotes merge | § 6.3 Merge | `更新 familyNotes（自然语言摘要，≤200 字）采用 Mem0 模式：保留已有 + 融合新增` |
| Injection rule | Layer 4 用户上下文注入 | `语义检索：extractedFacts（≤5 条最相关事实）；若事实 ≤5 条全返回，>5 条由 LLM 判断相关性` |
| Fact schema | 用户档案 | `{ id, category, key, value, confidence, source: { threadId, extractedAt } }` |

### Blueprint Deviations

| Deviation | Blueprint Says | MVP Decision | Reason | Upgrade Path |
|---|---|---|---|---|
| Retrieval algorithm | LLM judges relevance for >5 facts | Heuristic scoring (confidence × 0.5 + recency × 0.3 + usage × 0.2) | Cost efficiency — avoid extra LLM call per chat turn | Replace scoring with LLM relevance call in retrieval route |
| Extraction trigger location | Server-side async after done event | Client-side fire-and-forget POST after receiving `done` SSE | Avoids cross-module edit to `stream.ts`; see § 3.1 | Move to server-side hook when chat module supports extraction callbacks |

### References

- Cross-platform blueprint: `/Users/jamesguu/WeChatProjects/adhdhelper-cursor/docs/项目技术蓝图.md` § 6.3
- System architecture: `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/system-architecture.md`
- Prompt contract: `/Users/jamesguu/qimi-ai-website/qimi-ai-website/lib/prompts.ts`
- Family Profile spec: `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/specs/family-profile.md`

### Current Implementation Snapshot

- `lib/prompts.ts` accepts `familyNotes?: string` and `extractedFacts?: string[]`
- `profile_summaries` and `memory_items` tables exist in `supabase/migrations/20260506000300_memory_profile_summary_tables.sql:L3-L59`
- Memory API routes exist under `pages/api/memory/`; extraction starts in `pages/api/memory/extract.ts:L1-L18`, and relevant retrieval starts in `pages/api/memory/relevant.ts:L1-L53`
- Chat stream handler (`pages/api/chat/stream.ts`) has no post-completion hook

### Execution Baseline

- Validation commands: `npx eslint`, `npx tsc --noEmit`, `npm run build`

---

## 1. Design Goal

Implement the blueprint's A.U.D.N. memory extraction system for the web app:

1. **Extract** structured facts from conversations automatically after each chat session
2. **Store** facts as `memory_items` with the blueprint's 10-category schema
3. **Merge** a natural-language `profile_summary` (≤200 chars) using Mem0 pattern
4. **Inject** relevant facts + summary into the prompt on each turn
5. **Lifecycle** facts with A.U.D.N. (Add/Update/Delete/Noop) on subsequent extractions

This module is the backend intelligence layer. The Family Profile page displays extracted facts read-only (see `family-profile.md`).

---

## 2. Data Model

### 2.1 `profile_summaries`

Migration source of truth: `supabase/migrations/20260506000300_memory_profile_summary_tables.sql`

Legacy reference snippet: `supabase/memory_profile_summary_tables.sql`

```sql
CREATE TABLE IF NOT EXISTS profile_summaries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  summary     TEXT NOT NULL DEFAULT ''
                CHECK (char_length(summary) <= 200),
  source      TEXT NOT NULL DEFAULT 'system'
                CHECK (source IN ('user', 'system')),
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

Rules:
- One row per user (UNIQUE constraint on `user_id`)
- `source = 'system'`: auto-generated by A.U.D.N. merge step
- `source = 'user'`: manually edited by user on Family Profile page
- Max length: 200 characters (per blueprint: `familyNotes ≤200 字`)
- User edits override system-generated summary; next merge preserves user edits as base

### 2.2 `memory_items`

```sql
CREATE TABLE IF NOT EXISTS memory_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category        TEXT NOT NULL
                    CHECK (category IN (
                      'child_info', 'school', 'family', 'behavior',
                      'preference', 'medical', 'concern', 'goal',
                      'progress', 'sports'
                    )),
  fact_key        TEXT NOT NULL,
  fact_value      TEXT NOT NULL,
  confidence      NUMERIC(3,2) NOT NULL DEFAULT 0.70,
  source          TEXT NOT NULL DEFAULT 'conversation'
                    CHECK (source IN ('conversation', 'report', 'plan')),
  source_ref      TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'archived')),
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_items_user_id
  ON memory_items(user_id);

CREATE INDEX IF NOT EXISTS idx_memory_items_user_category
  ON memory_items(user_id, category);

CREATE INDEX IF NOT EXISTS idx_memory_items_user_active
  ON memory_items(user_id, status, updated_at DESC);

-- Prevent duplicate facts: same user + category + key = one fact
CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_items_user_category_key
  ON memory_items(user_id, category, fact_key) WHERE status = 'active';

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

### 2.3 Category Enum (from blueprint § 6.3)

| Category | Chinese | Description | Examples |
|---|---|---|---|
| `child_info` | 孩子基本信息 | Name, age, gender, school | "Child is 7 years old", "In 2nd grade" |
| `school` | 学习相关 | Grades, subjects, teacher feedback | "Struggles with math", "Teacher says focus is improving" |
| `family` | 家庭情况 | Parents, siblings, living situation | "Single parent household", "Has a younger sister" |
| `behavior` | 行为表现 | Habits, problem behaviors, daily patterns | "Hits when frustrated", "Calms down with deep breathing" |
| `preference` | 偏好兴趣 | Likes, hobbies, activities | "Loves Lego", "Hates loud noises" |
| `medical` | 医疗相关 | Diagnosis, medication, doctor advice | "Diagnosed ADHD-C", "On 10mg Ritalin" |
| `concern` | 家长担忧 | Pain points, worries | "Worried about social skills", "School suspension threat" |
| `goal` | 家长期望 | Goals, wishes | "Wants child to make friends", "Aiming for homework independence" |
| `progress` | 进步记录 | Positive changes, milestones | "Sat through dinner last week", "No tantrums for 3 days" |
| `sports` | 运动相关 | Exercise habits, activities | "Swims twice a week", "Avoids team sports" |

### 2.4 Fact Schema (per blueprint 用户档案)

Each `memory_item` maps to the blueprint's `extractedFact`:

| Blueprint field | DB column | Notes |
|---|---|---|
| `id` | `id` (UUID) | Auto-generated |
| `category` | `category` | Enum of 10 values |
| `key` | `fact_key` | Short label, e.g. "age", "medication_name" |
| `value` | `fact_value` | Fact content, e.g. "7 years old", "Ritalin 10mg" |
| `confidence` | `confidence` | 0.00–1.00, default 0.70 |
| `source.threadId` | `source_ref` | conversation_id |
| `source.extractedAt` | `created_at` | Timestamp |

### 2.5 Model Boundary

- `child_profiles` = structured profile (birthday, gender, challenges from onboarding)
- `profile_summaries` = one natural-language family summary (≤200 chars)
- `memory_items` = conversation-derived structured facts (10 categories)
- Do NOT store extracted facts in `child_profiles` or `users` table

---

## 3. A.U.D.N. Extraction System

### 3.1 Trigger

Blueprint: `每次用户对话后自动运行` / `异步执行：记忆提取`

**Client-side trigger** (avoids cross-module edit to `pages/api/chat/stream.ts`):

- The chat client (`stores/chatStore.ts` or the component calling the stream) already receives the `done` SSE event
- After receiving `done`, the client fires a fire-and-forget `POST /api/memory/extract` with the `conversationId`
- Implementation: create a `hooks/useMemoryExtraction.ts` hook that listens for stream completion and triggers extraction
- Only trigger if: user is authenticated (not guest) AND conversation has ≥2 user messages

**Why client-side**: `pages/api/chat/stream.ts` is in the chat module namespace. Per CLAUDE.md concurrency rules, the memory module must not modify files outside `pages/api/memory/` and `components/Memory/`. The client-side trigger achieves the same result without cross-module coupling.

**Future upgrade**: When the chat module adds a post-completion callback system, extraction can move server-side for reliability.

### 3.2 Extraction Input

Blueprint: `LLM 从最近 10 条用户消息中提取结构化事实`

- Load the last 10 user messages from the conversation (from `messages` table)
- Also load the user's existing `memory_items` (active only) for A.U.D.N. comparison
- Send both to DeepSeek with the extraction prompt

### 3.3 Extraction Prompt

The extraction API sends a structured prompt to DeepSeek:

```
You are a family information extraction assistant. Analyze the following conversation messages from a parent discussing their ADHD child.

Extract structured facts into these 10 categories:
- child_info: Basic info (name, age, gender, school)
- school: Learning (grades, subjects, teacher feedback)
- family: Family situation (parents, siblings, living)
- behavior: Behavior patterns (habits, problem behaviors)
- preference: Interests and preferences
- medical: Medical info (diagnosis, medication, doctor advice)
- concern: Parent worries and pain points
- goal: Parent goals and wishes
- progress: Positive changes and milestones
- sports: Exercise and physical activities

EXISTING FACTS (for A.U.D.N. comparison):
{existing_facts_json}

NEW CONVERSATION MESSAGES:
{recent_messages}

For each fact found, output JSON:
{
  "facts": [
    {
      "action": "ADD" | "UPDATE" | "DELETE" | "NOOP",
      "category": "<one of 10 categories>",
      "key": "<short label>",
      "value": "<fact content>",
      "confidence": <0.0 to 1.0>,
      "existing_id": "<uuid of existing fact if UPDATE/DELETE, null if ADD>"
    }
  ],
  "summary_update": "<updated family summary in ≤200 chars, or null if no change>"
}

Rules:
- Principle: "Rather extract too much than miss facts" — when uncertain, still extract with lower confidence
- ADD: New fact not in existing facts
- UPDATE: Existing fact whose value has changed
- DELETE: Existing fact explicitly contradicted by the user
- NOOP: Existing fact that is still consistent — do NOT include NOOP items in output
- Do NOT extract facts already covered by existing facts with same meaning
- summary_update: Merge new information into existing summary using Mem0 pattern (preserve existing + blend new)
```

### 3.4 A.U.D.N. Execution

After LLM returns extracted facts:

| Action | DB Operation |
|---|---|
| `ADD` | `INSERT` new row into `memory_items` |
| `UPDATE` | `UPDATE` existing row's `fact_value`, `confidence`, `updated_at` |
| `DELETE` | `UPDATE` existing row's `status` to `'archived'` (soft delete) |
| `NOOP` | Skip (not included in LLM output) |

- Cap: max 10 fact operations per extraction run
- If `summary_update` is non-null, upsert `profile_summaries` with `source = 'system'`
- If user has manually edited summary (`source = 'user'`): check if `char_length(existing) + 2 + char_length(summary_update) <= 200`. If yes, concatenate with `'; '` separator and keep `source = 'user'`. If no, skip the summary update entirely. Do NOT truncate or overwrite user text.

### 3.5 Deduplication

- The unique index `(user_id, category, fact_key) WHERE status = 'active'` prevents duplicate active facts
- Before INSERT, check if same `(category, fact_key)` exists — if so, treat as UPDATE instead of ADD
- This handles cases where LLM outputs ADD but the fact already exists

---

## 4. Retrieval Algorithm

### 4.1 Relevant Facts for Prompt Injection

Blueprint: `语义检索：extractedFacts（≤5 条最相关事实）；若事实 ≤5 条全返回，>5 条由 LLM 判断相关性`

MVP implementation (no vector search):

1. Load all `active` memory items for the user
2. If ≤5 items: return all of them
3. If >5 items: use simple heuristic ranking:
   - Score = `confidence * 0.5 + recency_score * 0.3 + usage_score * 0.2`
   - `recency_score` = 1.0 if updated in last 7 days, 0.5 if 7–30 days, 0.2 if older
   - `usage_score` = 1.0 if `last_used_at` within 3 days, 0.5 if 3–14 days, 0.0 if older or null
   - Return top 5 by score

Evidence layering: This retrieval algorithm is an **internal design choice** for MVP. The blueprint specifies "LLM judges relevance" for >5 facts, but for MVP cost efficiency we use heuristic scoring. Can be upgraded to LLM-based relevance later.

### 4.2 Update `last_used_at`

When facts are retrieved for injection, update their `last_used_at` to `NOW()`. This feeds back into the usage score for future retrievals.

---

## 5. Injection Rules

### 5.1 Prompt Assembly Order

Per blueprint Layer 4:

1. Structured child profile facts (from `child_profiles`)
2. `profile_summary` (from `profile_summaries`) — always injected if non-empty
3. Top ≤5 relevant `memory_items` — formatted as bullet list
4. Dynamic module injection (knowledge modules)

### 5.2 Injection Format

```
**Family Summary**: {profile_summary text}

**Information from Previous Conversations**:
- [{category}] {fact_key}: {fact_value}
- [{category}] {fact_key}: {fact_value}
...
```

### 5.3 Injection Size Guardrails

- `profile_summary`: max 200 characters
- `memory_items`: max 5 items, each typically <100 characters
- Total injection budget for memory layer: ~500 characters max

### 5.4 Backward Compatibility

`lib/prompts.ts` keeps accepting:
- `familyNotes?: string` — mapped from `profile_summaries.summary`
- `extractedFacts?: string[]` — mapped from retrieved `memory_items` formatted as `"[{category}] {key}: {value}"`

---

## 6. API Shape

All routes under `pages/api/memory/`.

### 6.1 `GET /api/memory/summary`

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

### 6.2 `PUT /api/memory/summary`

Updates the user-editable summary.

```json
{
  "summary": "Child is 7, struggles with transitions, benefits from visual schedules."
}
```

Rules:
- Auth required
- Max length 200 characters
- Trim whitespace
- Empty string allowed (clears summary)
- Sets `source = 'user'`

### 6.3 `POST /api/memory/extract`

Server-owned extraction route. Called asynchronously after chat stream completes.

Input:
```json
{
  "conversationId": "uuid"
}
```

Processing:
1. Load last 10 user messages from `messages` table for this conversation
2. Load user's existing active `memory_items`
3. Call DeepSeek with extraction prompt (§ 3.3)
4. Parse LLM response, execute A.U.D.N. operations (§ 3.4)
5. Update `profile_summaries` if `summary_update` is non-null (§ 3.4)

Rules:
- Auth required via `getServerSession` (browser calls this route with session cookie after stream completes)
- Cap: max 10 fact operations per run
- On LLM failure or parse error: log and silently skip (do not break user flow)
- Returns `{ success: true, added: N, updated: N, deleted: N }`

### 6.4 `GET /api/memory/relevant`

Returns relevant memory items for prompt injection.

```json
{
  "items": [
    {
      "id": "uuid",
      "category": "behavior",
      "key": "calming_method",
      "value": "Deep breathing works well",
      "confidence": 0.85
    }
  ],
  "summary": "7-year-old boy with ADHD-C, responds well to visual schedules"
}
```

Rules:
- Auth required
- Returns ≤5 items using retrieval algorithm (§ 4.1)
- Updates `last_used_at` on returned items
- Also returns `profile_summary` text for convenience

### 6.5 `GET /api/memory/facts`

Returns all active facts for display on Family Profile page.

```json
{
  "facts": [
    {
      "id": "uuid",
      "category": "medical",
      "key": "diagnosis",
      "value": "ADHD-Combined type",
      "confidence": 0.95,
      "updatedAt": "2026-03-17T10:00:00Z"
    }
  ]
}
```

Rules:
- Auth required
- Returns all active facts grouped by category
- Used by Family Profile `ExtractedFactsSection` component (read-only display)

---

## 7. UI Scope

### 7.1 MVP UI

- Family Profile page displays extracted facts read-only (see `family-profile.md` ExtractedFactsSection)
- Family Profile page displays editable summary (see `family-profile.md` FamilySummarySection)
- No standalone "memory center" page

### 7.2 Future UI (not in this pass)

- "What Qimi remembers" inspection screen with edit/delete per fact
- User confirmation flow for low-confidence inferred facts
- Fact history timeline

---

## 8. Acceptance Criteria

- [ ] `memory_items` table has CHECK constraint for 10 blueprint categories
- [ ] `memory_items` has `fact_key` and `fact_value` columns matching blueprint schema
- [ ] `profile_summaries.summary` has DB-level CHECK constraint `char_length(summary) <= 200`
- [ ] `profile_summaries` API enforces ≤200 character limit
- [ ] Extraction runs asynchronously after chat stream completion
- [ ] Extraction prompt includes A.U.D.N. comparison with existing facts
- [ ] Extraction caps at 10 operations per run
- [ ] Retrieval returns ≤5 facts with scoring heuristic
- [ ] Retrieved facts update `last_used_at`
- [ ] Prompt builder receives `familyNotes` from `profile_summaries` and `extractedFacts` from retrieved `memory_items`
- [ ] `npx eslint` passes with no new warnings
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes

---

## 9. Execution Task List

### Task Execution Metadata

- Implementation mode: `linear`
- Acceptance mode: `single-item gate`
- Machine gate:
  - Required checks: `npx eslint`, `npx tsc --noEmit`, `npm run build`
  - Smoke test: extraction from a test conversation, retrieval of facts, summary read/write
  - Contract consistency check: prompt contract, schema, and API boundaries must remain aligned with `/docs/system-architecture.md` and this spec
- Human gate: allowed only after machine gate passes and P0/P1 review findings are zero

### T001: Add schema
- **File**: `supabase/migrations/20260506000300_memory_profile_summary_tables.sql`
- **Do**: Create `profile_summaries` and `memory_items` tables per § 2.1 and § 2.2. Include RLS policies, indexes, and the unique constraint on `(user_id, category, fact_key)`.
- **Verify**: SQL is valid, categories match the 10-value CHECK constraint, columns match § 2.4.
- **Commit**: `[T001] feat: add memory_items and profile_summaries schema`

### T002: Add summary API
- **File**: `pages/api/memory/summary.ts`
- **Do**: Implement authenticated GET/PUT for `profile_summaries`. GET returns current summary. PUT upserts with `source = 'user'`, max 200 chars.
- **Auth pattern**: `getServerSession` + `getSupabaseAdmin()` per CLAUDE.md.
- **Verify**: `npx eslint`, `npx tsc --noEmit`, `npm run build` pass.
- **Commit**: `[T002] feat: add profile summary GET/PUT API`

### T003: Add extraction route
- **File**: `pages/api/memory/extract.ts`
- **Do**: Implement `POST /api/memory/extract` per § 3 and § 6.3.
  - Accept `{ conversationId }`.
  - Load last 10 user messages from `messages` table.
  - Load existing active `memory_items` for the user.
  - Build extraction prompt per § 3.3, call DeepSeek.
  - Parse response, execute A.U.D.N. (INSERT/UPDATE/archive).
  - Upsert `profile_summaries` if `summary_update` is non-null.
  - Cap at 10 operations. Silently skip on LLM/parse errors.
- **Auth pattern**: `getServerSession` + `getSupabaseAdmin()`.
- **Verify**: `npx eslint`, `npx tsc --noEmit`, `npm run build` pass.
- **Commit**: `[T003] feat: add A.U.D.N. memory extraction route`

### T004: Add client-side extraction trigger hook
- **File**: `hooks/useMemoryExtraction.ts`
- **Do**: Create a custom hook `useMemoryExtraction(conversationId: string | null)` that:
  - Exposes a `triggerExtraction()` function
  - When called, fires a fire-and-forget `fetch('POST', '/api/memory/extract', { conversationId })` — do NOT await the response
  - Only fires if user is authenticated (check session) and `conversationId` is not null
  - Debounce: do not fire more than once per 30 seconds per conversation
- **Integration note**: The chat component should call `triggerExtraction()` when it receives the `done` SSE event. Since we cannot modify `stores/chatStore.ts` or `components/Chat/*`, this hook should be integrated by the chat module owner. Tag commit with `[NEEDS_CHAT_INTEGRATION]`.
- **Verify**: `npx eslint`, `npx tsc --noEmit`, `npm run build` pass.
- **Commit**: `[T004] feat: add useMemoryExtraction hook [NEEDS_CHAT_INTEGRATION]`

### T005: Add retrieval route
- **File**: `pages/api/memory/relevant.ts`
- **Do**: Implement `GET /api/memory/relevant` per § 4 and § 6.4.
  - Load active memory items for user.
  - If ≤5, return all. If >5, score and return top 5.
  - Update `last_used_at` on returned items.
  - Also return `profile_summary` text.
- **Auth pattern**: `getServerSession` + `getSupabaseAdmin()`.
- **Verify**: `npx eslint`, `npx tsc --noEmit`, `npm run build` pass.
- **Commit**: `[T005] feat: add relevant memory retrieval route`

### T006: Add facts listing route
- **File**: `pages/api/memory/facts.ts`
- **Do**: Implement `GET /api/memory/facts` per § 6.5. Returns all active facts for the user, grouped by category. Used by Family Profile page.
- **Auth pattern**: `getServerSession` + `getSupabaseAdmin()`.
- **Verify**: `npx eslint`, `npx tsc --noEmit`, `npm run build` pass.
- **Commit**: `[T006] feat: add memory facts listing route for Family Profile`

### T007: Document prompt integration handoff
- **File**: `docs/specs/memory-profile-summary.md` (this spec, § 5 Injection Rules)
- **Do**: This task is a **cross-module handoff** — the memory module provides the `GET /api/memory/relevant` endpoint (T005), and the chat module owner must integrate it into `pages/api/chat/stream.ts`. Document the integration contract:
  - Chat stream calls `GET /api/memory/relevant` (with forwarded session) before building the system prompt
  - Maps response: `familyNotes` ← `summary`, `extractedFacts` ← `items.map(i => "[" + i.category + "] " + i.key + ": " + i.value)`
  - Passes both to `buildSystemMessage()` via the existing `userProfile` parameter
- **IMPORTANT**: Do NOT modify `pages/api/chat/stream.ts` or `lib/prompts.ts` in this module's branch. Tag with `[NEEDS_CHAT_INTEGRATION]`.
- **Verify**: Integration contract is fully documented and testable.
- **Commit**: `[T007] docs: document memory→chat prompt injection handoff [NEEDS_CHAT_INTEGRATION]`
