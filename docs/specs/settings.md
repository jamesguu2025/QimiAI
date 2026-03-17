# Module Spec: Settings

> Status: APPROVED — 2026-03-17 | Self-reviewed: 2026-03-17 | Second-pass reviewed: 2026-03-17
> Module: settings
> Route: `/settings`
> API routes: `pages/api/settings/index.ts`, `pages/api/user/delete-account.ts`
> Components: `components/Settings/*`
> Branch: `codex/settings-module` or current working branch
> Scope: Complete the account-settings MVP on top of the compliance-created minimal settings page. Keep the scope to parent account identity management plus the existing delete-account flow.

---

## 0. Planning Baseline

This spec was written against:

- The current repo state in `/Users/jamesguu/qimi-ai-website/qimi-ai-website`
- `docs/project-control.md` for execution order and module status
- `docs/system-architecture.md` for route ownership and shared layout rules
- `docs/specs/compliance.md` for the already-implemented delete-account baseline
- The superseded `docs/specs/user-profile.md`, but only to extract the parent-account parts that now belong to `/settings`

### Current Implementation Reality

- `pages/settings.tsx` already exists, but it is only a minimal compliance page with read-only account info plus `DeleteAccountSection`
- `pages/api/user/delete-account.ts` already exists and is the current delete-account implementation
- There is no canonical `settings` spec yet
- There is no dedicated `GET /api/settings` or `PUT /api/settings` route yet
- The real `users` schema currently contains only: `email`, `name`, `avatar_url`, `provider`, `created_at`, `updated_at`
- The real schema does **not** currently contain notification-preference columns or a working billing/subscription implementation

### MVP Boundary

- This module owns **parent account settings only**
- This module owns display and edit of parent identity fields from `users`
- This module keeps and reuses the existing delete-account flow created by the compliance module
- This module may show a **read-only placeholder** for membership/billing, because the actual billing module is explicitly post-MVP
- This module does **not** own child data, challenge tags, or family summary data; those stay in `/family`
- This module does **not** implement notification preferences, theme, language, quota logic, or Stripe actions

### Evidence Layering

| Decision | Basis |
|---------|-------|
| Parent account info belongs on `/settings`, child info belongs on `/family` | Internal design choice already frozen by `system-architecture.md` and `project-control.md` |
| Billing controls remain out of scope for this module | Internal design choice aligned with `membership-billing` being explicitly post-MVP |
| Settings should update `users.name` through authenticated API routes rather than client-side Supabase writes | Mature project pattern already used throughout this repo |

### Task Metadata

- implementation mode: `linear`
- acceptance mode: `single-item gate`
- machine gate:
  - `npx tsc --noEmit`
  - `npm run build`
  - API contract check for `GET /api/settings` and `PUT /api/settings`
- human gate allowed after:
  - page auth behavior verified
  - account info load/save verified
  - delete-account regression check verified

---

## 1. Feature Requirements

### 1.1 Account Overview (`/settings`)

The settings page must show the signed-in parent's account information in a stable, editable account section.

Required fields:

- avatar
  - if `avatar_url` exists, show it
  - otherwise show an initials fallback
- name
  - editable
  - sourced from `users.name`
- email
  - read-only
  - sourced from `users.email`
- sign-in method
  - read-only text derived from `users.provider`

The account section must not expose password editing in this MVP pass.

### 1.2 Name Editing

Users can update their display name from `/settings`.

- Provide a clear edit interaction, either inline edit or a small dedicated form
- Validate:
  - required
  - trimmed non-empty string
  - max 100 characters
- Save through authenticated `PUT /api/settings`
- On success:
  - update the local page state
  - reflect the new name immediately in the settings UI
- On failure:
  - show a visible inline error state

### 1.3 Membership Placeholder

The settings page may include a read-only membership section, but it must not pretend billing is implemented.

Allowed MVP copy pattern:

- current state text such as `Free plan`
- supporting note such as `Billing tools will be added after MVP`

Rules:

- no upgrade button
- no checkout action
- no billing portal link
- no quota editing
- no fake dynamic data if the real source does not exist yet

### 1.4 Danger Zone

Retain the delete-account section from the compliance module.

- Keep the typed `DELETE` confirmation flow
- Keep the redirect to `/` after successful deletion
- Keep the explanatory copy about deleting family profile, conversations, and learned insights

### 1.5 Auth And Access

- `/settings` requires login
- unauthenticated users redirect to `/login`
- guest users cannot access the page

### 1.6 Layout And Navigation

- Follow the logged-in page pattern defined in `system-architecture.md`
- Use `AppLayout`
- Set browser tab title to `Settings - Qimi AI`
- The page remains reachable from the existing top-right `UserMenu`

### 1.7 Explicitly Out Of Scope

- No child profile editing here
- No challenge tag editing here
- No notifications backend or preference persistence
- No theme or language settings
- No password reset or credential management UI
- No Stripe checkout, portal, invoices, or subscription mutation

---

## 2. Database Boundary

This module uses the existing `users` table only.

No new table is required for the MVP settings pass.

Fields used:

- `users.id`
- `users.email`
- `users.name`
- `users.avatar_url`
- `users.provider`
- `users.created_at`
- `users.updated_at`

Rules:

- `email` stays read-only
- `provider` stays read-only
- only `name` is updated in this MVP pass
- do not introduce notification or billing columns in this module

---

## 3. API Routes

All settings data mutations happen through API routes after `getServerSession()` validation.

### API Boundary Rule

- Browser must not write account data directly to Supabase
- Settings write path remains server-owned
- Keep using `getSupabaseAdmin()` plus user lookup by session email, matching existing repo patterns

### 3.1 `GET /api/settings`

Response:

```json
{
  "profile": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jane Smith",
    "avatar": "https://...",
    "provider": "google",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-03-17T00:00:00Z"
  }
}
```

Logic:

1. Auth check via `getServerSession`
2. Get-or-create user from `users` by session email using the existing `PGRST116` pattern
3. Return the user row in camelCase

### 3.2 `PUT /api/settings`

Request body:

```json
{
  "name": "Jane Smith"
}
```

Response:

```json
{
  "profile": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jane Smith",
    "avatar": "https://...",
    "provider": "google",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-03-17T00:00:00Z"
  }
}
```

Validation:

- `name` is required
- `name.trim()` must not be empty
- max length 100

Logic:

1. Auth check
2. Validate request body
3. Get-or-create user from `users`
4. Update `users.name`
5. Return the updated user row in camelCase

### 3.3 `POST /api/user/delete-account`

This route is already owned by the compliance module and is reused here unchanged.

Contract:

- Input: `{ confirmation: "DELETE" }`
- Output: `{ message: "Account deleted successfully" }`

This spec does not redefine that API; it only requires the existing route to remain wired correctly from `/settings`.

---

## 4. Frontend Components

All under `components/Settings/`.

### 4.1 `AccountProfileCard.tsx`

Props: `profile`, `onProfileSaved`

Responsibilities:

- render avatar
- render read-only email
- render read-only sign-in method
- render editable name control
- call `PUT /api/settings` on save
- show loading, success, and error states

### 4.2 `MembershipPlaceholderCard.tsx`

Responsibilities:

- show read-only plan placeholder copy
- make clear that billing arrives later
- avoid interactive billing actions

This component may be omitted if the page instead renders equivalent static markup inline. If implemented, keep it small and obviously non-final.

### 4.3 `DeleteAccountSection.tsx`

Reused from the compliance module.

Required behavior:

- typed confirmation
- destructive styling
- API call to `POST /api/user/delete-account`
- redirect via `signOut({ callbackUrl: '/' })` after success

---

## 5. Page Contract

### 5.1 `pages/settings.tsx`

The page must:

1. Require a valid session
2. Fetch `GET /api/settings` on mount
3. Render:
   - page heading
   - account profile card
   - optional membership placeholder card
   - danger zone with delete-account section
4. Handle loading state
5. Handle load error state
6. Use `AppLayout`

Recommended visual grouping:

```text
Settings
├── Account
│   ├── Avatar
│   ├── Name (editable)
│   ├── Email (read-only)
│   └── Sign-in method (read-only)
├── Membership (placeholder, optional)
└── Danger Zone
    └── Delete Account
```

---

## 6. Acceptance Criteria

- [ ] `/settings` redirects unauthenticated users to `/login`
- [ ] signed-in user sees current name, email, avatar fallback/image, and provider
- [ ] user can update name successfully from `/settings`
- [ ] invalid name input shows a clear error and does not save
- [ ] name change persists after refresh
- [ ] delete-account flow still works from `/settings`
- [ ] settings page does not expose child-profile editing
- [ ] settings page does not expose fake or interactive billing controls

---

## 7. Task List

### T001: Create canonical settings API

- **Files**:
  - `pages/api/settings/index.ts`
- **Do**:
  - implement `GET` and `PUT`
  - follow auth + get-or-create user pattern already used in `pages/api/family/index.ts`
  - return camelCase profile payload
  - validate `name` strictly
- **Verify**:
  - `npx tsc --noEmit`
  - route contract manually inspected against this spec
- **Commit**:
  - `[T001] feat: add settings profile API`

### T002: Build account settings UI

- **Files**:
  - `components/Settings/AccountProfileCard.tsx`
  - optional `components/Settings/MembershipPlaceholderCard.tsx`
  - `pages/settings.tsx`
- **Do**:
  - replace the read-only account block with a real account settings UI
  - keep `DeleteAccountSection`
  - add loading and error states
  - keep copy honest about billing not being implemented yet
- **Verify**:
  - `npx tsc --noEmit`
  - `npm run build`
- **Commit**:
  - `[T002] feat: complete settings page MVP`

### T003: Technical acceptance pass

- **Files**:
  - implementation files above
  - acceptance notes if needed
- **Do**:
  - verify page auth
  - verify GET/PUT settings API
  - verify delete-account regression
  - verify no child-profile or billing overreach was introduced
- **Verify**:
  - `npx tsc --noEmit`
  - `npm run build`
- **Commit**:
  - no code commit required if this is only an acceptance pass
