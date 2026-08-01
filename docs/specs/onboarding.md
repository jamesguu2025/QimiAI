# Module Spec: Onboarding

> Status: IMPLEMENTED AND HUMAN-ACCEPTED, 2026-07-27
> Module: onboarding
> Routes: `/chat`, `/onboarding`, `/consent`, `/family`
> Primary component: `components/Chat/GuestOnboarding.tsx`
> Storage: guest browser `localStorage` key `qimi_guest_data`, then Supabase `child_profiles`
> Scope: current 3-step onboarding, guest/registered consistency, guest data migration, adult confirmation / consent gate relationship, Family Profile read path, MVP boundaries.

---

## 0. Planning Baseline

This is a documentation closure for functionality that is already substantially implemented. It freezes current implementation facts from Qimi Web, the Family Profile and Compliance specs, and the mini-program blueprint section "首次用户引导流程" so later modules do not reinterpret guest profile data, consent, or Family Profile ownership.

Canonical inputs:

- `docs/project-control.md`
- `docs/local-test-environment.md`
- `docs/system-architecture.md`
- `docs/specs/family-profile.md`
- `docs/specs/compliance.md`
- Mini-program blueprint: `/Users/jamesguu/WeChatProjects/adhdhelper-cursor/docs/项目技术蓝图.md`
- Current code listed in "Current Code Facts" below.

Local testing rule: database-backed acceptance must use local Supabase first, not production Supabase.

### 0.1 Registered user fallback amendment, 2026-07-26

This amendment supersedes the earlier MVP decision that registered-first users should only use `/family` and should not receive onboarding.

Current code treats an authenticated session as sufficient to suppress onboarding. A logged-in user with no `child_profiles` row therefore reaches the application without the profile context that guest users must provide. This is a real activation gap and must be closed before public MVP launch.

Accepted target behavior:

1. Consent remains the first logged-in gate because Qimi must not persist child or family information before the adult confirmation is recorded.
2. After consent, the server determines whether onboarding is complete. Browser storage and the mere presence of a session are not authoritative.
3. A logged-in user without completed onboarding is routed to `/onboarding` with a validated `returnTo` path.
4. Existing durable profile values are pre-populated. The user is asked only for missing required values and may review values already present.
5. Guest migration and registered onboarding write the same `child_profiles` fields and the same `SelectedChallenge[]` structure.
6. Completion is recorded explicitly in durable storage. It is not inferred forever from one optional field or from an empty challenge list.
7. `/onboarding` and `/consent` are excluded from their own redirect guards. Temporary status-check failures must not create a redirect loop. Consent remains required, while a temporary onboarding-status failure should fail open with retry telemetry because onboarding is an activation requirement, not an authorization boundary.
8. The registered fallback collects only profile context. It must not automatically send a recommended chat question when the user was originally trying to open Dashboard, Family Profile, or Growth Plan.

Technical implementation is complete in the worktree. The feature is not merge-ready until the functional acceptance plan and human acceptance are complete.

---

## 1. Evidence And Source Links

### Search Ledger

| Decision ID | Query | Result | Source URL |
|---|---|---|---|
| ONB-1 data minimization | `FTC COPPA data minimization collect only information reasonably necessary children online service` | Found | https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions |
| ONB-2 health-adjacent minimization | `FTC health app privacy best practices minimize data collection` | Found | https://www.ftc.gov/business-guidance/resources/mobile-health-app-developers-ftc-best-practices |
| ONB-3 progressive question flow | `GOV.UK question pages only ask users for information you really need` | Found | https://design-system.service.gov.uk/patterns/question-pages/ |
| ONB-4 sensitive-topic progressive disclosure | `USWDS progressive disclosure complex form sensitive information context` | Found | https://designsystem.digital.gov/patterns/complete-a-complex-form/establish-trust/ |
| ONB-5 children's privacy defaults | `ICO age appropriate design code data minimisation children online services` | Found(partial) | https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/ |

