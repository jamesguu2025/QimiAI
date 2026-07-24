# Growth Plan Generation — Planning Review (2026-07-22)

> Review target: `docs/specs/growth-plan.md`, Section 10
> Review type: second-pass adversarial self-review under the repository SOP. No separate agent was used; findings were re-checked from source and code evidence before implementation.
> Result: PASS after corrections below; human acceptance remains pending.

## 1. Scope And Basis

Reviewed the proposal to add a guided `Generate Plan` workflow to the existing web Growth Plan. The review used:

- `docs/project-control.md`
- `docs/local-test-environment.md`
- `docs/system-architecture.md`
- `docs/formal-basis-entry.md`
- `docs/planning-review-rules.md`
- current `agent-dev-sop` planner/AQS/EBG rules referenced by the formal-basis entry
- current code paths cited in Growth Plan Spec Section 10.1
- external evidence and Search Ledger in Growth Plan Spec Sections 10.2 and 10.8

## 2. Adversarial Findings And Corrections

### P0

None open.

### P1-1 — Risk of presenting AI coaching as validated ADHD treatment

- Finding: A plan generator could imply that individualized AI output is itself evidence-based treatment.
- Correction: Section 10.2 now distinguishes evidence-backed plan components from the unvalidated AI delivery mechanism; coaching evidence is explicitly weak, and generated explanations must use tentative language.
- Status: resolved.

### P1-2 — Insufficient human-control boundary

- Finding: A one-click generator that saves immediately would transform uncertain model output into durable child/family data without a meaningful review step.
- Correction: generation and saving are separate calls; the preview is editable; generation performs no database write; save requires explicit action.
- Status: resolved.

### P1-3 — Overloaded or vague plans

- Finding: unrestricted generation could produce many goals, delayed rewards, or generic advice that increases executive load.
- Correction: one situation, one observable target, three-to-five steps, point-of-performance cue, immediate feedback, and minimal tracking are now contract requirements.
- Status: resolved.

### P1-4 — Unfounded review duration

- Finding: a fixed seven-day trial could be read as a clinical recommendation not established by the cited sources.
- Correction: seven days is marked internal/provisional, editable from 3–14 days, and described only as a first check-in usability default.
- Status: resolved.

### P1-5 — School/legal and medication boundary

- Finding: school or medication scenarios could drift into IEP/legal decisions or dose instructions.
- Correction: the prompt/API safety contract permits only parent-controlled observation, question preparation, or a request for a qualified school/clinical conversation; crisis and concrete medication changes are hard-blocked.
- Status: resolved.

### P1-6 — Premature schema and PDF work

- Finding: new goal/tracker tables or immediate PDF work would expand scope before validating whether parents find the generated structure useful.
- Correction: one generated plan uses existing structured fields without a migration. PDF remains explicitly blocked on human acceptance.
- Status: resolved.

### P2

- A deterministic static fallback could reduce provider failures, but it is not required before the first 5,000 users and would add another behavior to test. Deferred.
- Separate analytics for generated-plan conversion could be useful after interaction wording stabilizes. Deferred.

## 3. AQS Review

Security:

- [PASS] Session auth, bounded payloads, per-user rate limiting, provider timeout, output validation, generic errors, and no secret/provider-body logging are specified.
- [PASS] No database mutation occurs during generation; save continues through the existing user-scoped/quota-enforcing API.
- [PASS] Crisis and concrete medication directives fail closed; professional/legal conclusions are not generated.
- [PASS] Existing Markdown renderer does not enable raw HTML.

Architecture:

- [PASS] Existing `/plan`, `/api/plan`, plan types, structured blocks, and local Supabase workflow are reused.
- [PASS] No migration or new dependency is needed.
- [PASS] Tasks are linear and each has a concrete file/contract/gate.
- [PASS] PDF remains outside this implementation slice.

Evidence:

- [PASS] Barkley, CDC, AAP/HealthyChildren, CHOP, and peer-reviewed DRC records directly support the components attributed to them.
- [PASS] Evidence strength and limitations are explicit; no source is used to validate AI-generated treatment.
- [PASS] Product-only choices are marked provisional.
- [PASS] Search Ledger records query/purpose, URL, source type, access date, claim, and retrieval trace reference.

