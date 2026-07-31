# Project Control — Qimi Web

> Created: 2026-03-15 | Amended: 2026-03-16 (route restructure, module rename, execution order update) | Amended: 2026-05-06 (SOP v2.4 + local Supabase acceptance + current code reality) | Amended: 2026-05-20 (Growth Plan accepted, Crisis Calm archived, Report Analysis moved to dedicated post-MVP planning) | Amended: 2026-05-27 (MVP scope/document alignment) | Amended: 2026-06-10 (Chat RAG Answer Quality launch hardening) | Amended: 2026-07-22 (PICO-aware RAG directness hardening)
> Purpose: Freeze the execution order, document priority, branch acceptance policy, and current implementation/acceptance baseline so future work does not drift.
> Status: ACTIVE

---

## 1. Mandatory Execution Order

All future implementation and acceptance work must follow this order:

1. Technical acceptance
2. Functional acceptance plan
3. Human acceptance
4. Merge or carry-forward decision

Do not start human acceptance before technical acceptance is complete.
Do not start the next module before the current module or infrastructure slice has an explicit acceptance result.

---

## 2. Canonical Document Priority

If documents disagree, use this order:

1. Real code and real runtime behavior in this repo
2. Latest `agent-dev-sop` process rules under `/Users/jamesguu/Library/CloudStorage/OneDrive-个人/work/Million Dollar Business/agent-dev-sop/`
3. `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/formal-basis-entry.md`
4. `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/planning-review-rules.md`
5. `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/project-control.md`
6. `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/system-architecture.md`
7. The relevant module spec under `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/specs/`
8. `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/网页版开发计划-v2-垂直切片.md`
9. Review notes and temporary docs

Interpretation rules:

- `system-architecture.md` defines architecture, routing, layout, and module boundaries.
- `docs/specs/*.md` define module behavior, contracts, and acceptance criteria.
- `docs/网页版开发计划-v2-垂直切片.md` defines sequencing and implementation order only.
- If the vertical plan conflicts with architecture or a canonical module spec, the vertical plan must be updated.

---

## 3. Branch Acceptance Policy

Branch acceptance must not assume `main` is always the correct baseline.

Rules:

- A branch may contain both module work and shared infrastructure work.
- Acceptance must be scoped to the capability actually implemented in the branch.
- If a branch contains shared infrastructure that is broader than the branch name, record that explicitly.
- Do not treat an older branch or `main` as the acceptance baseline if it does not implement the same feature generation.

Required acceptance stages per branch:

1. Technical acceptance
   - confirm branch
   - confirm environment and external dependencies
   - confirm local dev server
   - confirm build
   - confirm key API paths
2. Functional acceptance plan
   - define exact flows to verify
   - define pass/fail conditions
   - separate infrastructure flows from module-specific flows
3. Human acceptance
   - user validates the agreed flows only
4. Result recording
   - mark accepted / blocked / partial

---

## 4. Current Accepted Infrastructure Baseline

As of 2026-03-15, the following shared chat infrastructure has passed technical acceptance and human acceptance in the current working branch:

- logged-in chat reply flow
- conversation persistence
- SmartDrawer history list
- history conversation switching
- refresh and reload of saved conversations
- AI-generated conversation title update after first reply

This acceptance result belongs to the shared chat infrastructure slice, not to the full `followup-reminder` module.

As of 2026-05-06, the local Supabase environment and guest chat migration path have passed technical acceptance and human acceptance in the current working branch:

- local Supabase starts through the project scripts
- local database schema changes are applied non-destructively from `supabase/migrations/`
- Next.js reads local Supabase via `.env.local`
- guest chat reply flow works
- assistant markdown table rendering works
- internal DSML tags are stripped from user-visible assistant output
- guest chat order survives refresh
- guest chat migrates to a logged-in account
- repeated refresh and re-login do not duplicate migrated conversations
- SmartDrawer history click loads the correct conversation and supports continued replies

This acceptance result belongs to the shared local test environment and chat/guest-migration infrastructure slice, not to a downstream product module.

### Reset command prohibition

Project agents must never execute any reset command. This includes `supabase db reset`, `npm run supabase:reset`, `git reset`, schema recreation, database recreation, or an equivalent destructive reset operation. This prohibition applies to local development, automated testing, staging, and production.

Use non-destructive migration commands, targeted repair migrations, read-only inspection, `git revert`, and isolated disposable test databases instead. Existing local test data and user-owned worktree changes must be preserved.

