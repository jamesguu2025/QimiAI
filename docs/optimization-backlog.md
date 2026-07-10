# Optimization Backlog

> Purpose: Record non-blocking bugs, UX inconsistencies, technical debt, and deferred optimizations that should not interrupt the current implementation sequence.
> Rule: Items here are backlog only. They do not override `docs/project-control.md` execution order.

## Status Labels

- `Open`
- `Planned`
- `In Progress`
- `Done`
- `Won't Do`

## Priority Labels

- `P0` critical correctness/privacy issue
- `P1` important UX or reliability issue
- `P2` quality or consistency improvement
- `P3` optional polish

## Items

### OPT-000 Local database reset must be explicit

- Status: `Done`
- Priority: `P1`
- Area: `local-test / Supabase / acceptance`
- Date added: `2026-05-13`
- Source: manual QA during Growth Plan testing

Problem:
- `npm run supabase:reset` clears local test data, including consent records, chat history, and Growth Plan items.
- This is useful for validating a full migration chain from an empty local database, but it disrupts human acceptance once testing has started.

Rule:
- Do not run `npm run supabase:reset` during human/manual testing unless the user explicitly approves after being told it will clear local Supabase data.
- Prefer `npm run supabase:start` and `npm run dev` for ordinary restarts.
- Production/staging schema changes must apply migrations incrementally; production Supabase must never be reset as a deployment step.

### OPT-001 Guest chat retention policy is undefined

- Status: `Open`
- Priority: `P1`
- Area: `chat / guest-mode / localStorage`
- Date added: `2026-05-02`
- Source: manual QA during chat acceptance

Problem:
- When the user is not logged in, the main chat area restores prior guest conversation content from local storage after refresh.
- This is current behavior, not a crash, but the product policy is undefined: guest chat currently persists indefinitely unless migration succeeds or storage is manually cleared.

Current implementation facts:
- Guest chat content is stored in `qimi_guest_data` via `utils/guest-storage.ts`.
- There is no TTL for guest chat storage.
- Guest data is only cleared on successful migration or manual clear.

Decision still needed:
- Keep guest chat until login/manual clear
- Add TTL (for example 24 hours or 7 days)
- Clear guest chat on browser refresh/session end

Suggested follow-up:
1. Decide the intended product rule for guest chat persistence.
2. Implement TTL or explicit clearing logic if required.
3. Add acceptance coverage for guest refresh behavior.

### OPT-002 Shared Qimi prompt-core framework across mini-program and Web

- Status: `Open`
- Priority: `P1`
- Area: `chat / prompt architecture / cross-platform parity`
- Date added: `2026-06-25`
- Source: user review after Web flatfoot/developmental-delay chat audit

Problem:
- Mini-program and Web currently carry related but separate prompt systems.
- The mini-program prompt has stronger consultative reasoning rules for personalized developmental, diagnostic, cause, intervention-effect, and primitive-reflex questions.
- Web has stronger English/RAG engineering guards: clickable citation rendering, source reconciliation, exact-number checks, stream filtering, and same-topic RAG context handling.
- Because the two prompt systems are optimized separately, improvements can drift. The same product rule may need to be manually reimplemented in two places.

User concern:
- Qimi should not behave like a generic language model that immediately explains and prescribes.
- For any complex child-related or family-education case, Qimi should reason layer by layer, identify the likely deeper bottleneck, ask the most diagnostic missing question, and only then produce a targeted plan.
- Example case: an 8-year-old with physical/language delay, flexible-looking collapsed arches, left-right asymmetry, slow exercise progress, and regression after breaks. Web answered too quickly with explanation and a plan instead of first triaging whether this was flexible flatfoot, structural/tight heel-cord issue, broader sensory-motor control, primitive reflex, tone/joint laxity, or unilateral motor-control asymmetry.

Suggested architecture:
- Create a platform-neutral `Qimi Core Reasoning Framework` as the single source of truth for:
  - answer-first-then-ask flow
  - personalized developmental/diagnostic judgment gate
  - evidence vs inference vs practical judgment separation
  - primitive reflex / ASI / sensory-motor evidence boundaries
  - plan readiness gate
  - exact-number and citation discipline
  - guardrail-over-agreement rules
- Keep platform adapters separate:
  - Mini-program: Chinese wording, Chinese user context, mini-program report-upload affordance, local UI constraints.
  - Web: English wording, North America/Europe school and family context, clickable citation links, source reconciliation, Growth Plan save loop.

Suggested implementation:
1. Extract the shared reasoning rules into a versioned local prompt-core spec or package.
2. Generate/maintain `zh-CN` and `en-US` prompt adapters from that shared core.
3. Keep Web-specific RAG/citation/source-reconciliation guards in the Web adapter.
4. Add cross-platform regression cases, starting with:
   - `motor-delay-flatfoot-asymmetry-regression`
   - `primitive-reflex-adhd-causality`
   - `semantic-network-reflex-integration`
5. Compare mini-program prompt, Web current prompt, and Web prompt-core adapted prompt before making the shared framework mandatory.

Current tactical fix:
- Add Web prompt rules for child/family layered formulation so the English Web assistant can ask layered diagnostic questions before giving a full plan in complex child-specific and family-education cases, including behavior, learning, discipline, motivation, homework, routines, language, attention, emotion, sleep, social relationships, school fit, sensory/motor, developmental, and primitive-reflex questions.

### OPT-003 Shared RAG evidence-judgment core (`@qimi/rag-core`) across mini-program and Web