Reverse/overengineering check:

- [PASS] No auto-save, hidden profile mining, multi-goal engine, new tracker schema, reminders, RAG, feature flag, queue, or PDF is included.
- [PASS] The smallest end-to-end slice is one generated editable plan saved through the current model.

## 4. Gate Decision

- Technical planning gate: PASS.
- Functional acceptance plan: defined in Spec Section 10.9.
- Human acceptance: PENDING after implementation and machine tests.
- PDF gate: BLOCKED until human acceptance of the plan builder.
- Commit gate: BLOCKED until PDF and final human acceptance are complete.

## 5. Post-Implementation Review

Review scope: the five implementation files listed in Growth Plan Spec Section 10.12, plus the targeted validation script and `/plan` integration diff.

Findings:

- P0: none.
- P1: none open.
- P2: the generated-plan save surface currently shows a generic retained-draft error rather than forwarding the exact existing quota message. This is non-blocking because the UI suppresses generation at the known quota and the draft is preserved if server state changes concurrently.

Verification:

- [PASS] Generated draft endpoint has no Supabase import or database mutation.
- [PASS] Input and provider output are independently validated and bounded.
- [PASS] Provider call is single-shot, server-side, and timeout-bounded; provider body and credentials are not logged.
- [PASS] Preview remains editable and save is an explicit separate action.
- [PASS] Manual creation and existing item operations remain on their previous API paths.
- [PASS] Targeted assertions, TypeScript, production build, anonymous API checks, authenticated local happy path, persistence check, mobile-width check, and console-error check passed.

Post-implementation gate: PASS for human acceptance handoff. PDF and commit remain blocked.

## 6. Human Acceptance Rejection And Redesign

Human finding: the intake-first sequence duplicated information the user had already discussed with Qimi before saving a plan. This is a P1 UX/product-model defect, not copy polish.

Correction recorded in Growth Plan Spec Section 10.13:

- Replace situation intake with a saved-plan source composer.
- Auto-select starred sources.
- Allow other saved sources and plan-only manual additions.
- Make output type a compact control rather than another wizard step.
- Generate an evidence-shaped visual schedule/implementation table from saved material.
- Ask no generic questions; unresolved gaps remain explicit instead of being invented.

Evidence consistency check:

- [PASS] Observable targets, antecedent/setup support, short steps, immediate feedback, monitoring, and home-school coordination remain the output scaffold.
- [PASS] The redesign reduces recall/re-entry burden and makes source selection explicit.
- [PASS] The model is restricted to reorganizing/operationalizing selected material; it cannot silently add an unrelated intervention.
- [PASS] Starred auto-selection is a product rule, not presented as clinical evidence.

Gate result: previous UI acceptance revoked. Corrected implementation and regression are required before a new human handoff.

## 7. Corrected Implementation Review

Result: PASS for a second human handoff.

- [PASS] The API request contains IDs rather than trusted client copies of saved content.
- [PASS] Source query combines current `user_id` and requested IDs, then verifies the returned count before generation.
- [PASS] Original source rows are read-only during composition; the local smoke confirmed the starred source remained present after saving the composed result.
- [PASS] The UI contains no generic situation-retelling fields.
- [PASS] The selected Saved Plan supplied the actual timing, actor, cue, feedback, and tracking details visible in the generated routine table.
- [PASS] Missing fields were rendered as `Not specified`; they were not silently fabricated.
- [PASS] Visual output, editing, saving, responsive layout, targeted safety tests, typecheck, build, and console checks passed.

Open non-blocking product decision: this acceptance slice saves a composition through the existing `plan_items` path. Before PDF work, decide whether compiled plans need their own persistent document/table so they do not consume or recursively re-enter the Saved Plan library. This is intentionally deferred rather than hidden in the current change.

## 8. Third Human Review — Accepted Boundary And Visual Revision

The product owner confirmed that a manually selected source with no structured content should remain included and that the left/right foot difference was a real saved family fact. The earlier concern that the current chat invented that fact was withdrawn after checking the user's active memory records and their source conversation.

