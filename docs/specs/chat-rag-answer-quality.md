# Module Spec: Chat RAG Answer Quality

> Status: PLANNED - MVP launch hardening P0, created 2026-06-10
> Module: shared-chat / RAG answer quality
> Routes: `/chat`, `pages/api/chat/stream.ts`
> Implementation status: Planned; this document is the implementation baseline for the next repair slice
> SOP status: Planned with Search Ledger, ADR-lite, AQS self-review, and explicit acceptance gates.

---

## 0. Planning Baseline

### Product Decision

This slice tightens the Web chat answer system so it matches the mini-program's proven anti-drift behavior more closely.

It is not a new user-facing module. It is shared chat infrastructure launch hardening for the existing MVP chat loop.

The desired outcome:

1. RAG answers use full retrieved abstracts as the grounding context.
2. Same-topic follow-ups can reuse the prior paper context without drifting from short snippets.
3. Displayed sources match the papers actually available to the answer.
4. The assistant corrects unsupported parent assumptions instead of over-agreeing.
5. RAG/tool process chatter never leaks into the user-visible answer.

### Explicit Non-Goals

- Do not build Paper Topics, research search, paper browsing, paper summaries as standalone pages, or bulk abstract access.
- Do not expose full paper abstracts to the frontend except as normal source snippets already shown inside message citations.
- Do not add Redis, Vercel KV, or another new production service for MVP.
- Do not remove report/upload guidance. The UI affordance may remain and should communicate coming-soon behavior until Report Analysis is implemented.
- Do not reopen Crisis Calm, Mood Tracking, Feedback Ticket/Admin, or TCM scope as part of this slice.
- Do not implement Report Analysis or Membership/Billing in this slice.

### Current Repo Reality

Current code evidence:

- `pages/api/chat/stream.ts:37-55` strips DSML markers before saving/displaying assistant output.
- `pages/api/chat/stream.ts:180-238` has a prior-source reuse instruction, but it only uses source metadata/snippets from recent history.
- `pages/api/chat/stream.ts:677-681` injects prior source metadata only for explicit re-output/rewrite style requests.
- `pages/api/chat/stream.ts:724-729` sends and accumulates sources before the model finishes answering.
- `pages/api/chat/stream.ts:862-888` executes direct RAG with `top_k=10` when forced and injects the returned formatted text.
- `pages/api/chat/stream.ts:757-764` saves the assistant message with `sources`.
- `services/rag-service.ts:224-252` defines the current shared RAG citation policy.
- `services/rag-service.ts:330-381` feeds full abstracts into the smart-summary LLM.
- `services/rag-service.ts:434-480` returns formatted RAG text plus frontend sources, but does not return or persist the full retrieved paper set as reusable context.
- `lib/rag-router.ts:31-63` defines the structured RAG decision tool.
- `lib/rag-router.ts:140-206` returns `shouldSearch=false` on router failure, so RAG can silently degrade.
- `components/Chat/RAGSources.tsx:39-41` labels the source panel as "Based on N research papers", which can overstate the strength of evidence when retrieval results are noisy.
- `pages/api/conversations/[id]/messages.ts:108-115` reloads saved messages with `sources`, but no richer RAG metadata or reusable paper context.
- `stores/chatStore.ts:29-41` trims history sources to limit payload size, which is useful for 413 prevention but cannot support full-abstract follow-up grounding.

### Mini-Program Parity Findings

The mini-program has several anti-drift controls that Web does not fully match yet:

- It caches full RAG papers per session and injects cached full abstracts for same-topic follow-ups.
- It adds a specific rule that cached papers remain the core basis when no new RAG call is needed.
- It anchors the final answer to the current user question after RAG injection.
- It filters RAG/tool-process leakage from streamed output.
- Its system prompt strongly says the assistant should be a guardrail, not a pleasing mirror, when a parent's assumption is unsafe or unsupported.

Web has already improved full-abstract smart summary and citation policy, but it still lacks the full same-topic paper context loop and source consistency guarantees.

---

## 1. Evidence And Search Ledger

Accessed: 2026-06-10.

