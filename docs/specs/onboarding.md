# Module Spec: Onboarding

> Status: DOCUMENTED — 2026-05-19
> Module: onboarding
> Routes: `/chat`, `/consent`, `/family`
> Primary component: `components/Chat/GuestOnboarding.tsx`
> Storage: guest browser `localStorage` key `qimi_guest_data`, then Supabase `child_profiles`
> Scope: current guest onboarding, guest/registered consistency, guest data migration, consent gate relationship, Family Profile read path, MVP boundaries.

---

## 0. Planning Baseline

This is a documentation closure for functionality that is already substantially implemented. It freezes the current Qimi Web onboarding behavior and its boundaries so later modules do not reinterpret guest profile data, consent, or Family Profile ownership.

Canonical inputs:

- `docs/project-control.md`
- `docs/local-test-environment.md`
- `docs/system-architecture.md`
- `docs/specs/family-profile.md`
- `docs/specs/compliance.md`
- Mini-program blueprint section "首次用户引导流程": `/Users/jamesguu/WeChatProjects/adhdhelper-cursor/docs/项目技术蓝图.md`

Local testing rule: database-backed acceptance must use local Supabase first, not production Supabase.

---

## 1. Search Evidence And Source Links

| Decision | Source | Evidence Use |
|---|---|---|
| Child data minimization | FTC COPPA FAQ: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions | When child data is involved, collect only what is reasonably necessary and retain only as long as needed. Qimi applies this as product hygiene even while MVP remains adult-directed. |
| Health-adjacent data minimization | FTC Mobile Health App Developers: https://www.ftc.gov/business-guidance/resources/mobile-health-app-developers-ftc-best-practices | Health apps should minimize data, avoid unnecessary access, protect retained data, and use clear affirmative consent for sensitive data. |
| Progressive question flow | GOV.UK Question Pages: https://design-system.service.gov.uk/patterns/question-pages/ | Ask only questions you need, avoid asking twice, pre-populate where possible, and provide clear progress/back/continue controls. |
| Sensitive-form trust | USWDS Establish Trust: https://designsystem.digital.gov/patterns/complete-a-complex-form/establish-trust/ | Sensitive flows should provide context, use progressive disclosure, and avoid overwhelming users. |
| Children's privacy defaults | ICO Age Appropriate Design Code: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/ | Partial support: Qimi MVP is adult-directed, but high-privacy defaults and minimum data are relevant because the service stores child-related data. |

Conclusion: Qimi onboarding should remain short, contextual, and profile-light. It should collect only the fields needed to personalize the first AI exchange and seed Family Profile, then let richer context emerge progressively through chat and explicit profile edits.

---

## 2. Current Code Facts

- The implemented onboarding component is a 3-step guest flow: child info, challenge selection, recommended question (`components/Chat/GuestOnboarding.tsx:L1-L8`).
- The onboarding completion payload includes `childName`, `childBirthday`, `gender`, `challenges`, and `firstQuestion` (`components/Chat/GuestOnboarding.tsx:L227-L234`).
- Step 1 requires child name, gender, year, and month before continuing (`components/Chat/GuestOnboarding.tsx:L241-L245`, `components/Chat/GuestOnboarding.tsx:L281-L283`).
- Step 2 requires at least one selected challenge (`components/Chat/GuestOnboarding.tsx:L249-L251`, `components/Chat/GuestOnboarding.tsx:L284-L285`).
- Step 3 requires one selected question (`components/Chat/GuestOnboarding.tsx:L253-L256`, `components/Chat/GuestOnboarding.tsx:L287-L288`).
- Recommended questions are generated from selected challenge templates, deduped, shuffled, and limited to 3 (`components/Chat/GuestOnboarding.tsx:L324-L347`).
- `/chat` shows onboarding only for unauthenticated users who have not completed guest onboarding (`pages/chat.tsx:L154-L187`).
- Completing onboarding initializes guest storage and auto-sends the selected first question (`pages/chat.tsx:L257-L270`).
- Guest chat passes local onboarding profile context into chat send (`pages/chat.tsx:L239-L254`).
- Guest data is stored under `qimi_guest_data`; its shape includes child fields, challenges, first question, chat history, message count, and timestamps (`utils/guest-storage.ts:L22-L39`).
- Guest session initialization stores child name, birthday, gender, computed age, challenges, first question, empty chat history, message count, and created time (`utils/guest-storage.ts:L182-L210`).
- Current guest completion marker is `childAge` (`utils/guest-storage.ts:L212-L218`).
- On login, `/chat` detects guest data and calls `guestStorage.migrateToUser(session.user.email)` (`pages/chat.tsx:L158-L180`).
- Guest migration posts to `/api/user/migrate-guest-data`, clears local data only after success, and uses a short migration lock (`utils/guest-storage.ts:L247-L278`).
- The migration API maps guest child fields into `childProfile` (`pages/api/user/migrate-guest-data.ts:L61-L86`).
- The migration API upserts `child_profiles` by `user_id` and writes `name`, `birth_year`, `birth_month`, `gender`, and JSONB `challenges` (`pages/api/user/migrate-guest-data.ts:L124-L150`).
- The migration API creates a conversation and inserts migrated messages when guest history contains a user message (`pages/api/user/migrate-guest-data.ts:L152-L277`).
- `child_profiles` is one row per user (`supabase/migrations/20260506000200_family_tables.sql:L3-L14`).
- Family Profile requires login, fetches `/api/family`, and renders child info plus onboarding challenge tags (`pages/family.tsx:L39-L68`, `pages/family.tsx:L140-L160`).
- `ChildInfoCard` edits only name, birthday, and gender; it does not submit challenges (`components/Family/ChildInfoCard.tsx:L1-L4`, `components/Family/ChildInfoCard.tsx:L97-L107`).
- `/api/family` GET returns `challenges`; POST does not accept challenge updates and upserts only basic child fields (`pages/api/family/index.ts:L84-L115`, `pages/api/family/index.ts:L135-L169`).
- `ChallengeTags` displays onboarding challenges as read-only grouped pills (`components/Family/ChallengeTags.tsx:L1-L4`, `components/Family/ChallengeTags.tsx:L32-L100`).
- `AppLayout` checks consent status for logged-in app pages and redirects missing-consent users to `/consent` (`components/Layout/AppLayout.tsx:L31-L55`).
- Email signup requires the adult/authorized-share checkbox and records consent after successful signup/login (`components/Auth/LoginModal.tsx:L79-L118`, `components/Auth/LoginModal.tsx:L257-L301`).
- OAuth users rely on the app-level consent gate after callback to `/chat` (`components/Auth/LoginModal.tsx:L128-L130`, `components/Layout/AppLayout.tsx:L31-L55`).
- `/consent` requires login, records consent, and returns to `returnTo` (`pages/consent.tsx:L16-L24`, `pages/consent.tsx:L51-L79`).
- Consent writes are stored in `parental_consents` with method, version, IP, user agent, and timestamp (`pages/api/compliance/consent.ts:L66-L85`, `lib/compliance/consent.ts:L1-L5`).

