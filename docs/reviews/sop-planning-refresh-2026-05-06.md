# SOP Planning Refresh Review — Qimi Web

> Date: 2026-05-06
> Scope: Validate Qimi AI English web planning/setup documents against the latest `agent-dev-sop` and current repo reality.
> Status: PARTIAL PASS — architecture direction is sound; SOP v2.4 evidence discipline and document/code synchronization require follow-up.

---

## 1. SOP Basis

Method authority:

- `/Users/jamesguu/Library/CloudStorage/OneDrive-个人/work/Million Dollar Business/agent-dev-sop/01-总流程.md`
- `/Users/jamesguu/Library/CloudStorage/OneDrive-个人/work/Million Dollar Business/agent-dev-sop/02-规划者手册.md`
- `/Users/jamesguu/Library/CloudStorage/OneDrive-个人/work/Million Dollar Business/agent-dev-sop/07-架构质量标准(AQS).md`
- `/Users/jamesguu/Library/CloudStorage/OneDrive-个人/work/Million Dollar Business/agent-dev-sop/08-设计阶段循证Gate(EBG).md`

Project authority:

- `docs/formal-basis-entry.md`
- `docs/planning-review-rules.md`
- `docs/project-control.md`
- `docs/system-architecture.md`
- `docs/local-test-environment.md`
- `docs/specs/*.md`

SOP interpretation:

- This review is a planning/review pass, not a feature implementation pass.
- Current code facts below use `file_path:Lstart-Lend` references per SOP v2.4 internal evidence rules.
- External claims below are limited to official docs found and opened during this review pass.

---

## 2. External Evidence Ledger

| Decision / Claim | Source Type | Source URL | Supported Claim | Unsupported Gap | Status |
|---|---|---|---|---|---|
| Pages Router file-based routing is valid for this app's current `pages/` structure. | official | https://nextjs.org/docs/basic-features/pages | Next.js Pages Router maps files in `pages/` to routes and remains documented/supported. | Does not decide whether the project should later migrate to App Router. | Accepted |
| Next.js API routes under Pages Router are valid for backend endpoints in the same app. | official | https://nextjs.org/docs/pages/building-your-application/routing | Next.js Pages Router supports API Routes alongside page routes. | Does not define project-specific auth or response format. | Accepted |
| NextAuth v4 `getServerSession` is appropriate inside API routes with exported `authOptions`. | official | https://next-auth.js.org/configuration/nextjs | NextAuth documents `getServerSession(req, res, authOptions)` in API Routes and recommends it for server-side session retrieval. | Auth.js v5 has newer patterns; this project currently uses `next-auth` v4. | Accepted |
| Supabase RLS should be enabled for exposed schemas and user-owned policies should scope by `auth.uid() = user_id`. | official | https://supabase.com/docs/guides/database/postgres/row-level-security | Supabase recommends RLS for exposed schemas and shows own-row policies using `auth.uid()` against `user_id`. | Does not prove every current migration is already correct; each table still needs audit. | Accepted |
| Local Supabase development with CLI, migrations, `supabase db reset`, and `supabase/seed.sql` is aligned with official workflow. | official | https://supabase.com/docs/guides/cli/local-development | Supabase documents local stack, versioned migrations under `supabase/migrations`, `supabase db reset`, and seed data via `supabase/seed.sql`. | Does not validate this repo's specific seed data or auth fixtures. | Accepted |
| Vercel Cron is an acceptable scheduling mechanism for Vercel-hosted Next.js functions. | official | https://vercel.com/docs/cron-jobs | Vercel supports cron jobs for Vercel Functions and configuration through `vercel.json`. | Does not validate current follow-up cron security or idempotency. | Accepted |
| COPPA-covered child-data collection requires verifiable parental consent unless an exception applies. | official | https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions | FTC FAQ states operators generally must obtain verifiable parental consent before collecting personal information online from children under 13. | Does not validate the app's final consent UX or determine whether a particular data-minimization scope avoids COPPA coverage. | Accepted |
| A COPPA consent method must be reasonably designed to ensure the person giving consent is the child's parent. | official | https://www.ftc.gov/business-guidance/privacy-security/verifiable-parental-consent-childrens-online-privacy-rule | FTC guidance frames the standard for verifiable parental consent methods and lists approved/denied method-review outcomes. | Does not support a checkbox-only method for public launch. | Accepted |