| ID | Query | Source | Result | Supported claim | Unsupported gap |
|----|-------|--------|--------|-----------------|-----------------|
| SL-RAG-1 | `Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks arxiv` | arXiv, "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" - https://arxiv.org/abs/2005.11401 | Found | RAG addresses limits of parametric-only models by adding explicit retrieved memory and improves factual/provenance behavior on knowledge-intensive tasks. | Does not prescribe Qimi's exact cache schema or UI source display. |
| SL-RAG-2 | `Lost in the Middle how language models use long contexts arxiv` | arXiv, "Lost in the Middle: How Language Models Use Long Contexts" - https://arxiv.org/abs/2307.03172 | Found | Models can use long context poorly, especially information placed in the middle. This supports limiting injected papers and anchoring the current question. | Does not define the exact optimal number of papers for Qimi. |
| SL-RAG-3 | `Supabase Postgres jsonb columns documentation` | Supabase docs, "Managing JSON and unstructured data" - https://supabase.com/docs/guides/database/json | Found | `jsonb` is recommended for variable-schema structured/unstructured data, with a caution not to overuse JSON where relational data is better. | Does not define Qimi's table policies or cleanup schedule. |
| SL-RAG-4 | `Supabase Row Level Security policies documentation` | Supabase docs, "Row Level Security" - https://supabase.com/docs/guides/database/postgres/row-level-security | Found | Tables in exposed schemas should use RLS for granular data security. | Does not replace Qimi's server-side ownership checks. |
| SL-RAG-5 | `Vercel Functions lifecycle invocation scale down zero` | Vercel docs, "Vercel Functions" - https://vercel.com/docs/functions | Found | Functions run per invocation, may reuse instances, and scale down to zero; durable chat context should not rely on process memory. | Does not prohibit using an external cache, but supports avoiding in-memory cache. |
| SL-RAG-6 | `OWASP LLM01 prompt injection RAG output filtering` | OWASP GenAI Security Project, "LLM01:2025 Prompt Injection" - https://genai.owasp.org/llmrisk/llm01-prompt-injection/ | Found | RAG apps can be affected by malicious retrieved content; mitigations include input/output filtering, separating untrusted content, and adversarial testing. | Does not certify any single regex filter as complete protection. |

### Evidence Layering

| Claim | Evidence type | Basis |
|-------|---------------|-------|
| Web should preserve retrieved-paper provenance for answer-time support. | External research supported | SL-RAG-1 |
| Web should avoid stuffing too much RAG context into one prompt. | External research supported | SL-RAG-2 |
| Supabase is the correct MVP store for reusable RAG context. | Official vendor docs + current architecture | SL-RAG-3, SL-RAG-4, current Supabase baseline |
| Process-leak filtering and replay tests are required for RAG safety. | External security guidance + current DSML leak handling | SL-RAG-6, `pages/api/chat/stream.ts:37-165` |
| The feature must not become a paper browser. | Internal product/compliance decision | `docs/project-control.md`, `docs/system-architecture.md` |

---

## 2. ADR-Lite

| Decision ID | Decision | Risk | External evidence | Local evidence | Supported claim | Unsupported gap | Status | Confirmation |
|-------------|----------|------|-------------------|----------------|-----------------|-----------------|--------|--------------|
| ADR-RAG-1 | Store reusable RAG paper context in Supabase, not process memory, Redis, or Vercel KV for MVP. | Normal | SL-RAG-3, SL-RAG-4, SL-RAG-5 | Supabase is already the app database; local Supabase is the required test baseline. | Durable same-topic paper context should use the existing database layer. | Exact retention window needs implementation tuning. | Accepted for plan | Confirm with local migration and ownership tests. |
| ADR-RAG-2 | Store only server-side answer-time context, not a public paper library. | High | SL-RAG-6 | Product explicitly rejects Paper Topics / Research Browser. | RAG context can improve answer quality without creating redistribution risk. | Legal review may still refine retention copy later. | Accepted for plan | Verify no route exposes bulk paper records. |
| ADR-RAG-3 | Inject cached full abstracts only for same-topic follow-ups and limit to top 6-8 papers. | Normal | SL-RAG-1, SL-RAG-2 | Mini-program uses cached papers successfully; Web currently trims historical source snippets. | Cached full abstracts reduce drift while limiting long-context degradation. | The exact top-N may change after replay tests. | Accepted for plan | Replay should measure source consistency and answer quality. |
| ADR-RAG-4 | Reconcile displayed sources with the papers injected or cited in the answer. | Normal | SL-RAG-1 | `RAGSources` currently says "Based on N" from returned sources. | The UI should not overstate the evidence base or show unrelated retrieval noise as support. | Automatic URL matching cannot prove every claim is grounded. | Accepted for plan | Add URL/PMID/DOI consistency checks in replay. |
| ADR-RAG-5 | Add RAG-process output filtering in addition to DSML filtering. | Normal | SL-RAG-6 | Current filter focuses on DSML, not "I am calling/searching" text. | User-visible answers should not expose tool chatter, query JSON, or internal process. | Regex filters are incomplete against arbitrary leakage. | Accepted for plan | Add regression cases for known leakage patterns. |
| ADR-RAG-6 | Strengthen the Web prompt with anti-sycophancy and exact-number-source rules. | High | SL-RAG-6 | Mini-program prompt already contains stronger guardrail-over-agreement language. | The assistant should correct unsafe/unsupported assumptions rather than please the parent. | Prompt rules alone do not guarantee behavior. | Accepted for plan | Replay must include over-agreeing checks. |