### Evidence Summary

- COPPA FAQ: when COPPA applies, operators must give parents access/delete controls, retain child data only as long as needed, and must not condition participation on more child information than reasonably necessary. Applicability: direct for child-data minimization principles; legal applicability remains governed by `docs/specs/compliance.md`.
- FTC mobile health app guidance: health app developers should minimize data, avoid unnecessary access, protect retained data, and get affirmative express consent for health data collection outside hidden policy text. Applicability: direct for Qimi's health-adjacent family support posture.
- GOV.UK question-page pattern: teams should know why each question is asked, ask only necessary information, avoid re-asking, pre-populate where possible, include back/continue controls, and optionally use progress indicators. Applicability: direct for 3-step onboarding UX structure.
- USWDS complex-form trust pattern: sensitive forms should provide context, use progressive disclosure, avoid overwhelming users, and avoid asking difficult information without explaining why. Applicability: direct for ADHD/family-stress challenge selection.
- ICO Age Appropriate Design Code: child-oriented privacy design favors high-privacy defaults and collecting/retaining the minimum personal data. Applicability: partial because Qimi MVP is adult-directed, but the minimization principle is relevant because Qimi stores child-related data.

Design conclusion: Qimi onboarding should remain short, contextual, and profile-light. It should collect only the fields needed to personalize the first AI exchange and seed the Family Profile, then let richer profile knowledge emerge progressively through later conversation and explicit Family Profile edits.

---

## 2. Current Code Facts