Evidence classification:

- Source axis: external research supported.
- Maturity axis: stable for the current stack, except App Router migration is intentionally out of scope.

---

## 3. Internal Code Evidence

| Code Fact | Evidence |
|---|---|
| The project currently exposes local Supabase and env-switching scripts. | `package.json:L5-L15` |
| The project currently depends on Next.js, NextAuth v4, Supabase JS, local Supabase CLI, Zustand, React Markdown, and TypeScript. | `package.json:L17-L39` |
| AppLayout imports SmartDrawer and UserMenu. | `components/Layout/AppLayout.tsx:L1-L6` |
| AppLayout renders SmartDrawer and wires chat/topic/conversation navigation. | `components/Layout/AppLayout.tsx:L43-L54` |
| AppLayout includes mobile and desktop UserMenu placement. | `components/Layout/AppLayout.tsx:L61-L80` |
| Dashboard uses AppLayout and exposes Family/Growth/Reports cards. | `pages/dashboard.tsx:L77-L153` |
| Family page uses AppLayout, `/api/family`, read-only challenge tags, family summary, and disclaimer. | `pages/family.tsx:L37-L66`, `pages/family.tsx:L99-L162` |
| Settings page uses AppLayout, fetches `/api/settings`, renders profile editing and delete-account sections. | `pages/settings.tsx:L43-L66`, `pages/settings.tsx:L121-L155` |
| Settings API uses `getServerSession`, `authOptions`, and Supabase admin access. | `pages/api/settings/index.ts:L6-L44` |
| Settings API supports authenticated GET profile and PUT name update. | `pages/api/settings/index.ts:L77-L139` |
| Guest migration writes birthday/challenges into `child_profiles`. | `pages/api/user/migrate-guest-data.ts:L118-L141` |
| Guest migration deduplicates migrated conversations using migration id and message signatures. | `pages/api/user/migrate-guest-data.ts:L156-L231` |
| Shared modal signup currently shows terms/privacy acknowledgement but not a stored parental-consent record. | `components/Auth/LoginModal.tsx:L284-L291` |
| Account deletion API uses `getServerSession`, requires `confirmation === 'DELETE'`, and deletes the user row through Supabase admin. | `pages/api/user/delete-account.ts:L19-L56` |
| Initial local migration still has broad `USING (true)` RLS policies for user-owned tables. | `supabase/migrations/20260506000100_initial_schema.sql:L51-L61` |
| Current `pages/` tree does not include `pages/login.tsx`, `pages/privacy.tsx`, `pages/terms.tsx`, or `pages/consent.tsx`. | `find pages -maxdepth 2 -type f` output reviewed on 2026-05-06 |

---

## 4. Assessment

### 4.1 Framework Quality

Result: PASS with update requirements.

The project has the correct two-layer planning structure:

- Layer 1 architecture exists in `docs/system-architecture.md`.
- Layer 2 module specs exist under `docs/specs/`.
- Formal basis isolation exists in `docs/formal-basis-entry.md`.
- Project order and acceptance policy exist in `docs/project-control.md`.
- Local test environment policy exists in `docs/local-test-environment.md`.

This matches the SOP's intended planning shape.

### 4.2 Setup Documentation

Result: PASS.

`docs/local-test-environment.md` is aligned with official Supabase local development guidance:

- local stack first
- versioned migrations
- reset to known state
- seed data
- production only after local/staging verification

The project scripts in `package.json:L6-L15` support this workflow.

### 4.3 Architecture Documentation

Result: PARTIAL PASS.

The selected architecture is mature and appropriately simple for the first 5,000 users:

- single Next.js app
- Pages Router
- API routes
- NextAuth session checks
- Supabase primary DB/storage
- local Supabase for database-backed acceptance
- SmartDrawer/AppLayout global shell

Required corrections were made in this pass:

- SmartDrawer unification is now marked implemented, not planned.
- `/dashboard`, `/family`, and `/settings` are now marked implemented but not yet human-accepted.
- `/login` is no longer listed as an implemented standalone page because current code has no `pages/login.tsx`.
- module migration guidance now points to `supabase/migrations/` rather than standalone module SQL files.
- membership/subscription references are now treated as future billing infrastructure, not current schema/API facts.

### 4.4 Spec Quality

Result: PARTIAL PASS.

Most specs are good enough for old-SOP execution, but not yet good enough for latest SOP v2.4.

Strengths:

- Most specs include feature requirements, API shape, components, pages, acceptance criteria, and task lists.
- Most specs include machine gate and human gate metadata.
- Specs are generally MVP-scoped and avoid broad over-engineering.

Gaps:

- Almost no specs contain SOP v2.4 `file_path:Lstart-Lend` evidence for current-code facts.
- Most specs lack Considered Alternatives, Prior Art / References, and two-axis evidence classification.
- High-risk compliance decisions lack ADR-lite and Search Ledger detail.
- Some specs are stale against current code, especially settings, family, memory, and architecture status fields.

Corrections made in this pass:

- Active and planned specs now use shared modal auth as the current unauthenticated-user pattern instead of stale `/login` instructions.
- Active database work now points to versioned `supabase/migrations/`; old module SQL filenames are marked as legacy/reference snippets.
- Compliance no longer treats checkbox-only consent as public-launch evidence.
- SmartDrawer, Dashboard, Family, Settings, Memory, Growth Plan, Reports, Follow-up, Membership, and superseded User Profile specs were annotated or corrected where they conflicted with current code or SOP v2.4 evidence rules.

### 4.5 Compliance / High-Risk Gate

Result: FAIL until refreshed.

Compliance touches child data, medical disclaimers, privacy/terms, account deletion, consent, and RLS. Under EBG this is high-risk. Before public launch, the compliance spec needs:

- ADR-lite rows for consent method, deletion scope, disclaimer behavior, static legal pages, and RLS policy posture
- Search Ledger rows for each high-risk decision
- Supported Claim / Unsupported Gap for COPPA, FTC, medical disclaimer positioning, and RLS defense-in-depth claims
- Confirmation plan: local migration reset, account deletion smoke test, consent flow smoke test, RLS policy audit

Current missing route evidence:

- `pages/privacy.tsx` is absent.
- `pages/terms.tsx` is absent.
- `pages/consent.tsx` is absent.

---

## 5. AQS Result

### Security

- [PASS] Current setup policy requires local Supabase before production database testing.
- [PASS] API route auth pattern is aligned with NextAuth v4 official guidance.
- [PARTIAL] RLS is a documented requirement, but table-by-table RLS audit still needs a dedicated acceptance pass.
- [FAIL] Compliance launch-gate spec lacks EBG Search Ledger for high-risk child/medical/privacy decisions.

### Architecture

- [PASS] Single Next.js app + Pages Router + API routes is supported by official Next.js docs and appropriate for MVP.
- [PASS] SmartDrawer/AppLayout unification is now implemented in current code.
- [PASS] Module route ownership is clear.
- [PARTIAL] Route table was stale before this pass; corrected for current known routes, but planned legal/consent routes still need implementation.

### Engineering Quality

- [PASS] Machine gates are documented in most specs.
- [PARTIAL] Latest SOP v2.4 internal evidence requirements were not present in older specs.
- [PARTIAL] Review records exist, but many are old content-level AQS reviews and do not satisfy current cross-review/evidence rules.

### Technical Stack Compliance

- [PASS] Next.js Pages Router, NextAuth v4, Supabase CLI/local migrations, Supabase RLS, and Vercel Cron are all official/documented stack capabilities.
- [PARTIAL] Dependency versions are current enough to build, but `package.json` uses `next` 16.1.1 with optional SWC packages pinned to 14.2.5. Build currently passes, but this should be reviewed before deployment hardening.