---

## 3. Scope

### 3.1 P0 In Scope

1. **RAG context persistence**
   - Add a server-side Supabase table for reusable RAG paper context.
   - Store conversation/session scoped paper metadata and full abstracts used for answer-time grounding.
   - Include `expires_at` so retention can be cleaned up later.

2. **Same-topic cached RAG injection**
   - Before answer generation, load the latest active RAG context for the current conversation or guest session.
   - If the router says no new search is needed and the cached context matches the same topic, inject cached papers as the answer's research basis.
   - If a new RAG search runs, replace the active context with the new retrieved-paper context.

3. **Question anchoring**
   - After new or cached RAG injection, append a system instruction containing the current user question.
   - Require the model to answer that question directly and avoid expanding nearby paper topics into unsupported conclusions.

4. **Source consistency**
   - Save and show sources from the papers actually injected into the answer context.
   - After generation, reconcile Markdown links, PMID, or DOI references in the answer against current/cached RAG context.
   - Change source panel copy away from "Based on N research papers" to a less overclaiming label such as "Research sources for this answer".

5. **RAG process leakage filter**
   - Add a helper that removes common tool/process artifacts from streamed and final content.
   - Cover English and Chinese leakage patterns, JSON-looking tool calls, and "I will search/call/query" phrases.

6. **Prompt parity hardening**
   - Add explicit "guardrail over agreement" language to `SYSTEM_PROMPT_LITE`.
   - Add exact-number-source discipline: concrete numbers, sample sizes, frequencies, durations, percentages, and effect claims must come from retrieved or visible context.
   - Keep report/evaluation upload guidance intact.

7. **Replay and acceptance checks**
   - Extend `scripts/replay-rag-drift-web.mjs` as the primary functional regression harness.
   - Add assertions for source URL consistency, same-topic cached reuse, process-leak absence, and over-agreeing.

### 3.2 P1 Carry-Forward

- Conversation-level compressed summary, if long multi-turn replay still loses context after P0.
- Stronger ranking or reranking of RAG results before context injection.
- Full structured `ragMetadata` on messages if source reconciliation needs richer historical traceability.
- Scheduled cleanup job for expired RAG context rows if manual retention cleanup is insufficient at launch scale.

### 3.3 Out Of Scope

- Report Analysis.
- Membership/Billing.
- Paper browser/search UI.
- Public paper API.
- Upload analysis.
- TCM module reintroduction.
- Crisis Calm.
- Feedback/admin ticket system.

---

## 4. Proposed Data Model

Suggested table name: `conversation_rag_contexts`.

```sql
create table conversation_rag_contexts (
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
  expires_at timestamptz not null
);
```

Rules:

- At least one of `conversation_id` or `guest_session_id` must be present.
- `papers` should contain only answer-time grounding fields: title, abstract, year, journal, authors, DOI, PMID, URL, score, topic/type when returned.
- `sources` should contain the frontend-safe source objects.
- Full abstracts remain server-side prompt context; they are not exposed as a browsing surface.
- Enable RLS. Access should be through server-side API code using the same ownership boundary as conversations.
- Add indexes for `(conversation_id, created_at desc)`, `(guest_session_id, created_at desc)`, and `expires_at`.

Retention:

- MVP default: expire contexts after 24 hours or after conversation replacement by a newer same-topic context.
- Do not treat this as long-term memory. Conversation memory remains owned by `memory_items` and `profile_summaries`.

---

## 5. Runtime Design

### 5.1 Request Flow