- The implemented onboarding component is a 3-step guest flow: child info, challenge selection, recommended question. The file header states these three steps directly in `components/Chat/GuestOnboarding.tsx:L1-L8`.
- The onboarding data contract returned to the parent includes `childName`, `childBirthday`, `gender`, `challenges`, and `firstQuestion` in `components/Chat/GuestOnboarding.tsx:L227-L234`.
- Step 1 requires child name, gender, year, and month before continuing in `components/Chat/GuestOnboarding.tsx:L241-L245` and `components/Chat/GuestOnboarding.tsx:L281-L283`.
- Step 2 requires at least one selected challenge before continuing in `components/Chat/GuestOnboarding.tsx:L249-L251` and `components/Chat/GuestOnboarding.tsx:L284-L285`.
- Step 3 requires one selected question before finish in `components/Chat/GuestOnboarding.tsx:L253-L256` and `components/Chat/GuestOnboarding.tsx:L287-L288`.
- Recommended questions are generated from selected challenge templates, deduplicated, shuffled, and limited to 3 in `components/Chat/GuestOnboarding.tsx:L324-L347`.
- Completing onboarding returns the trimmed child name, year/month birthday, gender, selected challenges, and selected first question in `components/Chat/GuestOnboarding.tsx:L350-L360`.
- `/chat` shows onboarding only for unauthenticated users who have not completed local guest onboarding in `pages/chat.tsx:L154-L187`.
- `/chat` stores completed onboarding in guest storage and automatically sends the selected first question in `pages/chat.tsx:L257-L270`.
- Guest chat sends onboarding profile context to the chat API when `childBirthday` or `challenges` exist in `pages/chat.tsx:L239-L254`.
- Guest data is stored under `qimi_guest_data`; `GuestData` contains child fields, challenges, first question, chat history, message count, and timestamps in `utils/guest-storage.ts:L22-L39`.
- Guest session initialization stores child name, birthday, gender, computed age, challenges, first question, message count, empty chat history, and `createdAt` in `utils/guest-storage.ts:L182-L210`.
- Current guest onboarding completion is checked by the presence of `childAge` in `utils/guest-storage.ts:L212-L218`.
- On login, `/chat` detects guest data and calls `guestStorage.migrateToUser(session.user.email)`; successful migration clears chat messages and reloads conversations in `pages/chat.tsx:L158-L180`.
- Guest migration posts to `/api/user/migrate-guest-data` with `{ userId, guestData, migrationId }`, clears local guest data after success, and uses a short local migration lock in `utils/guest-storage.ts:L247-L278`.
- The migration API accepts legacy `guestData` and maps `childName`, `childBirthday`, `gender`, and `challenges` into `childProfile` in `pages/api/user/migrate-guest-data.ts:L61-L86`.
- The migration API upserts `child_profiles` by `user_id` and writes `name`, `birth_year`, `birth_month`, `gender`, and JSONB `challenges` when present in `pages/api/user/migrate-guest-data.ts:L124-L150`.
- The migration API creates a conversation and inserts migrated messages when guest chat history contains at least one user message in `pages/api/user/migrate-guest-data.ts:L152-L277`.
- `child_profiles` is one row per user via `CONSTRAINT child_profiles_user_id_unique UNIQUE (user_id)` in `supabase/migrations/20260506000200_family_tables.sql:L3-L14`.
- The current Family Profile page requires login, opens login modal if unauthenticated, and reads child profile through `/api/family` in `pages/family.tsx:L39-L68`.
- Family Profile renders Child Info plus read-only onboarding challenge tags in `pages/family.tsx:L140-L160`.
- `ChildInfoCard` only edits name, birthday, and gender, and explicitly does not submit challenges in `components/Family/ChildInfoCard.tsx:L1-L4` and `components/Family/ChildInfoCard.tsx:L97-L107`.
- `/api/family` GET returns `challenges` from `child_profiles`, while POST explicitly does not accept challenges and upserts only basic child fields in `pages/api/family/index.ts:L84-L115` and `pages/api/family/index.ts:L135-L169`.
- `ChallengeTags` groups and displays onboarding challenges as read-only pills, with empty-state text if none exist in `components/Family/ChallengeTags.tsx:L1-L4` and `components/Family/ChallengeTags.tsx:L32-L100`.
- `AppLayout` checks `GET /api/compliance/consent-status` for logged-in users and redirects to `/consent?returnTo=...` when consent is missing in `components/Layout/AppLayout.tsx:L31-L55`.
- Email signup requires the adult/authorized-share checkbox and posts consent after successful signup/login in `components/Auth/LoginModal.tsx:L79-L118` and `components/Auth/LoginModal.tsx:L257-L301`.
- OAuth login callbacks go to `/chat`; missing consent is handled by the app-level consent gate rather than the OAuth button itself in `components/Auth/LoginModal.tsx:L128-L130` and `components/Layout/AppLayout.tsx:L31-L55`.
- `/consent` requires login, checks existing consent, records consent, and returns to `returnTo` in `pages/consent.tsx:L16-L24`, `pages/consent.tsx:L31-L49`, and `pages/consent.tsx:L51-L79`.
- Consent API writes `parental_consents` with method, version, IP, user agent, and timestamp in `pages/api/compliance/consent.ts:L66-L85`; the consent constants are in `lib/compliance/consent.ts:L1-L5`.

---

## 3. Onboarding UX Flow

### Current Guest-First Flow

```text
Unauthenticated user opens /chat
  -> if qimi_guest_data has no completed onboarding marker, show GuestOnboarding
  -> Step 1: child name/nickname, gender, birth year, birth month
  -> Step 2: choose one or more challenge subitems from challenge categories
  -> Step 3: choose one recommended question derived from selected challenges
  -> complete onboarding
  -> store guest profile in localStorage
  -> send selected question as the first chat message
```

The flow matches the mini-program blueprint's core shape: full-screen step replacement, challenge selection, recommended question selection, and automatic first AI conversation. Web differs from the blueprint in three important ways:

- Web currently collects child name/nickname and gender in addition to birth year/month.
- Web currently implements 9 challenge categories, while the blueprint lists 10 categories including `family`.
- Web stores guest data in one `qimi_guest_data` object rather than separate mini-program keys such as `child_birthday`, `selected_challenges`, and `guide_child_profile`.

### Registered-First Flow