### Reverse Check

- [PASS] No new service split, microservice architecture, or global module registry is needed.
- [PASS] Updating existing canonical docs was preferred over creating many new planning docs.
- [PARTIAL] One new review artifact was added because the SOP refresh has a distinct lifecycle and audit purpose.

---

## 6. Required Follow-Up

P0 before public launch:

1. Refresh `docs/specs/compliance.md` to SOP v2.4 with ADR-lite, Search Ledger, internal code evidence, and AQS/EBG sections.
2. Implement or explicitly defer `/privacy`, `/terms`, and `/consent`; update route table and compliance spec accordingly.
3. Run a table-by-table RLS policy audit against `supabase/migrations/`.

P1 before next module implementation:

1. Refresh the active target spec before assigning execution work.
2. Add `file_path:Lstart-Lend` evidence to all current-code facts in that spec.
3. Update the matching review record after the spec refresh.

P2:

1. Gradually backfill Considered Alternatives / Prior Art / Evidence Classification in older planned specs as they become active.
2. Move legacy module SQL snippets to clearly marked reference status if they continue to coexist with `supabase/migrations/`.

---

## 7. Conclusion

The Qimi web planning framework is structurally sound and consistent with the SOP's two-layer design model. The setup documentation is directionally correct and supported by official stack documentation. The main gap is that the current project docs were written under an older SOP level and now need v2.4 evidence discipline, especially for high-risk compliance and any spec that describes existing code.

---

## 8. Closeout Audit (2026-05-07)

Scope:

- Re-scan fixed framework docs and all specs for stale execution instructions.
- Verify that residual old-route, old-SQL, subscription, and RLS references are either corrected or intentionally marked as future/historical/legacy.
- Re-run whitespace/conflict check on the edited documentation set.

Commands run:

- `rg` scan across `docs/project-control.md`, `docs/system-architecture.md`, `docs/local-test-environment.md`, this review file, and `docs/specs/` for old `/login`, standalone module SQL, subscription, and RLS patterns.
- `find pages -maxdepth 2 -type f | sort`
- `find supabase/migrations -maxdepth 1 -type f | sort`
- `rg` scan across `pages`, `components`, and `supabase/migrations` for auth modal, subscription, consent, and `USING (true)` facts.
- `git diff --check` on the edited docs set.

Result:

- PASS: No remaining active spec instruction tells implementers to create or depend on a current standalone `pages/login.tsx`. Remaining mentions are explicit "no current standalone login", emergency no-auth behavior, or superseded historical notes.
- PASS: Active migration instructions now point to `supabase/migrations/`. Remaining standalone module SQL filenames are marked as legacy/reference/historical.
- PASS: Growth Plan and Report Analysis no longer depend on a current `GET /api/user/subscription` route or current `users.subscription_tier` column. Remaining subscription references are confined to the planned Membership & Billing spec or explicit "not implemented yet" notes.
- PASS: `git diff --check` returned clean output for the edited documentation set.
- EXPECTED GAP: RLS `USING (true)` still exists in current migrations and remains a real technical/compliance follow-up:
  - `supabase/migrations/20260506000100_initial_schema.sql:L51-L61`
  - `supabase/migrations/20260506000200_family_tables.sql:L20-L23`
  - `supabase/migrations/20260506000300_memory_profile_summary_tables.sql:L18-L21`
  - `supabase/migrations/20260506000300_memory_profile_summary_tables.sql:L56-L59`
- EXPECTED GAP: `pages/privacy.tsx`, `pages/terms.tsx`, `pages/consent.tsx`, and `pages/api/compliance/*` are still absent. Compliance remains a launch gate, not accepted implementation.

Closeout conclusion:

- The fixed planning/framework/spec documentation is coherent enough to serve as the current baseline.
- Do not run another full planning audit before choosing the next work item.
- Next recommended work is either Compliance MVP launch-gate closure or technical/human acceptance for Family, Settings, and Dashboard.
