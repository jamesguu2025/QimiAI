# Project Control — Qimi Web

> Created: 2026-03-15 | Amended: 2026-03-16 (route restructure, module rename, execution order update)
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
2. `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/formal-basis-entry.md`
3. `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/planning-review-rules.md`
4. `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/project-control.md`
5. `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/system-architecture.md`
6. The relevant module spec under `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/specs/`
7. `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/网页版开发计划-v2-垂直切片.md`
8. Review notes and temporary docs

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

---

## 5. Current Module Status Baseline

Use these labels only:

- `Implemented`
- `Implemented, not yet human-accepted`
- `Partially implemented`
- `Planned`
- `Archived`

Current baseline:

- Chat infrastructure: `Implemented` and human-accepted in current working branch
- Follow-up reminder module: `Partially implemented`
- AppLayout → SmartDrawer unification: `Planned` (P0 blocker for all new module pages)
- Dashboard (feature hub): `Implemented, not yet human-accepted` (spec: `docs/specs/dashboard.md`, status DONE)
- Family Profile (was User Profile): `Planned` (renamed + rescoped 2026-03-16, spec: `docs/specs/family-profile.md`)
- **Compliance (MVP launch gate)**: `Planned` (added 2026-03-17, spec: `docs/specs/compliance.md`)
- Settings (account): `Planned` (split from User Profile 2026-03-16, spec: TBD — minimal version created as part of compliance module)
- Growth Plan: `Planned`
- Report Analysis: `Planned`
- Crisis Calm: `Planned`
- Memory Profile Summary: `Planned`
- ~~User Profile~~: `Superseded` — split into Family Profile + Settings (2026-03-16)

---

## 6. Forward Module Order

The project must move forward in this order unless the user explicitly overrides it:

> Amended 2026-03-16: Added SmartDrawer unification and Dashboard as prerequisites. User Profile split into Family Profile + Settings.
> Amended 2026-03-17: Added compliance module as launch gate. Can execute in parallel with feature modules.

1. Stabilize and freeze shared chat infrastructure
2. Finish only the minimum follow-up reminder closure needed to keep the current branch coherent
3. **AppLayout → SmartDrawer unification** (P0 infrastructure — blocks all items below)
4. **Dashboard** (feature hub page — entry point for items below)
5. **Compliance (MVP launch gate)** — can execute in parallel with items 5–10 since it touches separate files. Must be complete before public launch.
6. `family-profile` (was `user-profile`)
7. `settings` (account settings — minimal version with account deletion created by compliance; full version later)
8. `growth-plan`
9. `report-analysis`
10. `crisis-calm`
11. `memory-profile-summary`
12. Return to deeper follow-up reminder iteration only after the higher-frequency product paths above are stable

Rationale:

- Shared chat infrastructure is already the foundation for all later modules.
- SmartDrawer unification must happen before any new module page, because all logged-in pages now share the same sidebar.
- Dashboard is the feature hub that provides entry points to Family Profile, Growth Plan, and Reports.
- **Compliance is a launch gate** — must be completed before public launch regardless of feature development order. Can be executed in parallel with feature modules since it touches separate files.
- `family-profile` is the first module card on Dashboard and the simplest to validate.
- `settings` is low-urgency (name editing works in UserMenu already) but needed for completeness. A minimal version (account deletion only) is created as part of compliance.
- `growth-plan` and `report-analysis` follow as the next product-loop features.
- `crisis-calm` is intentionally isolated and can be built later.
- `memory-profile-summary` depends conceptually on stable profile and history foundations.

---

## 7. Forward Execution Rule

From now on, every new implementation step must be driven by this document set:

1. `project-control.md` for execution order and status
2. `system-architecture.md` for structure and boundaries
3. the target module spec for behavior and scope
4. the vertical-slice plan for sequencing only

This order is mandatory. Do not invert it.