If a clean database replay is required, create a new isolated disposable database that has never held user or acceptance data. If no safe non-destructive path exists, stop and report the blocker. Do not run any reset command.

---

## 5. Current Module Status Baseline

Use these labels only:

- `Implemented`
- `Implemented, not yet human-accepted`
- `Partially implemented`
- `Planned`
- `Archived`
- `Superseded`

Current baseline:

- Chat infrastructure: `Implemented` and human-accepted in current working branch
- Chat RAG Answer Quality: `Implemented, not yet human-accepted` as MVP launch hardening P0 (same-topic context reuse, source consistency, process-leak filtering, PICO-aware directness scoring, and retrieval-bounded evidence wording; spec: `docs/specs/chat-rag-answer-quality.md`)
- Follow-up reminder module: `Partially implemented`
- AppLayout → SmartDrawer unification: `Implemented` (code reality: `components/Layout/AppLayout.tsx:5-54` imports and renders SmartDrawer)
- Dashboard (feature hub): `Implemented` and human-accepted in current working branch
- Family Profile (was User Profile): `Implemented` and human-accepted in current working branch
- **Compliance (MVP launch gate)**: `Implemented` for the current MVP launch baseline (privacy/terms/consent surfaces, adult-user confirmation, delete-account/settings path, and EBG review record exist; legal launch details remain checklist items rather than missing product surfaces)
- Settings (account): `Implemented` and human-accepted in current working branch
- Growth Plan: `Implemented` and human-accepted in current working branch (manual plan management and chat save-to-plan path implemented; post-MVP export/reminder refinements remain separate)
- AI Usage Quota and Cost Control: `Partially implemented`; formal plan is `docs/specs/ai-usage-quota.md`. Newly discovered cost-bearing route coverage, server/client authority, visible reset data, and focused tests are MVP launch blockers pending human approval.
- Registered Onboarding Fallback: `Implemented` and human-accepted on 2026-07-27; consent runs first, then server-authoritative onboarding with pre-population and explicit durable completion. See `docs/reviews/registered-onboarding-fallback-2026-07-26.md`.
- Report Analysis: `Planned` (valuable, but moved out of the current MVP acceptance baseline; post-MVP P1 spec refreshed on 2026-05-27; requires a dedicated implementation branch before coding)
- Crisis Calm: `Archived` (explicitly deferred from MVP by user decision on 2026-05-20)
- Memory Profile Summary: `Implemented` and human-accepted in current working branch (conversation extraction, profile display, and profile summary path are active; future quality tuning is non-blocking)
- Membership & Billing: `Planned` (post-MVP required monetization module, spec: `docs/specs/membership-billing.md`)
- ~~User Profile~~: `Superseded` — split into Family Profile + Settings (2026-03-16)

Explicit non-module decisions for the current MVP baseline:

- Feedback Ticket/Admin workflow: not planned for MVP; Contact Us is sufficient for launch.
- Paper Topics / Research Browser: not planned due copyright/licensing and redistribution risk. Keep research-backed citations limited to answer-time support in chat.
- Chat file/image upload: hidden for MVP because the prior affordance did not upload, persist, scan, or interpret files. Reopen only through the dedicated post-MVP upload/privacy/security item in `docs/optimization-backlog.md`.
- MVP AI-cost quota policy (2026-07-25): guest chat is 10 messages lifetime per server-issued guest identifier; registered free chat is 30 messages per Asia/Shanghai day; authenticated AI plan operations share 10 uses per Asia/Shanghai week. Non-AI plan save/view/edit/delete operations do not consume the AI allowance.

---

## 6. Forward Module Order

The project must move forward in this order unless the user explicitly overrides it:

> Amended 2026-03-16: Added SmartDrawer unification and Dashboard as prerequisites. User Profile split into Family Profile + Settings.
> Amended 2026-03-17: Added compliance module as launch gate. Can execute in parallel with feature modules.
> Amended 2026-05-06: Before new feature implementation, refresh the active spec to SOP v2.4 if it contains current-code facts, external claims, or high-risk compliance/security decisions.
> Amended 2026-05-07: Added SmartDrawer topic folder behavior closure before Family/Profile acceptance after manual QA found topic-started conversations were not persisted under the selected topic.
> Amended 2026-05-20: Growth Plan, memory/profile learning, onboarding, analytics MVP, compliance copy, and Dashboard entry behavior have been implemented on the current baseline. Crisis Calm is archived. Report Analysis remains a separate P1/post-MVP candidate.
> Amended 2026-05-27: Report Analysis spec was refreshed with SOP v2.4 evidence, Search Ledger, ADR-lite, post-MVP minimum scope, upload/privacy/security boundaries, and Growth Plan handoff rules. Implementation still requires a dedicated branch and normal technical/functional/human acceptance gates.
> Amended 2026-06-10: Added Chat RAG Answer Quality as MVP launch hardening P0. This is shared chat infrastructure stabilization, not a new product module. See `docs/specs/chat-rag-answer-quality.md`.
> Amended 2026-07-22: Recorded PICO-aware directness scoring and structured evidence status as implemented. The same-prompt English human replay remains the acceptance gate.