1. Build base system prompt with profile and dynamic modules.
2. Load recent conversation history.
3. Load latest active RAG context for `conversation_id` or guest session.
4. Call RAG router with:
   - current user question,
   - recent conversation,
   - whether cached RAG context exists,
   - cached topic/query summary.
5. If `forceRAG` or router says `shouldSearch=true`:
   - search RAG,
   - keep top candidate set internally,
   - inject top 6-8 full abstracts or smart summary plus source links,
   - save/replace context.
6. If router says `shouldSearch=false` and cached context is same-topic:
   - inject cached full abstracts as the core research basis,
   - do not perform a new search.
7. Append question anchoring instruction.
8. Stream answer through DSML and RAG-process filters.
9. Reconcile answer citations against current/cached sources before saving.
10. Save final assistant message with cleaned content and reconciled sources.

### 5.2 RAG Router Policy

The router should still avoid unnecessary repeated searches, but it must not degrade silently in high-risk evidence turns.

Rules:

- If RAG is enabled and the user asks for child intervention, safety, effectiveness, dosage-like frequency, schedule, supplement/nutrition, exercise, sensory training, medication-adjacent, or evidence comparison guidance, uncertainty should lean toward `shouldSearch=true`.
- If the same-topic cached paper context is available and fresh, `shouldSearch=false` is acceptable.
- If the router fails, fallback should be conservative for evidence-sensitive turns. It should not simply skip RAG without a logged warning and fallback policy.

### 5.3 Source Display Policy

The source panel must be descriptive, not an evidence-strength claim.

Allowed copy:

- "Research sources for this answer"
- "Sources available for this answer"

Avoid:

- "Based on 10 research papers" when only some papers are directly relevant or actually cited.
- Any wording that implies all retrieved papers directly support the answer.

### 5.4 Citation Policy

The assistant may cite fewer papers than retrieved.

Rules:

- Citation count is not a quality target.
- A cited source must correspond to a paper injected into current or cached RAG context.
- Specific numbers require the source abstract or visible context to state them.
- Direct vs indirect evidence must be labeled plainly.
- If no direct paper supports the claim, say that rather than stretching adjacent papers.

### 5.5 Prompt Parity Policy

Add Web prompt language equivalent to the mini-program's "把关，而非顺从" rule:

- The assistant should validate parent effort and emotion without validating unsupported conclusions.
- If a parent proposes a risky, unsupported, or overconfident interpretation, the assistant should correct it respectfully and explain the safer framing.
- The assistant must not invent personal experience.
- The assistant must not invent studies, numbers, sample sizes, institutions, mechanisms, or outcomes.

---

## 6. Acceptance Plan

### 6.1 Technical Acceptance

Run on local Supabase first.

Required checks:

1. Confirm branch and dirty worktree before implementation.
2. Apply migration locally only.
3. Run `npm run build`.
4. Run chat API smoke test locally.
5. Verify local environment does not default to production Supabase.
6. Verify no public route exposes `conversation_rag_contexts` records.
7. Verify expired or replaced context behavior locally.

### 6.2 Functional Acceptance

Use `scripts/replay-rag-drift-web.mjs` plus targeted tests.

Pass conditions:

- 12-turn drift replay completes.
- Core drift red flags: 0.
- Over-agreeing red flags: target 0, maximum 1 before human review.
- No answer contains RAG/tool process chatter.
- Any URL/PMID/DOI cited in assistant answer exists in saved/displayed sources.
- Same-topic follow-up can answer from cached full abstracts without a new search.
- New-topic evidence question triggers a new RAG search and replaces the active context.
- No 413 payload regression from sending full paper context to the browser.

### 6.3 Human Acceptance

Human test focus:

- Does the assistant correct unsupported assumptions without sounding cold?
- Does it avoid overclaiming primitive-reflex, sensory, medication, supplement, and report-related claims?
- Do citations feel relevant to the actual answer?
- Does the source panel wording feel accurate and not overconfident?
- Does the report upload guidance remain available but not imply active report interpretation if the feature is not launched?

### 6.4 Merge Or Carry-Forward

Merge only if:

- Technical checks pass.
- Functional replay passes.
- Human acceptance confirms no serious answer-quality regression.

Carry forward:

- Reranking, conversation compression, and scheduled cleanup if they are not required for launch-quality chat behavior.

---

## 7. AQS Self-Review

### Architecture

- PASS: Uses existing Next.js API route and Supabase architecture.
- PASS: Avoids new services for MVP.
- PASS: Keeps RAG as answer-time support rather than a paper product.
- WATCH: Supabase JSONB is appropriate for variable paper metadata, but should not become a broad long-term paper archive.

