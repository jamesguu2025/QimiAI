# Onboarding Documentation Closure And Light Regression — 2026-05-19

> Scope: onboarding documentation closure after Growth Plan completion.
> Result: PASS for documentation closure and static light regression.
> Environment: no local Supabase or dev server started; this was a documentation-only closure with static code-path checks.

---

## Decision

This onboarding pass did not change implementation code. It added `docs/specs/onboarding.md` to freeze the current behavior and boundaries.

Existing acceptance from `docs/project-control.md` remains valid for the previously tested local Supabase and guest migration path:

- guest chat reply flow
- guest conversation refresh/order preservation
- guest chat migration into logged-in account
- repeated refresh/re-login without duplicate migrated conversations
- SmartDrawer history click and continued replies

No full re-test is required for this documentation-only change. Future full regression is required only if code changes touch onboarding, guest storage, migration, consent, Family Profile read path, or related schema.

---

## Light Regression Checks

Static checks were run on 2026-05-19 against branch `sprint0-complete`.

| Check | Evidence | Result |
|---|---|---|
| Guest onboarding is still mounted from `/chat` | `pages/chat.tsx` imports `GuestOnboarding` and renders it when `showOnboarding` is true | PASS |
| First-visit guest gate still uses guest completion state | `pages/chat.tsx` calls `guestStorage.hasCompletedOnboarding()` before showing onboarding | PASS |
| Onboarding completion still initializes guest storage and starts first question | `pages/chat.tsx` calls `guestStorage.initSession(...)` and then `handleSend(data.firstQuestion)` | PASS |
| Guest storage still uses `qimi_guest_data` | `utils/guest-storage.ts` defines `GUEST_KEY = 'qimi_guest_data'` | PASS |
| Guest login still triggers migration | `pages/chat.tsx` calls `guestStorage.migrateToUser(session.user.email)` when session and guest data exist | PASS |
| Migration still writes child profile data to `child_profiles` | `pages/api/user/migrate-guest-data.ts` upserts into `child_profiles` | PASS |
| Family Profile still reads and displays onboarding challenges | `pages/family.tsx` renders `ChallengeTags` with `childProfile?.challenges` | PASS |
| Family Profile still treats challenges as read-only | `ChildInfoCard` does not submit challenges; `/api/family` POST only upserts basic child fields | PASS |
| Consent gate still exists for logged-in app pages | `components/Layout/AppLayout.tsx` calls `/api/compliance/consent-status` and redirects to `/consent` when missing | PASS |
| Email signup still requires adult/authorized-share confirmation | `components/Auth/LoginModal.tsx` blocks signup unless consent checkbox is checked | PASS |
| OAuth/other logged-in paths still rely on `/consent` gate | OAuth callback goes to `/chat`; `AppLayout` handles missing consent | PASS |

Command evidence:

```bash
rg -n "showOnboarding|hasCompletedOnboarding|migrateToUser|initSession|GuestOnboarding|consent-status|ChallengeTags|child_profiles|qimi_guest_data" \
  pages/chat.tsx utils/guest-storage.ts pages/api/user/migrate-guest-data.ts \
  components/Layout/AppLayout.tsx components/Auth/LoginModal.tsx pages/consent.tsx \
  pages/family.tsx pages/api/family/index.ts components/Family/ChildInfoCard.tsx \
  components/Family/ChallengeTags.tsx
```

---

## Not Re-tested

The following were intentionally not re-run because no implementation code changed:

- local Supabase reset
- guest migration database write test
- browser/manual UI walkthrough
- `npm run build`
- `npx tsc --noEmit`

These should be re-run if the next implementation task modifies onboarding, guest storage, auth/consent, migration, Family Profile, or schema.

---

## Follow-up Notes

- Current `hasCompletedOnboarding()` uses `childAge` as the completion marker. This is accepted as current behavior, but the spec records a follow-up decision to consider checking the full MVP required field set.
- Web currently has 9 onboarding challenge categories while the mini-program blueprint lists 10. This is accepted as current behavior for this documentation closure; a later product decision can add or explicitly freeze the Web subset.