Accepted correction:

- Keep explicit user source selection, including intentionally sparse sources.
- Keep composition as a real model-assisted reorganization step.
- Permit execution scaffolding, but do not let the composition call independently change intervention parameters, prescribe one-sided progression, or turn observations into symptoms.
- Move material intervention changes into a later parent discussion, evidence review when needed, and user-confirmed new plan version.
- Improve visual hierarchy and table readability before the next human acceptance handoff.
- Treat interactive completion tracking as a separate structured-data slice; its outcome field must adapt to the plan domain rather than defaulting to physical symptoms.

## 9. Evidence Re-Audit And Simplification

Finding: no reviewed expert, government, professional, school-behavior, or pediatric-rehabilitation source defines Qimi's `focused`, `routine`, and `home_school` choices as a standard three-part plan taxonomy. The choices created an avoidable discontinuity because the upstream Saved Plan lifecycle does not capture such a type.

Stable common elements across the reviewed sources:

- a small number of specific, achievable, observable targets;
- an antecedent, setting, time, or trigger;
- concrete steps and clear roles;
- point-of-performance cues and environmental support;
- immediate, positive, non-punitive feedback;
- simple implementation/outcome monitoring;
- collaborative review before material changes;
- adaptation to family capacity and professional guidance for clinical prescription changes.

Decision: remove generation-time output types and produce one canonical practical plan. Future timeline/calendar/home-school presentations may be derived as views only when the canonical plan contains the corresponding source-backed fields.

Sources rechecked on 2026-07-23:

- [Russell Barkley — Executive Functioning and Self-Regulation](https://www.russellbarkley.org/factsheets/ADHD_EF_and_SR.pdf)
- [CDC — ADHD in the Classroom](https://www.cdc.gov/adhd/treatment/classroom.html)
- [AAP/HealthyChildren — Behavior Therapy for Children with ADHD](https://www.healthychildren.org/English/health-issues/conditions/adhd/Pages/Behavior-Therapy-Parent-Training.aspx)
- [IRIS — Implementation and Progress Monitoring](https://iris.peabody.vanderbilt.edu/module/bip-elem/cresource/q2/p08/)
- [IRIS — Reviewing and Adjusting the BIP](https://iris.peabody.vanderbilt.edu/module/bip-elem/cresource/q2/)
- [2025 pediatric home-program barriers/facilitators review](https://pubmed.ncbi.nlm.nih.gov/39936229/)

## 10. Fourth Human Review — Generalized Source-Fidelity Gate

The product owner rejected a case-specific safeguard (“do not turn adult supervision into child independence”) as an inadequate general rule. The accepted product invariant is broader: the composer must not invent, remove, strengthen, weaken, or repurpose any individualized fact absent from the selected sources, regardless of plan domain.

Implementation decision:

- Replace permission to add evidence-shaped execution scaffolding with a closed-world transformation boundary.
- Retain only summarization, deduplication, grouping, source-backed sequencing, and visual formatting.
- Render unresolved format fields as `Not specified`, `Decide together`, or `Choose a review date`.
- Require explicit `Feedback:` and `Track:` labels so missing feedback cannot disappear behind an invented tracking instruction.
- Add a second, fail-closed semantic source-fidelity audit before returning the candidate to the browser.
- Reject any candidate that changes a protected fact or turns a technique/observation into a new tracker, target, outcome, or success criterion.

Deferred product decision:

- Structured per-step check-ins, non-completion reasons, Dashboard progress, statistics, and charts are accepted as a post-MVP direction and recorded in `OPT-005`.
- They require a compiled-plan/step/check-in/version model and therefore remain outside this launch-hardening change.

## 11. Fifth Human Review — Remove Empty Template Columns

The source-fidelity gate correctly stopped invented feedback and tracking, but the resulting foot plan repeated `Not specified` in every row. The product owner questioned the value of a column that contains no source-backed information.

Decision:

- Keep the closed-world source boundary.
- Make plan-table columns dynamic and source-backed rather than forcing an evidence-shaped template onto sparse sources.
- Require `What to do`; show timing, support/setup, feedback, and tracking only when the selected sources contain those facts.
- Separate feedback and tracking when present.
- Consolidate missing field categories into one optional plan-gap notice instead of repeating placeholders.
- Omit unsupported review labels rather than displaying `Measure: Not specified`.
- Normalize legacy provider formatting deterministically so an all-empty optional column is removed even when the provider returns the older fixed template.

## 12. Acceptance Correction — Browser/API Path Was Not Covered

Human finding: the exact authenticated `Generate from 1 item` flow returned `Could not build a safe visual plan` after the earlier technical pass. The previous “happy path” evidence relied on a direct model fixture plus validation and did not prove that the same saved row could traverse the browser, `/api/plan/generate`, normalization, structural validation, and semantic audit. That acceptance claim was too broad and is withdrawn.

Exact-path reproduction exposed two nondeterministic failure classes:

- incomplete or variant provider presentation (`PLAN_DRAFT_EMPTY_REVIEW_FIELD` and `PLAN_DRAFT_INVALID_TABLE_HEADER`);
- false-positive source audit findings about a valid trial/reassessment interval, a metadata-only gap list, and the exact source title.

Implemented correction:

- deterministic alias/canonical-order normalization for table headers and removal of empty optional presentation fields;
- structural error codes and one bounded format retry;
- clarified audit rules for review intervals, gap metadata, exact source titles, and omission of source facts;
- one bounded source-fidelity regeneration and re-audit;
- deterministic coverage validation for source quantity/unit facts and source-backed review/reassessment blocks, because the semantic auditor was observed to miss an omitted 4-week review fact;
- removal and prohibition of generic review advice absent from the sources;
- differentiated browser error copy for final format failure versus final source-fidelity failure.

Re-acceptance evidence:

- [PASS] Authenticated local browser selected the exact copied foot-exercise Saved Plan row used in the reported scenario.
- [PASS] Three consecutive updated `/api/plan/generate` requests returned 200; the first two completed in about 4.8 seconds and the third also completed without a browser error.
- [PASS] Visual inspection confirmed the source actions, repetitions, hold times, setup/support, break-week frequency, 4-week reassessment, missing-field categories, and exact source title remained present without invented feedback/tracking columns.
- [PASS] Targeted generation validation, `npx tsc --noEmit`, `git diff --check`, and `npm run build` passed.

Gate result: technical acceptance is restored for this failure path. Human product acceptance and final commit remain pending.

## 13. Sixth Human Review — Support Must Add Information

The product owner confirmed that the foot plan repeated the same setup facts in both `What to do` and `Support / Setup`, and questioned whether the separate section was an expert-mandated template element. Re-review distinguished the evidence-backed concept from Qimi's presentation choice: point-of-performance environmental, equipment, cue, assistance, and supervision conditions matter, but no reviewed framework requires a fixed column named `Support / Setup`.

Accepted correction:

- retain every source-backed support and safety condition;
- place each fact once in its best-fit location;
- show `Support / Setup` only when it contributes independent information;
- keep inseparable setup inside the action and omit the column;
- expand numbered cross-references to the exact action names already shown;
- keep source-backed timing in `When / Trigger` without repeating it in the action;
- keep schedule context and cadence together in `When / Trigger`, reject unsupported broader wording, and preserve additional compatible timing such as `all weeks` or `off weeks` when the Saved Plan explicitly contains it;
- treat all intentionally selected Saved Plans as valid source material even when their categories differ, and preserve the explicit quantities from every selected source;
- run deterministic coverage before semantic audit, allow two bounded issue-directed repairs for complex composites, and reconcile only provable audit false positives about selected cross-category sources or source schedules preserved on both sides;
- generate and persist a concise source-backed plan title capped at 60 characters, with matching client and server enforcement;
- remove `Saved Plan gaps` from the final plan rather than presenting absent optional fields as an unfinished task.

Technical acceptance requires deterministic removal of an all-duplicative support column, prompt-level unique-placement rules, and real-path checks covering both a sparse exercise plan and a plan with genuinely independent support.