---

## 3. Onboarding UX Flow

```text
Unauthenticated user opens /chat
  -> if qimi_guest_data has no completed onboarding marker, show GuestOnboarding
  -> Step 1: child name/nickname, gender, birth year, birth month
  -> Step 2: choose one or more challenge subitems
  -> Step 3: choose one recommended question derived from selected challenges
  -> complete onboarding
  -> store guest profile in localStorage
  -> send selected question as the first chat message
```

Guest-first users use this flow on `/chat`. Registered-first users do not currently see a separate onboarding wizard; they populate the same durable child profile through `/family`.

MVP decision: guest and registered users share the same final data contract and durable storage, not necessarily the same first-run screen. If a registered onboarding wizard is added later, it must write the same `child_profiles` fields and reuse the same `SelectedChallenge` structure.

---

## 4. Data Fields And Storage Location

### MVP Required In Current Guest Onboarding

| Field | Guest storage | Durable storage after migration | Rule |
|---|---|---|---|
| `childName` | `qimi_guest_data.childName` | `child_profiles.name` | Required; nickname is acceptable. |
| `childBirthday.year` | `qimi_guest_data.childBirthday.year` | `child_profiles.birth_year` | Required; year/month only, no day. |
| `childBirthday.month` | `qimi_guest_data.childBirthday.month` | `child_profiles.birth_month` | Required; year/month only, no day. |
| `gender` | `qimi_guest_data.gender` | `child_profiles.gender` | Required by current UI. |
| `challenges[]` | `qimi_guest_data.challenges` | `child_profiles.challenges` JSONB | Required; at least one selected concern. |
| `firstQuestion` | `qimi_guest_data.firstQuestion` | conversation title / first message context | Required to start first chat; not a child profile field. |

### Optional Or Derived

| Field | Storage | Rule |
|---|---|---|
| `childAge` | guest storage only | Derived from birthday; do not treat as durable source of truth. |
| `chatHistory[]` | guest storage, then `conversations` / `messages` | Migrated only if at least one user message exists. |
| `messageCount` | guest storage | Guest quota/counting only. |
| `createdAt`, `lastVisit` | guest storage | Guest lifecycle metadata. |
| `parental_consents.*` | Supabase `parental_consents` | Consent audit, not onboarding profile data. |

Data minimization rules:

- Do not ask for full legal name; continue allowing nickname.
- Do not ask for exact day of birth.
- Do not ask for school name, address, phone, medication dose, diagnostic reports, images, or provider data in onboarding.
- Challenge tags are broad initial concerns, not a diagnosis or medical intake.

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
  -> server migrates chatHistory into conversations/messages when present
  -> browser clears qimi_guest_data on success