Authenticated users now have a server-authoritative fallback:

```text
logged-in user opens an app page
  -> AppLayout verifies consent
  -> AppLayout checks /api/onboarding/status
  -> incomplete users go to /onboarding with returnTo
  -> existing child profile values are pre-populated
  -> user completes child info and challenge selection
  -> /api/onboarding/complete verifies session and consent
  -> child_profiles is upserted with onboarding_completed_at
  -> user returns to the original app page
```

Guest and registered users reuse `GuestOnboarding`, the same durable profile fields, and the same `SelectedChallenge` structure. Registered onboarding omits the recommended first-question step so visiting Dashboard or another app page does not trigger an unsolicited AI call.

---

## 4. Data Fields And Storage Location

### MVP Required Fields

These are required to complete the current guest onboarding:

| Field | Current source | Guest storage | Durable storage after migration | Why required |
|---|---|---|---|---|
| `childName` | Step 1 | `qimi_guest_data.childName` | `child_profiles.name` | personalization; nickname is acceptable |
| `childBirthday.year` | Step 1 | `qimi_guest_data.childBirthday.year` | `child_profiles.birth_year` | approximate age personalization |
| `childBirthday.month` | Step 1 | `qimi_guest_data.childBirthday.month` | `child_profiles.birth_month` | approximate age personalization |
| `gender` | Step 1 | `qimi_guest_data.gender` | `child_profiles.gender` | current UI requires boy/girl/other |
| `challenges[]` | Step 2 | `qimi_guest_data.challenges` | `child_profiles.challenges` JSONB | initial concerns and first-response context |
| `firstQuestion` | Step 3 | `qimi_guest_data.firstQuestion` | conversation title / first message context, not `child_profiles` | starts the first chat |

### Optional / Derived Fields

| Field | Storage | Rule |
|---|---|---|
| `childAge` | `qimi_guest_data.childAge` only | Derived from birthday; do not persist as durable source of truth |
| `chatHistory[]` | `qimi_guest_data.chatHistory`, then `conversations` + `messages` | Migrated only if at least one user message exists |
| `messageCount` | `qimi_guest_data.messageCount` | Legacy guest display counter only. The server is authoritative. MVP quota decision: guests receive a permanent 10-message trial allowance, and registered users receive 30 chat messages per Asia/Shanghai day. |
| `createdAt`, `lastVisit` | `qimi_guest_data` | Guest lifecycle metadata |
| `parental_consents.*` | Supabase `parental_consents` | Consent audit, not child profile |

### Data Minimization Rules

- Do not ask for child's full legal name; copy should continue to permit nickname.
- Do not ask for exact day of birth; year and month are enough for age-aware advice.
- Do not ask for diagnosis documents, medication dose, school name, address, phone, photos, or reports in onboarding.
- Challenge tags should be broad concern labels, not a diagnostic intake form.
- Richer details should be collected progressively in chat or explicit later modules, with context and consent.

---

## 5. Guest To Registered Migration Flow

```text
Guest completes onboarding and chats
  -> browser stores qimi_guest_data
  -> user signs up or logs in
  -> /chat detects session + guest data
  -> guestStorage.migrateToUser(email)
  -> POST /api/user/migrate-guest-data
  -> server verifies authenticated session
  -> server gets or creates users row
  -> server upserts child_profiles by user_id
  -> server migrates guest chatHistory into conversations/messages when present
  -> browser clears qimi_guest_data on success
```

Idempotency rules:

- Browser computes a `migrationId` from user, guest `createdAt`, message count, and last guest message id.
- Browser uses `qimi_guest_migration` as a short lock to avoid duplicate in-flight migration.
- Server checks `guest_migration_id` when available and also checks possible duplicate conversations by title and message signature.

Failure rules:

- If migration fails, do not clear guest data.
- If child profile upsert fails, return an error before clearing local guest data.
- If chat history has no user message, migration may skip conversation creation and still return success for profile migration.

