# Project Control — Qimi Web

> Created: 2026-03-15 | Amended: 2026-03-16 (route restructure, module rename, execution order update) | Amended: 2026-05-06 (SOP v2.4 + local Supabase acceptance + current code reality)
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
- local database resets from `supabase/migrations/` and `supabase/seed.sql`
- Next.js reads local Supabase via `.env.local`
- guest chat reply flow works
- assistant markdown table rendering works
- internal DSML tags are stripped from user-visible assistant output
- guest chat order survives refresh
- guest chat migrates to a logged-in account
- repeated refresh and re-login do not duplicate migrated conversations
- SmartDrawer history click loads the correct conversation and supports continued replies

This acceptance result belongs to the shared local test environment and chat/guest-migration infrastructure slice, not to a downstream product module.

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
- Follow-up reminder module: `Partially implemented`
- AppLayout → SmartDrawer unification: `Implemented` (code reality: `components/Layout/AppLayout.tsx:5-54` imports and renders SmartDrawer)
- Dashboard (feature hub): `Implemented` and human-accepted in current working branch
- Family Profile (was User Profile): `Implemented` and human-accepted in current working branch
- **Compliance (MVP launch gate)**: `Partially implemented` (delete-account/settings pieces exist; privacy/terms/consent pages and high-risk EBG record still pending)
- Settings (account): `Implemented` and human-accepted in current working branch
- Growth Plan: `Planned`
- Report Analysis: `Planned`
- Crisis Calm: `Planned`
- Memory Profile Summary: `Partially implemented` (memory API routes and migrations exist; prompt/chat integration still requires acceptance)
- Membership & Billing: `Planned` (post-MVP monetization module, spec: `docs/specs/membership-billing.md`)
- ~~User Profile~~: `Superseded` — split into Family Profile + Settings (2026-03-16)

---

## 6. Forward Module Order

The project must move forward in this order unless the user explicitly overrides it:

> Amended 2026-03-16: Added SmartDrawer unification and Dashboard as prerequisites. User Profile split into Family Profile + Settings.
> Amended 2026-03-17: Added compliance module as launch gate. Can execute in parallel with feature modules.
> Amended 2026-05-06: Before new feature implementation, refresh the active spec to SOP v2.4 if it contains current-code facts, external claims, or high-risk compliance/security decisions.
> Amended 2026-05-07: Added SmartDrawer topic folder behavior closure before Family/Profile acceptance after manual QA found topic-started conversations were not persisted under the selected topic.

1. Stabilize and freeze shared chat infrastructure
2. Finish only the minimum follow-up reminder closure needed to keep the current branch coherent
3. **SOP v2.4 planning refresh for the active slice** (P0 planning hygiene before further implementation)
4. **Compliance MVP launch gate closure** — complete before public launch; high-risk items need EBG / Search Ledger
5. **SmartDrawer topic folder behavior closure** — shared chat/navigation infrastructure; complete before Family/Profile acceptance continues
6. **Family Profile technical + human acceptance**
7. ~~Settings technical + human acceptance~~ — completed 2026-05-07
8. **Dashboard human acceptance**
9. `growth-plan`
10. `report-analysis`
11. `crisis-calm`
12. `memory-profile-summary` prompt integration + acceptance
13. `membership-billing` (post-MVP monetization; Stripe checkout, billing portal, entitlement sync)
14. Return to deeper follow-up reminder iteration only after the higher-frequency product paths above are stable

Rationale:

- Shared chat infrastructure is already the foundation for all later modules.
- SmartDrawer unification is already implemented in the current branch; future work should validate rather than reimplement it.
- Dashboard is the feature hub that provides entry points to Family Profile, Growth Plan, and Reports.
- **Compliance is a launch gate** — must be completed before public launch regardless of feature development order. Can be executed in parallel with feature modules since it touches separate files.
- `family-profile` is the first module card on Dashboard and the simplest to validate.
- `settings` is low-urgency (name editing works in UserMenu already) but needed for completeness. A minimal version (account deletion only) is created as part of compliance.
- `growth-plan` and `report-analysis` follow as the next product-loop features.
- `crisis-calm` is intentionally isolated and can be built later.
- `memory-profile-summary` depends conceptually on stable profile and history foundations.
- `membership-billing` is intentionally last. MVP should launch the free product first; monetization comes after the core feature loop and quota-bearing modules are stable in real code.

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