1. Stabilize and freeze shared chat infrastructure
2. Finish only the minimum follow-up reminder closure needed to keep the current branch coherent
3. **SOP v2.4 planning refresh for the active slice** (P0 planning hygiene before further implementation)
4. **Compliance MVP launch gate closure** — complete before public launch; high-risk items need EBG / Search Ledger
5. **SmartDrawer topic folder behavior closure** — shared chat/navigation infrastructure; complete before Family/Profile acceptance continues
6. **Family Profile technical + human acceptance**
7. ~~Settings technical + human acceptance~~ — completed 2026-05-07
8. **Dashboard human acceptance**
9. **Growth Plan acceptance closure** — completed on current baseline; only carry forward non-blocking refinements
10. **Memory Profile Summary acceptance closure** — completed on current baseline; only carry forward extraction quality tuning
11. **Analytics MVP launch hygiene** — event correctness, internal-user filtering, and weekly report verification
12. **AI usage quota and abuse-prevention closure**; reopened on 2026-07-26 after the audit found browser-reachable model calls outside the product allowance, a competing guest browser counter, incomplete reset metadata, and missing focused boundary tests. Follow `docs/specs/ai-usage-quota.md` before public launch.
13. **Registered onboarding fallback closure**; add the authenticated user fallback defined in `docs/specs/onboarding.md` and `docs/reviews/registered-onboarding-fallback-2026-07-26.md`. Consent must run first. Existing values must be pre-populated. No reset command is permitted.
14. **Chat RAG Answer Quality launch hardening** — complete before public MVP launch if current replay/manual tests still show citation mismatch, over-agreeing, or same-topic RAG context drift. This work is scoped by `docs/specs/chat-rag-answer-quality.md` and must not expand into Paper Topics, Report Analysis, or new services.
15. `report-analysis` dedicated implementation branch as first P1/post-MVP feature after launch readiness is closed
16. `membership-billing` (post-MVP required monetization; Stripe checkout, billing portal, entitlement sync)
17. Return to deeper follow-up reminder iteration only after the higher-frequency product paths above are stable

Rationale:

- Shared chat infrastructure is already the foundation for all later modules.
- SmartDrawer unification is already implemented in the current branch; future work should validate rather than reimplement it.
- Dashboard is the feature hub that provides entry points to Family Profile, Growth Plan, and Reports.
- **Compliance is a launch gate** — must be completed before public launch regardless of feature development order. Can be executed in parallel with feature modules since it touches separate files.
- `family-profile` is the first module card on Dashboard and the simplest to validate.
- `settings` is low-urgency (name editing works in UserMenu already) but needed for completeness. A minimal version (account deletion only) is created as part of compliance.
- `growth-plan` is now part of the accepted product loop.
- `report-analysis` is the first desired P1/post-MVP feature. Its refreshed spec now defines the post-MVP minimum scope, upload/privacy/security review, provider-neutral user-visible copy, and Growth Plan handoff rules; implementation still needs a dedicated branch.
- `crisis-calm` is archived for MVP and should not be selected unless the user reopens it.
- `memory-profile-summary` is now part of the accepted product loop; quality improvements should be treated as refinements rather than core blocking work.
- `membership-billing` is intentionally after launch readiness, but it is a required post-MVP business module, not an optional cleanup item. MVP should launch the free product first; monetization comes after the core feature loop and quota-bearing modules are stable in real code.
- Provider-neutral config aliases are optional hardening, not an MVP blocker: a future cleanup may add generic `LLM_*` env aliases with legacy provider-specific env fallback and no behavior change. Do not do a broad provider-name rewrite during MVP launch stabilization.
- Provider confidentiality for MVP launch means user-visible surfaces and ordinary telemetry/log output must not name the underlying model vendor. Source-only provider-specific environment variable names may remain temporarily because changing them is a larger config/runtime migration. If renamed later, do it as a dedicated compatibility change with legacy env fallback and full local build/API verification.
- Chat RAG Answer Quality is the active shared-chat hardening slice if answer replay still shows drift or citation/source inconsistency. It should improve the current RAG path without changing the public product surface.