---

## 6. Consent And Adult Confirmation Relationship

Onboarding collects child/family information before account registration for guest users. Registration and logged-in app usage are gated separately by adult/authorized-share confirmation.

MVP consent model:

- Guest onboarding is allowed without login for trial use, but guest data remains local until the user registers/logs in.
- Email signup requires the adult confirmation checkbox in the shared login modal.
- OAuth users may not see the email signup checkbox, so `AppLayout` enforces a logged-in consent gate before app pages continue.
- `/consent` records the same consent text and returns the user to the intended page.
- Consent is not a child profile field and must not be merged into onboarding data.
- The consent gate does not replace minimization; onboarding still must avoid unnecessary child/health details.

Ordering:

1. Guest onboarding may happen first in local browser storage.
2. Registration/login may happen later.
3. Consent must be recorded before the logged-in app continues saving child/family data to the account.
4. Guest migration runs after session exists; current `/chat` triggers migration and `AppLayout` consent check in the same logged-in page lifecycle. Acceptance must verify both data migration and missing-consent redirect behavior.

---

## 7. MVP Boundary

In scope:

- 3-step guest onboarding on `/chat`.
- One child profile per account.
- Store onboarding challenge tags as read-only initial concerns.
- Use onboarding data for immediate chat personalization.
- Migrate guest child data and guest chat history into the registered account.
- Display migrated onboarding data in Family Profile.
- Enforce adult/authorized-share confirmation for logged-in app use.

Out of scope:

- Complex multi-child profile management.
- Multiple child selector, switching, per-child conversation routing, or per-child memory partition.
- Editable onboarding challenge selector in `/family`.
- Diagnostic intake, symptom scoring, medication dosage intake, report upload, school data, or exact date of birth inside onboarding.
- Treating onboarding challenges as diagnosis or medical assessment.
- Asking children to onboard themselves or creating child accounts.

One-child constraint: `child_profiles.user_id` is unique, so MVP account data maps to one child profile. Future multi-child support would require a dedicated schema and UX redesign, not an extension of the current onboarding object.

---

## 8. Family Profile Read Model

Family Profile reads onboarding data from durable storage, not directly from guest localStorage.

Read path:

```text
GET /api/family
  -> session email
  -> users.id
  -> child_profiles where user_id = users.id
  -> frontend ChildInfoCard + ChallengeTags
```

Behavior:

- Child name, birth year/month, and gender are editable in `ChildInfoCard`.
- Onboarding challenges are displayed as read-only "Initial Concerns".
- `/api/family` POST must not accept challenge updates.
- If migration has not happened or no challenges exist, Family Profile shows the empty onboarding challenge state.
- Conversation-derived memory and family summary remain separate from onboarding and are owned by the memory/profile-summary modules.

---

## 9. Acceptance Criteria

### Technical Acceptance

- `npm run build` passes.
- TypeScript check passes if run for the branch acceptance scope.
- Local Supabase is used for database-backed migration tests.
- `child_profiles` remains one row per user and stores challenges as JSONB `SelectedChallenge[]`.
- Consent table and ownership-scoped RLS policies remain active after non-destructive local migration application.

### Functional Acceptance Plan

- New guest opening `/chat` sees the 3-step onboarding before chat input.
- Step 1 cannot continue without child name/nickname, gender, year, and month.
- Step 2 cannot continue without at least one challenge.
- Step 3 cannot finish without choosing a recommended question.
- Completing onboarding stores `qimi_guest_data` and automatically sends the selected first question.
- Guest chat response uses the local profile context.
- Email signup from guest path requires adult confirmation before account creation.
- OAuth login without existing consent redirects to `/consent` before continuing logged-in app usage.
- After login, guest child info and challenges appear in `/family`.
- After login, guest chat history appears in saved conversations without duplicate migrations after refresh/re-login.
- `/family` edits child basic info without changing challenge tags.
- `/family` shows onboarding challenges as read-only tags, or the empty state if no challenges were recorded.
- Logged-in user with consent but no completed profile is routed to `/onboarding`.
- Logged-in user without consent is routed to `/consent` first and then to `/onboarding`.
- Existing durable profile values are pre-populated in registered onboarding.
- Registered completion persists across refresh and browser restart.
- Completed users are not redirected back to onboarding.

