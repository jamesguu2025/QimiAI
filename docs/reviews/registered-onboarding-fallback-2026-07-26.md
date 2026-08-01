# Registered Onboarding Fallback Review

> Date: 2026-07-26
> Related spec: `docs/specs/onboarding.md`
> Result: IMPLEMENTED AND ACCEPTED

## Question

Should an authenticated user who has not completed onboarding be routed through onboarding, and what is the safest and least disruptive implementation?

## Current code audit

1. `pages/chat.tsx` suppresses guest onboarding whenever a session exists. It does not check `child_profiles` first.
2. `components/Layout/AppLayout.tsx` enforces consent but has no onboarding completion check.
3. `pages/family.tsx` accepts a null child profile and shows the Family Profile surface. It does not redirect to onboarding.
4. `pages/api/family/index.ts` returns `childProfile: null` when no row exists. Its update route does not accept onboarding challenges.
5. `components/Chat/GuestOnboarding.tsx` already owns the challenge taxonomy and `SelectedChallenge` shape. A registered flow must reuse these definitions instead of creating a parallel schema.
6. The earlier onboarding spec explicitly said not to build registered onboarding. That decision no longer matches the product owner's instruction and is superseded by the amendment dated 2026-07-26.

Conclusion: yes, a registered-first user can currently bypass onboarding indefinitely. The missing fallback is real.

## Search ledger

| Decision | Source | Verified | Applied conclusion |
|---|---|---:|---|
| Avoid redundant input | W3C WCAG 2.2, Understanding SC 3.3.7 | HTTP 200 on 2026-07-26 | Pre-populate existing profile values and do not force users to re-enter them. |
| Ask only necessary questions | GOV.UK Design System, Question pages | HTTP 200 on 2026-07-26 | Keep the fallback short, explain why information is needed, and ask only for missing required data. |
| Collect profile data progressively | Auth0, Progressive Profiling | HTTP 200 on 2026-07-26 | Do not enlarge registration. Collect application-specific profile context after authentication and only when relevant. |
| Track completion durably | Clerk, custom onboarding flow | HTTP 200 on 2026-07-26 | Store an explicit server-managed completion state, redirect incomplete authenticated users, and exempt the onboarding route from its own guard. |
| Minimize child-related data | ICO Children's Code, Data minimisation | HTTP 200 on 2026-07-26 | Collect only the minimum data needed for the active Qimi feature. Do not add diagnostic, school, document, or exact birth-date intake. |
| Change schema through migrations | Supabase, Database Migrations | HTTP 200 on 2026-07-26 | Add completion state with a version-controlled forward-only migration and validate locally before any production action. |

Verified sources:

- https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html
- https://design-system.service.gov.uk/patterns/question-pages/
- https://auth0.com/docs/manage-users/user-accounts/user-profiles/progressive-profiling
- https://clerk.com/docs/guides/development/add-onboarding-flow
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/8-data-minimisation/
- https://supabase.com/docs/guides/deployment/database-migrations

## Options considered

### Option A: Redirect when `child_profiles` is missing

This is simple, but it cannot distinguish an intentionally partial legacy profile from a truly completed onboarding. It also becomes fragile if required fields change.

Decision: reject as the durable design. It may be used only as temporary compatibility logic during migration.

### Option B: Derive completion from name, birth month, birth year, gender, and challenges on every request

This avoids a new column, but it makes optionality difficult and may repeatedly route users when a valid field is empty by design.

Decision: reject as the permanent source of truth. Use the field set only for a one-time legacy backfill decision.

### Option C: Store `onboarding_completed_at` and use a server status endpoint

This separates authentication from activation state, supports audit and future versioning, and avoids browser reset problems. Existing values can be pre-populated and legacy complete rows can be backfilled conservatively.

Decision: accept.

## Target flow

```text
authenticated app request
  -> check consent
  -> if consent missing, redirect to /consent with returnTo
  -> if consent recorded, check server onboarding status
  -> if onboarding incomplete, redirect to /onboarding with returnTo
  -> pre-populate any existing child profile values
  -> collect only missing required profile context
  -> atomically upsert child_profiles and onboarding_completed_at
  -> return to the validated original route
```

## Data and UX decisions

1. Use `child_profiles.onboarding_completed_at TIMESTAMPTZ NULL` as the durable marker.
2. Use a forward-only migration. Do not execute a reset command.
3. Backfill only rows that satisfy the current minimum profile contract. Incomplete legacy rows remain incomplete but their existing values are pre-populated.
4. Keep consent and onboarding separate. Consent is a compliance record; onboarding is product activation and personalization.
5. Reuse the existing challenge taxonomy and `SelectedChallenge` contract through a shared component or shared module.
6. Do not duplicate the guest question-launch step in the registered fallback. A user returning to another app page should not trigger an AI call or an unsolicited chat message.
7. Validate `returnTo` as a same-origin application path. Default to `/dashboard`.
8. Do not block the whole application indefinitely when the onboarding status endpoint has a temporary server failure. Record the error and allow retry. Do not silently mark completion.
9. Track `onboarding:step_complete` and `onboarding:step_dropoff` with an additional non-sensitive `mode` value such as `guest` or `registered`. Do not send names, birthdays, challenge text, or chat content to analytics.

## Required implementation sequence

1. Update the canonical onboarding spec and acceptance cases.
2. Add the forward-only schema migration.
3. Add authenticated status and completion APIs with validation and ownership checks.
4. Extract the current onboarding field definitions and challenge taxonomy so guest and registered flows share one contract.
5. Add `/onboarding` with pre-population and a safe `returnTo` flow.
6. Extend the app gate so consent runs first and onboarding runs second.
7. Update guest migration so a complete migrated profile records completion.
8. Run TypeScript, build, migration lint or dry-run checks, focused API tests, and browser tests against local Supabase without resetting it.
9. Prepare the functional acceptance checklist for human testing.
10. Do not merge or deploy until human acceptance passes.

## Acceptance cases

1. Guest who completed onboarding and then registers keeps the migrated profile and is not asked again.
2. Logged-in user with consent but no child profile is routed to registered onboarding.
3. Logged-in user without consent sees consent first, then onboarding.
4. Existing partial profile is pre-populated and only missing required values need attention.
5. Completed user opening Dashboard, Chat, Family Profile, or Growth Plan is not redirected.
6. Refreshing or restarting the browser does not reset completion.
7. Direct navigation to `/onboarding` does not loop.
8. An onboarding status API failure does not create an infinite redirect.
9. Completion API rejects unauthenticated requests, invalid challenge objects, invalid dates, and unsafe return paths.
10. Analytics contains only event metadata and no child or family content.

## Gate result

- External evidence trace: PASS
- Current code audit: PASS
- Product direction: ACCEPTED
- Implementation: COMPLETE IN WORKTREE
- Technical acceptance: PASS
- Human acceptance: PASS, confirmed by product owner on 2026-07-27
- Merge or deployment: eligible for the later combined launch decision

Technical evidence on 2026-07-26:

- `npx tsc --noEmit`: PASS
- `npm run build`: PASS
- `git diff --check`: PASS
- Local Supabase migration `20260726000300`: applied non-destructively and recorded in migration history
- Local schema check: `child_profiles.onboarding_completed_at` exists as `timestamp with time zone`
- Unauthenticated `GET /api/onboarding/status`: HTTP 401
- Unauthenticated `POST /api/onboarding/complete`: HTTP 401
- Local `/onboarding` route: HTTP 200