---

## 7. Forward Execution Rule

From now on, every new implementation step must be driven by this document set:

1. latest `agent-dev-sop` for process, AQS, EBG, evidence, and gate discipline
2. `formal-basis-entry.md` for canonical document priority and reading strategy
3. `project-control.md` for execution order and status
4. `system-architecture.md` for structure and boundaries
5. the target module spec for behavior and scope
6. the vertical-slice plan for sequencing only

This order is mandatory. Do not invert it.

---

## 8. Deferred Optimization Rule

Non-blocking bugs, UX inconsistencies, and deferred engineering improvements must be recorded in:

- `docs/optimization-backlog.md`

This backlog is for items that should be remembered without interrupting the current module sequence.
Do not mix these items into module acceptance results unless they block correctness for the current slice.

---

## 9. Environment Rule

Local development and acceptance testing must not default to production Supabase.

Database-backed work must use this order:

1. Local Supabase (`docs/local-test-environment.md`)
2. Staging Supabase or Supabase branch
3. Production Supabase

Production Supabase is only for validated migrations and production maintenance. Guest migration testing, schema experiments, repeated refresh tests, and destructive cleanup must happen locally first.

Every schema change must be captured in version-controlled SQL under `supabase/migrations/` before it is applied to staging or production.

---

## 10. Security Release Gate Rule

Before public release, major data-flow changes, authentication changes, database migrations, AI/RAG behavior changes, upload/report features, billing, or any feature that stores child/family/sensitive information, run a security release gate in this order:

1. Govern and scope
   - Identify the launch slice, data classes, user roles, trust boundaries, third-party processors, regulatory assumptions, and explicit non-goals.
   - Record owner decisions and residual risk in the relevant spec or review note.
2. Identify attack surface
   - Inventory routes, API endpoints, database tables, RLS policies, browser storage, background jobs, external calls, and AI/tool boundaries touched by the slice.
   - Confirm local/staging/production environment targets before running any write or migration.
3. Protect by design
   - Verify deny-by-default auth, per-request authorization, ownership checks, RLS, input/schema limits, output handling, CSRF/session posture, secure headers, secret handling, and data minimization.
   - For LLM features, verify prompt-injection boundaries, sensitive-information disclosure controls, tool/action limits, retrieval grounding, and user-facing uncertainty language.
4. Verify implementation
   - Run risk-scaled machine checks: dependency audit, type/build, route/API smoke, authorization and cross-user tests, RLS inspection, migration replay/rollback path, secret scan, logging scan, and feature-specific regression scripts.
   - Use OWASP ASVS/API/LLM controls as the checklist source, not only the OWASP awareness Top 10.
5. Detect and operate
   - Confirm security logging for auth failures, authorization failures, rate-limit triggers, high-risk changes, provider failures, and deletion/export events.
   - Confirm logs do not contain chat content, child/family profile details, tokens, credentials, or other sensitive data.
6. Respond and recover
   - Confirm backup/restore, migration rollback or roll-forward, account deletion cascade, incident contact path, breach/regulatory revisit triggers, and secret rotation plan.
7. Human acceptance
   - Human acceptance can start only after the technical gate passes and residual launch conditions are written down.
8. Merge, deploy, or carry forward
   - Required launch blockers must be fixed before release.
   - MVP-conditional residual risks must have an owner, accepted scope, revisit trigger, and post-MVP task if they are not fixed now.

Evidence basis:

- NIST Cybersecurity Framework 2.0 organizes risk management around Govern, Identify, Protect, Detect, Respond, and Recover.
- NIST SP 800-218 Secure Software Development Framework defines secure development practices for preparing the organization, protecting software, producing well-secured software, and responding to vulnerabilities.
- OWASP ASVS provides the technical verification standard for application security controls.
- OWASP API Security Top 10 2023 highlights API-specific risks such as object-level authorization, authentication, resource consumption, sensitive business flows, SSRF, and unsafe API consumption.
- OWASP Top 10 for LLM Applications 2025 adds AI-specific checks for prompt injection, sensitive information disclosure, LLM supply chain, excessive agency, insecure output handling, and overreliance.
- CISA Secure by Design / Secure by Default guidance requires product teams to shift more security responsibility into the product and default configuration rather than relying on users to compensate later.