### Safety And Compliance

- PASS: Does not introduce upload/report interpretation.
- PASS: Does not expose browsable abstracts or full paper collections.
- PASS: Adds stronger source faithfulness and anti-sycophancy rules.
- WATCH: RAG retrieved content is still untrusted external content; prompt separation and output filtering reduce but do not eliminate risk.

### Engineering Quality

- PASS: Scope is small and testable.
- PASS: Source consistency has concrete replay assertions.
- PASS: Same-topic reuse is server-side and does not increase client payload.
- WATCH: Citation reconciliation by URL/PMID/DOI is necessary but cannot prove semantic grounding by itself.

### User Experience

- PASS: Keeps current chat UI and report-upload affordance.
- PASS: Source panel copy becomes less overclaiming.
- WATCH: More cautious answers must still stay practical and parent-friendly.

### Minimum Viable Documentation

- PASS: A dedicated spec is justified because this is cross-cutting shared chat infrastructure.
- PASS: This spec records Search Ledger, ADR-lite, acceptance gates, and non-goals.
- PASS: Implementation should not proceed from chat memory alone.

---

## 8. Implementation Task Map

This section is intentionally file-level so an implementation agent can work from this spec without reinterpreting the plan.

### Task 1 - Add RAG context persistence

Files:

- Add migration under `supabase/migrations/`.
- Add helper module under `lib/` or `services/`, for example `lib/rag-context-store.ts`.

Required behavior:

- Create `conversation_rag_contexts`.
- Enable RLS.
- Add indexes:
  - `conversation_id, created_at desc`
  - `guest_session_id, created_at desc`
  - `expires_at`
- Add a check constraint requiring either `conversation_id` or `guest_session_id`.
- Insert and read rows only from server-side API code.
- Do not expose a browser/API route that lists RAG contexts.

Suggested migration shape:

```sql
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
```

RLS minimum:

- Enable RLS.
- No broad anon policies.
- If direct user policies are added, limit by `auth.uid() = user_id`.
- Server-side service-role access is still responsible for conversation ownership checks before read/write.

### Task 2 - Return full paper context from RAG service

File:

- `services/rag-service.ts`

Required behavior:

- Preserve existing `sources` contract for frontend display.
- Extend the internal return shape from `executeRAGWithSmartSummary` to include the retrieved `papers` needed for server-side context persistence.
- Do not send full paper abstracts to the browser.
- Limit injected paper context separately from retrieved source count. Retrieval may return 10 or more; prompt injection should use the top 6-8 unless acceptance tests show otherwise.

Suggested type:

```ts
type RAGContextPaper = {
  title: string;
  abstract: string;
  year?: number | string;
  journal?: string;
  authors?: string[];
  url?: string;
  doi?: string;
  pmid?: string;
  score?: number;
  topic?: string;
  types?: string[];
};
```

### Task 3 - Add context store helpers

Suggested file:

- `lib/rag-context-store.ts`

Suggested functions:

```ts
export async function getLatestRagContext(input: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  conversationId?: string | null;
  userId?: string | null;
  guestSessionId?: string | null;
  now?: Date;
}): Promise<RagContext | null>;

export async function saveRagContext(input: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  conversationId?: string | null;
  userId?: string | null;
  guestSessionId?: string | null;
  topicKey?: string | null;
  query: string;
  question: string;
  papers: RAGContextPaper[];
  sources: ChatSource[];
  ttlHours?: number;
}): Promise<void>;

export function formatRagContextForPrompt(input: {
  papers: RAGContextPaper[];
  sources: ChatSource[];
  question: string;
  mode: 'fresh' | 'cached';
  maxPapers?: number;
}): string;
```

Rules:

- `formatRagContextForPrompt` must include full abstracts truncated only at a deliberate limit, such as 4000 chars per paper.
- It must include source URL/PMID/DOI beside the matching paper.
- It must include `buildRagCitationRule(sourceCount)`.
- For cached context, it must explicitly say the cached papers are the core research basis for this same-topic follow-up.

### Task 4 - Integrate context into chat stream

File:

- `pages/api/chat/stream.ts`

Required behavior:

- Determine `guestSessionId` using the existing guest session mechanism.
- Load latest active RAG context after conversation/user identity is known and before RAG routing.
- Pass cached-context summary into `routeRagNeed`.
- If fresh RAG runs:
  - save the new paper context;
  - inject fresh RAG context;
  - use the fresh source set for SSE and DB save.
- If no fresh RAG runs and cached same-topic context exists:
  - inject cached RAG context;
  - use cached sources for the answer source set;
  - do not send all historical message sources.
- Always append a current-question anchoring system message after RAG context injection.

Do not:

- Put full abstracts into `conversationHistory` sent from the browser.
- Depend on Vercel process memory.
- Save cached full abstracts into `messages.sources`.

### Task 5 - Harden RAG router fallback

File:

- `lib/rag-router.ts`

Required behavior:

- Extend router input with cached-context metadata:

```ts
cachedRagContext?: {
  hasContext: boolean;
  query?: string;
  question?: string;
  topicKey?: string | null;
  sourceCount?: number;
};
```

- Update router prompt so same-topic cached context is considered enough when appropriate.
- On router failure, do not always return `shouldSearch=false`.
- Add a deterministic fallback helper for evidence-sensitive messages. If the latest user turn asks about intervention effectiveness, safety, frequency, schedule, supplement/nutrition, medication-adjacent issues, exercise, sensory training, or comparison, fallback should search unless a fresh cached context exists.

### Task 6 - Reconcile answer citations and source panel

Files:

- `pages/api/chat/stream.ts`
- `components/Chat/RAGSources.tsx`
- Optional helper under `utils/`, for example `utils/source-reconciliation.ts`

Required behavior:

- Extract URLs, DOI strings, and PMID URLs from the final assistant response.
- Match them against current/cached source metadata.
- Save sources that were injected plus any matched cited source from cached context.
- Do not add unrelated raw retrieval noise just to increase source count.
- Change source button copy from "Based on N research papers" to "Research sources for this answer" or equivalent.

### Task 7 - Add RAG process-leak filter

Files:

- `pages/api/chat/stream.ts`, or a new helper such as `utils/rag-output-filter.ts`

Required behavior:

- Keep existing DSML filter intact.
- Add filtering for known process chatter, for example:
  - `I will search`
  - `I am searching`
  - `calling the RAG tool`
  - `querying the research database`
  - JSON-like tool calls containing `query`, `top_k`, or `should_search`
  - Chinese equivalents such as `我来检索`, `正在调用`, `搜索论文`
- Apply filter both during streaming and before saving.
- Do not remove legitimate user-facing phrases like "the research suggests" when they are part of the final answer.

### Task 8 - Prompt parity changes

Files:

- `lib/system-prompt-lite.ts`
- `services/rag-service.ts`

Required behavior:

- Add the guardrail-over-agreement rule.
- Add exact-number-source discipline.
- Keep report/evaluation upload guidance.
- Do not add TCM, Paper Topics, or report interpretation as active Web MVP behavior.

### Task 9 - Replay and acceptance updates

Files:

- `scripts/replay-rag-drift-web.mjs`
- Optional focused unit tests if the repo already has a nearby test pattern.

Required behavior:

- Keep the existing 12-turn replay.
- Add checks for:
  - RAG process leakage;
  - answer URL/PMID/DOI present in saved/displayed sources;
  - same-topic follow-up uses cached context;
  - new-topic evidence turn triggers fresh RAG;
  - over-agreeing phrases.

---

## 9. Implementation Order

Use this order to reduce rollback risk:

1. Migration and context store helper.
2. RAG service return shape extension.
3. Chat stream integration for fresh RAG context save/injection.
4. Cached same-topic context injection.
5. Source reconciliation and source panel copy.
6. RAG process-leak filter.
7. Prompt parity changes.
8. Replay assertions and local acceptance.

Do not start human acceptance until build and replay pass locally.

---

## 10. Definition Of Done

This slice is done only when all are true:

- The implementation follows this spec and does not add new product modules.
- Local Supabase migration applies cleanly.
- `npm run build` passes.
- Replay completes with 0 core drift red flags.
- Over-agreeing red flags are 0, or at most 1 with explicit human review.
- The answer source panel no longer overclaims "Based on N research papers".
- Every URL/PMID/DOI in replayed assistant answers is present in saved/displayed sources.
- Same-topic follow-up can use cached full abstracts without repeating RAG.
- No RAG/tool-process chatter appears in streamed or saved output.
- Report upload guidance remains present as a coming-soon/product-forward affordance, not as active report interpretation.