### Human Acceptance

- Human tester verifies the guest-first path end to end: onboarding -> first AI answer -> signup/login -> consent if needed -> migrated Family Profile -> migrated conversation.
- Human tester verifies registered-first path: login -> consent if missing -> registered onboarding -> original destination.
- Human tester verifies an existing completed user is not asked to onboard again.
- Human tester confirms onboarding copy asks for nickname/approximate age and does not request unnecessary sensitive data.

Acceptance record, 2026-07-27: the product owner confirmed the registered onboarding fallback and guest onboarding path both work as expected in local testing.

---

## 10. Task Split

### Documentation Tasks

1. Add this onboarding spec as the module source of truth.
2. Cross-link `docs/specs/family-profile.md` and `docs/specs/compliance.md` to this spec in a later documentation cleanup pass.

### Implementation Follow-ups

1. Add `docs/specs/onboarding.md` to any formal module index if one is introduced later.
2. Decide whether `hasCompletedOnboarding()` should require all MVP required fields instead of only `childAge`; current implementation uses `childAge` as the completion marker.
3. Decide whether to add the missing mini-program `family` challenge category to Web or formally document the 9-category Web subset as intentional.
4. Add focused regression coverage for guest onboarding completion and guest migration idempotency when the next implementation pass touches this area.
5. Add focused registered onboarding browser coverage after human acceptance confirms the final copy and navigation.

---

## 11. AQS Self Review

### Security

- [PASS] Authentication: durable profile and consent APIs require `getServerSession`; guest data remains local until login.
- [PASS] Authorization: server routes resolve the session user and write by that user; RLS cleanup migration scopes `child_profiles` by `auth.uid() = user_id`.
- [PASS] Data minimization: onboarding avoids exact DOB, reports, school, address, and diagnostic intake.
- [PASS] Consent boundary: adult confirmation is recorded separately in `parental_consents`.
- [PASS] Cost boundary: registered onboarding does not call the AI provider and therefore does not consume an AI allowance.

### Architecture

- [PASS] Layering: onboarding UI, guest storage, migration API, Family Profile read model, and consent gate are documented as separate responsibilities.
- [PASS] Navigation: guest onboarding is reached through `/chat`; registered fallback is `/onboarding`; durable profile review/edit is `/family`; consent is `/consent`.
- [PASS] Idempotency: migration lock and server duplicate checks are documented as required behavior.
- [PASS] Formal basis: current code is first priority, with external evidence only used for design principles.

### Engineering Quality

- [PASS] Current-code claims include `file_path:Lstart-Lend` evidence.
- [PASS] External claims include source URLs and retrieval trace references.
- [PASS] Test strategy is risk-scaled: local Supabase migration tests are required for database-backed acceptance.

### Technical Stack

- [PASS] Uses existing Next.js Pages Router, NextAuth session checks, Supabase admin API routes, and existing migrations.
- [PASS] No new dependency or service is introduced. Completion state is added through a forward-only Supabase migration.

### Reverse Check

- [PASS] MVP fit: one child, short registered fallback, and no complex profile tree.
- [PASS] MVD: new spec is justified because onboarding crosses chat, guest storage, migration, Family Profile, and Compliance; no existing single spec owns the whole boundary.
- [PASS] No migration or irreversible data operation is introduced by this documentation task.

### Self-Detection

1. Pre-flight evidence was performed in the planning pass: external sources were searched/opened and internal code was read with line numbers.
2. External evidence is recorded as source URLs plus claim summaries, not as non-reproducible chat-session line references.
3. Existing-code assertions above use current line references, not memory.