- Status: `In Progress`
- Priority: `P1`
- Area: `chat / RAG / retrieval precision / cross-platform parity`
- Date added: `2026-06-26`
- Source: user review after Web "Late Development & Foot Arch" chat audit (conversation `d8e2e13b`)

Problem:
- Both platforms call the same RAG search backend (`47.110.88.11:8000/search`, BM25), but the precision work lives in the mini-program's Node app layer (`api/services/rag-service.js`): evidence reranking, low-extrapolation penalties, primary/supporting tiering, and full-text section injection.
- Web's `services/rag-service.ts` skipped all of it and injected the raw top-k flat. Result in the audited chat: 4 of 9 retrieved papers were off-topic noise at similar scores; the most on-point paper was not cited while a tangential ADHD molecular paper was used as the backbone.
- This is the retrieval-side counterpart to OPT-002 (which covers the prompt/reasoning core). Same drift risk: precision rules optimized on one side do not reach the other.

Phase 1 — done (2026-06-26): faithful port to Web
- Added `lib/rag-evidence.ts`: `detectEvidenceQuestionType`, `classifyEvidenceForQuestion`, `rankPapersForInjection`, `selectEvidenceForInjection`, `groupEvidenceForInjection`, `describeEvidenceEn`.
- Pure functions, no Web/Next imports, emit NEUTRAL reason codes + tier; English wording lives in a separate map. This shape is deliberately extraction-ready.
- Scoring kept numerically identical to the mini-program source so the two sides rank the same until unified.
- Wired into `executeRAGWithSmartSummary` + `summarizePapers` + `formatPapersForLLM`, behind flag `RAG_EVIDENCE_RERANK` (default on; set `=false` to revert to flat behavior).
- Regression on `d8e2e13b`: the two case-report noise papers are dropped; the wrongly-cited irisin/autophagy molecular paper is demoted to supporting (low_extrapolation); the gamification flatfoot systematic review is promoted to primary. Net improvement on the exact defects raised.

Phase 2 — planned: extract `@qimi/rag-core`
- Lift `lib/rag-evidence.ts` into a versioned shared package (TS, compiled ESM + d.ts).
- Both repos depend on it (git dependency or private registry); optimize once, bump version both sides.
- Keep per-locale wording maps in each app (Chinese for mini, English for Web), so judgment is shared and prompts stay separate.
- Then fold in the full-text section-pick pure functions (`sliceSections`/`pickSections`) as well.
- Add cross-platform regression fixtures, starting with the `d8e2e13b` paper set.

Known limitation discovered in Phase 1 (applies to BOTH sides — fix in the shared core):
- The ported classifier has NO cross-domain relevance gate. It rewards study design (e.g. systematic review +18) and penalizes a fixed list of off-target populations (ASD, older adults, preterm, psychosis, animal), but it cannot tell that an off-domain systematic review is irrelevant.
- On `d8e2e13b` this promoted off-domain reviews (bariatric-surgery activity guidelines; SCP neurofeedback protocol standardization; neurofibromatosis skeletal-muscle review) to PRIMARY, purely because they are "systematic review / review", even though the question is about a child's flexible flatfoot and motor development.
- Backstops that still hold: the summarizer/citation rules require population/age/outcome match before citing, and the abstract content self-reveals the wrong domain — so these should not actually be cited. But labeling them PRIMARY is wrong and below the quality bar.
- Also: `detectEvidenceQuestionType` misread this case as `diagnosis` (triggered by the word "test"); the real intent was etiology + intervention. Cheap to tighten.
- The mini-program has the identical flaw (verified 2026-06-27: grep of mini `rag-service.js` found no relevance/domain/cross-encoder gate; running the mini's exact rerank on the `876c7b97` 6-paper set promoted bariatric + neurofeedback to PRIMARY). So this is not a Web regression — it is a shared gap.

Phase 1.5 — done (2026-06-27): cross-domain relevance gate on Web
- Evidence base: two-stage retrieval (retrieve → relevance rerank), +10–48% precision — cross-encoder / Cohere Rerank is the gold standard.
- First cut is an LLM-as-relevance-judge (fits the existing DeepSeek pipeline; no new vendor). Pure functions `buildRelevanceGatePrompt` / `parseRelevanceGateDecisions` live in `lib/rag-evidence.ts` (extraction-ready, swappable for a cross-encoder later behind the same interface); the LLM call + filtering is `applyRelevanceGate` in `services/rag-service.ts`, wired as stage-1 BEFORE evidence tiering.
- Flag `RAG_RELEVANCE_GATE` (default on). Fail-open on every path: no key, error, timeout, unparseable output, or would-drop-all → returns papers unchanged.
- Verified on the real retrieved sets: `d8e2e13b` (9→3) drops the wrongly-cited irisin/autophagy molecular paper AND keeps the previously-missed reflex-integration paper; `876c7b97` (6→2) drops all four noise papers. Off-domain papers no longer reach PRIMARY.
- Cost/latency: one extra cheap LLM call per evidence-sensitive turn (temperature 0, ≤500 tokens, 8s timeout). Swap to Nano/Haiku when the main model migrates.
- Still to do: (a) port the same gate to the mini-program (or share via `@qimi/rag-core`); (b) optional upgrade to a cross-encoder (Cohere Rerank / BGE) behind the same interface if the LLM judge proves too slow/costly at scale; (c) the `detectEvidenceQuestionType` "test"→diagnosis misfire is still open (low impact now that noise is gated out).
