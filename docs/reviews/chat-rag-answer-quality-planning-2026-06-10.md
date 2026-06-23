# Chat RAG Answer Quality Planning Review

> Date: 2026-06-10
> Scope: `docs/specs/chat-rag-answer-quality.md`
> Review role: planner SOP/AQS self-review
> Result: PASS for planning; implementation not started by this review

---

## 1. Review Context

The Web prompt/RAG system was compared against the current mini-program prompt system after repeated drift concerns. The latest Web code already contains several anti-drift improvements, including full-abstract smart-summary input and a shared citation rule, but it still lacks the mini-program's full same-topic RAG paper context loop.

The planning question was whether the remaining gaps should be implemented for the Web MVP and how to implement them without expanding product scope.

Conclusion:

- This is a shared chat infrastructure launch-hardening slice, not a new feature module.
- The canonical planning baseline is now `docs/specs/chat-rag-answer-quality.md`.
- Implementation should follow the normal order: technical acceptance, functional acceptance plan, human acceptance, merge or carry-forward decision.

---

## 2. SOP Evidence Check

Required repo documents were considered:

- `docs/project-control.md`
- `docs/local-test-environment.md`
- `docs/system-architecture.md`
- Existing specs under `docs/specs/`

Relevant SOP principles applied:

- Use real code behavior before older docs when facts conflict.
- High-risk AI answer-quality changes require evidence, ADR-lite, and AQS review.
- Local Supabase is the first database-backed acceptance environment.
- Do not treat `main` as acceptance baseline unless it contains the same feature generation.
- Do not introduce feature flags or extra services unless rollback or risk justifies them.

---

## 3. Search Ledger Review

The spec includes six external sources:

- RAG original paper for retrieved-memory factual/provenance rationale.
- Lost in the Middle for long-context limits.
- Supabase JSONB docs for variable paper metadata storage.
- Supabase RLS docs for exposed-schema data security.
- Vercel Functions docs for why process memory is not durable context.
- OWASP LLM01 for RAG/prompt-injection and output-filtering risk.

Review result: PASS.

The evidence supports the planned architecture and risk controls. It does not prove the exact top-N paper count or retention period, so those are intentionally left as acceptance-tested implementation parameters.

---

## 4. ADR Review

| ADR | Review result | Notes |
|-----|---------------|-------|
| ADR-RAG-1 Supabase context cache | PASS | Aligns with existing architecture and local Supabase rule. |
| ADR-RAG-2 Server-side answer-time only | PASS | Preserves no-Paper-Topics decision and avoids copyright/product drift. |
| ADR-RAG-3 Cached full abstracts, top 6-8 | PASS WITH WATCH | Evidence supports limiting context; exact count must be replay-tested. |
| ADR-RAG-4 Source reconciliation | PASS | Directly addresses observed UI/source mismatch. |
| ADR-RAG-5 RAG process filtering | PASS | Extends existing DSML leakage hardening. |
| ADR-RAG-6 Anti-sycophancy prompt parity | PASS | Required by observed over-agreeing red flags. |

---

## 5. AQS Review

### Architecture

- PASS: Keeps one Next.js app plus Supabase.
- PASS: Does not add Redis, Vercel KV, a paper browser, or public paper APIs.
- PASS: Uses server-side API boundaries for sensitive RAG context.
- WATCH: The new table must not become a general long-term paper archive.

### Security And Privacy

- PASS: RAG context is server-side only.
- PASS: RLS and server-side ownership checks are required.
- PASS: No report upload or report interpretation is introduced.
- WATCH: RAG content remains untrusted external content, so prompt separation and output filtering remain required.

### Engineering Quality

- PASS: The work is decomposed into cache, injection, anchoring, source reconciliation, filtering, prompt parity, and replay tests.
- PASS: Acceptance criteria are observable.
- PASS: The plan avoids changing unrelated product modules.
- WATCH: Source URL reconciliation proves display consistency, not full semantic faithfulness.

### UX And Product Scope

- PASS: Keeps report upload guidance as requested.
- PASS: Source panel copy will be less overconfident.
- PASS: Does not remove MVP frontend affordances.
- WATCH: Stronger correction behavior must remain warm and practical.

### Testability

- PASS: Existing replay script is the right functional harness.
- PASS: Required checks include drift red flags, over-agreeing, source consistency, and process leakage.
- WATCH: Human acceptance remains necessary because answer quality cannot be fully machine-graded.

---

## 6. Reverse Check

Potential scope creep checked:

- Paper Topics: excluded.
- Report Analysis: excluded.
- Membership/Billing: excluded.
- Crisis Calm: excluded.
- TCM: excluded.
- New infrastructure service: excluded.
- Frontend removal of upload affordance: excluded.

Result: PASS.

---

## 7. Final Status

PASS for planning.

Next suitable work:

1. Implement from `docs/specs/chat-rag-answer-quality.md`.
2. Use local Supabase first.
3. Run build and replay before human acceptance.
4. Merge only after the acceptance sequence is complete.