```

Idempotency:

- Browser computes a migration id from user, guest `createdAt`, message count, and last guest message id.
- Browser uses `qimi_guest_migration` as a short local lock.
- Server checks `guest_migration_id` when available and checks duplicate conversation/message signatures.

Failure:

- If migration fails, local guest data must not be cleared.
- If child profile upsert fails, return error before local data is cleared.
- If chat history has no user message, conversation migration may skip while profile migration succeeds.

---

## 6. Consent / Adult Confirmation Relationship

Guest onboarding can happen before account creation and remains local until login. Logged-in app usage and durable account data require adult/authorized-share confirmation.

Rules:

- Email signup requires the adult confirmation checkbox before account creation.
- OAuth users may bypass the signup checkbox, so `AppLayout` enforces `/consent` for logged-in users without consent.
- Consent writes to `parental_consents`; it is not part of `child_profiles` or `qimi_guest_data`.
- Consent does not replace minimization. Onboarding must still avoid unnecessary child/health data.
- Acceptance should verify guest migration and missing-consent redirect do not conflict on the same post-login `/chat` lifecycle.

---

## 7. MVP Boundary

In scope:

- 3-step guest onboarding on `/chat`.
- One child profile per account.
- Read-only onboarding challenge tags in Family Profile.
- Guest profile context for first chat personalization.
- Guest child data and chat migration into registered account.
- Adult/authorized-share confirmation for logged-in app use.

Out of scope:

- Complex multi-child profiles.
- Child selector, per-child conversations, or per-child memory partition.
- Registered-only onboarding wizard.
- Editable onboarding challenge selector in `/family`.
- Diagnostic intake, symptom scoring, medication dosage intake, school data, exact date of birth, report upload, or provider integrations in onboarding.
- Child accounts or child-directed independent onboarding.

One-child constraint: `child_profiles.user_id` is unique. Future multi-child support requires a dedicated schema and UX redesign.

---

## 8. Family Profile Read Model

Family Profile reads onboarding data from durable storage, not from guest localStorage:

```text
GET /api/family
  -> session email
  -> users.id
  -> child_profiles where user_id = users.id
  -> ChildInfoCard + ChallengeTags
```

Behavior:

- Name, birth year/month, and gender are editable in `ChildInfoCard`.
- Onboarding challenges display as read-only "Initial Concerns".
- `/api/family` POST must not accept challenge updates.
- If no challenges exist, Family Profile shows its empty onboarding challenge state.
- Memory items and family summary remain separate from onboarding.

---

## 9. Acceptance Criteria

Technical acceptance:

- Use local Supabase for any database-backed migration test.
- `child_profiles` remains one row per user and stores JSONB `SelectedChallenge[]`.
- Consent table and ownership-scoped RLS remain active after local reset.
- Build/typecheck only required if implementation code changes.

Functional acceptance:

- New guest opening `/chat` sees 3-step onboarding before chat input.
- Required gates block Step 1, Step 2, and Step 3 until required data exists.
- Completing onboarding stores `qimi_guest_data` and auto-sends the selected first question.
- Guest chat uses local profile context.
- Signup/login migrates child profile fields and guest chat history.
- Migrated child info and challenges appear in `/family`.
- Re-login/refresh does not duplicate migrated conversations.
- `/family` edits child basic info without changing challenge tags.
- Missing consent redirects logged-in users to `/consent`; consent returns to the intended page.

Human acceptance:

- Verify guest-first path: onboarding -> first answer -> signup/login -> consent if needed -> Family Profile data -> migrated conversation.
- Verify registered-first path: login -> consent if needed -> `/family` profile entry -> no forced duplicate onboarding wizard.
- Confirm onboarding copy permits nickname/approximate age and avoids unnecessary sensitive data.

---

## 10. Task Split

Documentation:

1. Keep this spec as the onboarding source of truth.
2. Later cross-link Family Profile and Compliance specs to this file.

Implementation follow-ups:

1. Decide whether `hasCompletedOnboarding()` should require all MVP fields instead of only `childAge`.
2. Decide whether Web should add the mini-program `family` challenge category or formally keep the current 9-category subset.
3. Add focused regression coverage only when code changes touch onboarding, guest storage, migration, consent, or Family Profile read path.

---

## 11. AQS Self Review

- [PASS] Security: durable profile and consent APIs require session; guest data stays local until login.
- [PASS] Authorization: profile writes are session-derived and RLS cleanup scopes user-owned tables.
- [PASS] Data minimization: onboarding avoids exact DOB, diagnostic intake, school/address/phone, and report upload.
- [PASS] Architecture: onboarding, guest storage, migration, consent, and Family Profile have separate responsibilities.
- [PASS] Engineering quality: current-code facts include `file_path:Lstart-Lend` citations.
- [PASS] Technical stack: no new dependency, service, schema, or feature flag is introduced.
- [PASS] MVP fit: one child, short onboarding, no complex profile tree.
- [PASS] MVD: a standalone spec is justified because onboarding crosses chat, guest storage, migration, Family Profile, and Compliance boundaries.

