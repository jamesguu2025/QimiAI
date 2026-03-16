# Module Spec: User Profile

> Status: **SUPERSEDED** — replaced by `docs/specs/family-profile.md` (2026-03-16)
> Original: APPROVED — 2026-02-22 | Self-reviewed: 2026-03-14 | Second-pass reviewed: 2026-03-14
> Module: user-profile → split into family-profile (`/family`) + settings (`/settings`)
> Reason: Navigation unified to SmartDrawer. Profile split into child data (family-profile) and account settings (settings). See system-architecture.md amendment 2026-03-16.
>
> **Do not implement from this spec. Use `docs/specs/family-profile.md` instead.**

---

## 0. Planning Baseline

This spec was re-checked against:

- The current repo structure and scripts in `/Users/jamesguu/qimi-ai-website/qimi-ai-website`
- The canonical Layer 1 architecture in `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/system-architecture.md`
- The cross-platform blueprint in `/Users/jamesguu/WeChatProjects/adhdhelper-cursor/docs/项目技术蓝图.md`
- Official guidance for Auth.js / NextAuth protected routes and Supabase RLS

### MVP Boundary

- This module owns parent identity display plus child profile CRUD
- This module does **not** introduce `extracted_facts`, `memory_items`, or AI-generated memory summaries
- Memory remains a separate planning pass so the profile module stays simple, editable, and low-risk
- Parent identity should continue to live in the existing `users` table; do not add a second parent-profile table

### Execution Baseline

- This repo currently has `build`, but does not define `lint` or `test` npm scripts
- Validation commands in the task list therefore use `npx eslint`, `npx tsc --noEmit`, and `npm run build`

## 1. Feature Requirements

### 1.1 Parent Profile View/Edit (`/profile`)

Users can view and edit their parent-facing profile information.

- Display avatar (from OAuth provider if available, else initials fallback)
- Display name with inline edit (click pencil icon → text input → save)
- Display email as read-only (sourced from OAuth/session, cannot be changed)
- Save name via PUT `/api/profile`; show success toast on save
- Profile completion indicator at the top showing percentage complete

### 1.2 Child Profile Management

One child profile per user account (MVP constraint).

- Form fields: child name, birth year (dropdown), birth month (dropdown), gender (3 options: Boy / Girl / Other)
- Challenge selector: multi-select grid from predefined ADHD challenge categories (see section 4.3)
- Submit saves via POST `/api/profile/child` (upsert — create on first save, update on subsequent saves)
- Display child's computed age in years and months next to birth date fields (read-only, derived from birth_year + birth_month + today's date)

### 1.3 Profile Completion Indicator

Progress bar + percentage shown at the top of the profile page.

Completion scoring (each worth 25%):
- Parent name is set (not empty)
- Child name is set
- Child birth year + month are set
- At least one challenge is selected

### 1.4 Auth & Access

- Page requires login (per architecture doc permission matrix)
- Redirect to `/login` if no session
- Guest users cannot access the profile page

### 1.5 Medical Disclaimer

- A dismissible banner at the bottom of the page: "Qimi AI is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider."
- Styled with a light gray background and small text

### 1.6 Explicitly Out Of Scope

- No `familyNotes` editor in this module
- No conversation-derived memory display
- No recommendation engine or follow-up logic on the profile page
- No duplicate `user_profiles` table for parent metadata

---

## 2. Database Schema

File: `supabase/user-profile_tables.sql`

```sql
-- ===========================================
-- Child Profiles Table
-- ===========================================
CREATE TABLE IF NOT EXISTS child_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  birth_year INTEGER CHECK (birth_year >= 2000 AND birth_year <= 2030),
  birth_month INTEGER CHECK (birth_month >= 1 AND birth_month <= 12),
  gender TEXT CHECK (gender IN ('boy', 'girl', 'other')),
  challenges TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT child_profiles_user_id_unique UNIQUE (user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_child_profiles_user_id ON child_profiles(user_id);

-- Enable RLS
ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies (auth enforced server-side via service_role key)
CREATE POLICY "child_profiles_select" ON child_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "child_profiles_insert" ON child_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "child_profiles_update" ON child_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "child_profiles_delete" ON child_profiles FOR DELETE USING (auth.uid() = user_id);

-- Auto-update trigger (requires update_updated_at() function to already exist)
DROP TRIGGER IF EXISTS child_profiles_updated_at ON child_profiles;
CREATE TRIGGER child_profiles_updated_at
  BEFORE UPDATE ON child_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

---

## 3. API Routes

All routes under `pages/api/profile/`.

### API Boundary Rule

- Browser does not write profile data directly to Supabase
- All mutations happen through API routes after session validation
- `child_profiles` still gets RLS policies even though the first implementation writes through `getSupabaseAdmin()`

### 3.1 `GET /api/profile` — Get user profile and child profile

**Response (200):**
```json
{
  "profile": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jane Smith",
    "avatar": "https://...",
    "provider": "google",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-02-01T00:00:00Z"
  },
  "childProfile": {
    "id": "uuid",
    "userId": "uuid",
    "name": "Alex",
    "birthYear": 2018,
    "birthMonth": 4,
    "gender": "boy",
    "challenges": ["Short attention span", "Fidgeting"],
    "createdAt": "2026-01-15T00:00:00Z",
    "updatedAt": "2026-02-20T00:00:00Z"
  }
}
```

Note: `childProfile` is `null` if the user has not created one yet.

**Logic:**
1. Auth check (getServerSession → 401 if no email)
2. Get-or-create user by email (follow conversations/index.ts PGRST116 pattern)
3. Query `child_profiles` where `user_id = userId` (single row, limit 1)
4. Return user row and child profile row (or null) in camelCase format

### 3.2 `PUT /api/profile` — Update user name

**Request body:**
```json
{
  "name": "Jane Smith"
}
```

**Response (200):**
```json
{
  "profile": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jane Smith",
    "avatar": "https://...",
    "provider": "google",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-02-22T00:00:00Z"
  }
}
```

**Logic:**
1. Auth check → 401 if no session
2. Validate `name`: required, non-empty string, max 100 characters → 400 if invalid
3. Get-or-create user (PGRST116 pattern)
4. Update `users` table: `SET name = $name, updated_at = NOW() WHERE id = $userId`
5. Return updated user row in camelCase format

### 3.3 `POST /api/profile/child` — Create or update child profile (upsert)

**Request body:**
```json
{
  "name": "Alex",
  "birthYear": 2018,
  "birthMonth": 4,
  "gender": "boy",
  "challenges": ["Short attention span", "Fidgeting"]
}
```

**Response (200):**
```json
{
  "childProfile": {
    "id": "uuid",
    "userId": "uuid",
    "name": "Alex",
    "birthYear": 2018,
    "birthMonth": 4,
    "gender": "boy",
    "challenges": ["Short attention span", "Fidgeting"],
    "createdAt": "2026-01-15T00:00:00Z",
    "updatedAt": "2026-02-22T00:00:00Z"
  }
}
```

**Logic:**
1. Auth check → 401 if no session
2. Validate fields:
   - `birthYear`: integer 2000–2030 (if provided)
   - `birthMonth`: integer 1–12 (if provided)
   - `gender`: one of `'boy' | 'girl' | 'other'` (if provided)
   - `challenges`: array of strings (if provided)
   - At least one field must be present in the body → 400 if body is empty
3. Get-or-create user (PGRST116 pattern)
4. Upsert into `child_profiles` using `ON CONFLICT (user_id) DO UPDATE SET ...`
5. Return upserted row in camelCase format

---

## 4. Frontend Components

All under `components/Profile/`.

### 4.1 `ProfileHeader.tsx`

Displays and allows editing of the parent's name. Props: `profile: User`, `onNameSaved(name: string): void`.

- Avatar: circular image if `profile.avatar` exists; else gray circle with first initial of name or email
- Name: displayed as text with a pencil icon button alongside it
- Clicking pencil → replaces text with an input field pre-filled with current name, and a save button
- Save button calls PUT `/api/profile` with new name, then calls `onNameSaved` callback
- Email displayed below name as gray read-only text with a lock icon
- Teal border/ring on the edit input when focused

### 4.2 `ProfileCompletionBar.tsx`

Progress bar showing how complete the profile is. Props: `profile: User`, `childProfile: ChildProfile | null`.

- Compute percentage from 4 criteria (each 25%):
  1. `profile.name` is non-empty
  2. `childProfile?.name` is non-empty
  3. `childProfile?.birthYear` and `childProfile?.birthMonth` are set
  4. `childProfile?.challenges.length > 0`
- Render a labeled bar: "Profile X% complete"
- Bar fill color: teal (#00D4AA) for 75–100%, amber for 25–50%, gray for 0%
- Below bar: list of incomplete items as small gray hint text (e.g., "Add your child's name")

### 4.3 `ChallengeSelector.tsx`

Multi-select grid of predefined ADHD challenge items, grouped by category.

Props: `selectedChallenges: string[]`, `onChange(challenges: string[]): void`.

Hardcoded challenge categories (do NOT import from types — hardcode directly in this component):

```ts
const CHALLENGE_CATEGORIES = [
  {
    name: 'Attention & Focus',
    challenges: [
      'Short attention span',
      'Easily distracted',
      'Difficulty following instructions',
      'Forgetful in daily activities',
    ],
  },
  {
    name: 'Hyperactivity',
    challenges: [
      'Fidgeting',
      'Difficulty staying seated',
      'Excessive talking',
      'Always on the go',
    ],
  },
  {
    name: 'Impulsivity',
    challenges: [
      'Interrupting others',
      'Difficulty waiting turn',
      'Acting without thinking',
      'Emotional outbursts',
    ],
  },
  {
    name: 'Executive Function',
    challenges: [
      'Poor time management',
      'Difficulty organizing',
      'Trouble starting tasks',
      'Losing things frequently',
    ],
  },
  {
    name: 'Social',
    challenges: [
      'Difficulty making friends',
      'Missing social cues',
      'Conflict with peers',
      'Low self-esteem',
    ],
  },
  {
    name: 'Academic',
    challenges: [
      'Reading difficulties',
      'Math challenges',
      'Homework resistance',
      'Test anxiety',
    ],
  },
];
```

- Each category renders its name as a section heading
- Each challenge renders as a pill/chip button
- Selected chips: teal background, white text
- Unselected chips: white background, gray border, gray text
- Clicking a chip toggles it on/off in `selectedChallenges`
- Mobile-first: chips wrap naturally in a flex-wrap row

### 4.4 `ChildProfileForm.tsx`

Form for entering or editing child profile data. Props: `childProfile: ChildProfile | null`, `onSaved(childProfile: ChildProfile): void`.

- Fields:
  - Child name: text input, max 50 characters
  - Birth year: `<select>` dropdown, options range from current year down to 2000 (generated at render time)
  - Birth month: `<select>` dropdown, options January–December (value 1–12)
  - Gender: three radio buttons or toggle pills — Boy / Girl / Other
  - Challenges: renders `<ChallengeSelector>` below the above fields
- Computed display (read-only text below birth year/month): "Age: X years Y months" derived from `birthYear`, `birthMonth`, and today's date (`new Date()`)
- If `birthYear` or `birthMonth` is not yet set, do not render the age display
- Submit button: "Save Child Profile" — calls POST `/api/profile/child`, then calls `onSaved`
- Loading state: disable submit button and show spinner while saving
- Show inline success message "Saved!" for 2 seconds after successful save

---

## 5. Pages

### 5.1 `pages/profile/index.tsx` — Main profile page

```
AppLayout
├── Head: "My Profile - Qimi AI"
├── Page header: "My Profile"
├── ProfileCompletionBar (profile + childProfile)
├── ProfileHeader (profile, onNameSaved)
├── Section heading: "Child Profile"
├── ChildProfileForm (childProfile, onSaved)
└── Medical disclaimer banner (bottom)
```

Auth pattern: `useSession()` → loading skeleton → redirect if no session → fetch `/api/profile` → render content.

Data flow:
- On mount: fetch `GET /api/profile` → store `profile` and `childProfile` in local component state
- `ProfileHeader.onNameSaved` → update local `profile.name` state (optimistic, no re-fetch needed)
- `ChildProfileForm.onSaved` → update local `childProfile` state (optimistic, no re-fetch needed)
- Pass updated state to `ProfileCompletionBar` so percentage recalculates live after saves

Loading state: show a simple skeleton (gray rounded rectangles) while the initial fetch is in progress.

Error state: if fetch fails, show "Unable to load profile. Please refresh." in red text.

---

## 5.2 Error Boundary & Accessibility

- **Error Boundary**: Use AppLayout's built-in error handling. If JS crashes, AppLayout should show a fallback.
- **Accessibility**: All form inputs must have associated `<label>` elements or `aria-label`. Gender selector pills should use `role="radiogroup"` with `role="radio"` on each option. Challenge chips should use `aria-pressed` to indicate selection state.

---

## 6. Acceptance Criteria

- [ ] Authenticated user can view their name, email, and avatar on the profile page
- [ ] User can edit their name inline and save — change persists on refresh
- [ ] Child profile form allows entering name, birth year, birth month, gender, and challenges
- [ ] Child profile can be created (first save) and updated (subsequent saves) via upsert
- [ ] Challenge multi-select shows all 6 categories with correct items
- [ ] Selected challenges are highlighted in teal; deselected are gray-bordered
- [ ] Profile completion bar shows correct percentage and updates live after saves
- [ ] Unauthenticated users are redirected to `/login`
- [ ] Medical disclaimer is visible at the bottom of the page
- [ ] Page is mobile responsive (tested at 375px width)
- [ ] `npx eslint` passes for touched files
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes

---

## 7. Execution Task List

### Task Execution Metadata

- Implementation mode: `linear`
- Acceptance mode: `single-item gate`
- Machine gate:
  - required checks: `npx eslint`, `npx tsc --noEmit`, `npm run build`
  - smoke test: load the affected route or API path and verify the core happy path manually
  - contract consistency check: route, schema, and response shape must remain aligned with `/docs/system-architecture.md` and this spec
- Human gate: allowed only after machine gate passes and P0/P1 review findings are zero

Each task is one file or one logical unit. Execute in order. Commit after each task passes lint + build.

### T001: Create database migration
- **File**: `supabase/user-profile_tables.sql`
- **Do**: Copy the SQL from section 2 above. Save the file.
- **Verify**: File exists with correct SQL.
- **Commit**: `[T001] feat: add child_profiles table migration`

### T002: Create GET /api/profile route
- **File**: `pages/api/profile/index.ts`
- **Do**: Handle GET — auth check, get-or-create user (PGRST116 pattern from conversations/index.ts), query `child_profiles` by `user_id`, return `{ profile, childProfile }`. Set `childProfile` to `null` if not found (catch empty array, do not error). Only handle GET in this file for now; PUT will also live here (added in T003).
- **Reference**: Follow `pages/api/conversations/index.ts` auth + get-or-create pattern exactly. Import `authOptions` from `../auth/[...nextauth]`.
- **Verify**: `npx eslint pages/api/profile/index.ts` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T002] feat: add GET /api/profile route`

### T003: Add PUT /api/profile (update name)
- **File**: `pages/api/profile/index.ts` (extend the same file)
- **Do**: Add a `PUT` branch to the existing handler. Validate `name` field (required, non-empty, max 100 chars). Update `users` table. Return updated `{ profile }`.
- **Verify**: `npx eslint pages/api/profile/index.ts` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T003] feat: add PUT /api/profile (update name)`

### T004: Create POST /api/profile/child route (upsert)
- **File**: `pages/api/profile/child.ts`
- **Do**: Handle POST only. Auth check, get-or-create user, validate body fields, upsert into `child_profiles` using Supabase `upsert` with `onConflict: 'user_id'`. Return `{ childProfile }` in camelCase.
- **Reference**: Same auth + get-or-create pattern as T002.
- **Verify**: `npx eslint pages/api/profile/child.ts` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T004] feat: add POST /api/profile/child (upsert)`

### T005: Create ProfileHeader and ProfileCompletionBar components
- **File**: `components/Profile/ProfileHeader.tsx` and `components/Profile/ProfileCompletionBar.tsx`
- **Do**:
  - `ProfileHeader`: avatar circle (image or initial fallback), name with pencil-icon edit toggle, read-only email. On save, call PUT `/api/profile`.
  - `ProfileCompletionBar`: compute percentage from 4 criteria, render labeled progress bar with teal fill, show incomplete hints below.
- **Import**: `User` from `@/types/user`. Define a local `ChildProfileRow` interface (extending shared `ChildProfile` with `id`, `userId`, `createdAt`, `updatedAt` fields) since the shared type does not include DB row metadata. [NEEDS_SHARED_TYPE: ChildProfileRow with id/userId/timestamps]
- **Styling**: Tailwind only. Teal (#00D4AA). Mobile-first.
- **Verify**: `npx eslint components/Profile/ProfileHeader.tsx components/Profile/ProfileCompletionBar.tsx` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T005] feat: add ProfileHeader and ProfileCompletionBar components`

### T006: Create ChallengeSelector and ChildProfileForm components
- **File**: `components/Profile/ChallengeSelector.tsx` and `components/Profile/ChildProfileForm.tsx`
- **Do**:
  - `ChallengeSelector`: hardcode the 6 CHALLENGE_CATEGORIES constant inside the file. Render grouped chips. Toggle selection on click. Teal selected, gray-border unselected.
  - `ChildProfileForm`: fields for child name, birth year/month (dropdowns), gender (pills), then `<ChallengeSelector>`. Age display computed from birth year/month. Submit calls POST `/api/profile/child`. Show loading + success states.
- **Import**: Use the local `ChildProfileRow` interface (same as T005). Import `ChildProfile` from `@/types/user` as the base type.
- **Styling**: Tailwind only. Mobile-first.
- **Verify**: `npx eslint components/Profile/ChallengeSelector.tsx components/Profile/ChildProfileForm.tsx` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T006] feat: add ChallengeSelector and ChildProfileForm components`

### T007: Create /profile page
- **File**: `pages/profile/index.tsx`
- **Do**: Auth check with `useSession` (loading skeleton → redirect to `/login` if no session). Fetch `GET /api/profile` on mount. Render `AppLayout` wrapping `ProfileCompletionBar`, `ProfileHeader`, `ChildProfileForm`, and the medical disclaimer banner. Wire up `onNameSaved` and `onSaved` callbacks to update local state. Handle fetch error state.
- **Reference**: Auth pattern from CLAUDE.md. Import `AppLayout` from `components/Layout/AppLayout`.
- **Medical disclaimer**: `<p className="text-xs text-gray-500 ...">Qimi AI is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider.</p>` inside a light gray `<div>` at the bottom.
- **Verify**: `npx eslint pages/profile/index.tsx` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T007] feat: add /profile page`

### T008: Add unit tests
- **File**: `__tests__/user-profile.test.ts`
- **Do**: Test input validation logic: name max 100 chars (reject longer), birthYear range 2000-2030 (reject outside), birthMonth range 1-12, gender enum (reject invalid), challenges must be string array. Test upsert: first POST creates, second POST updates. Test auth: request without session returns 401.
- **Verify**: add the test file together with the chosen test runner setup for this repo, then ensure `npx eslint`, `npx tsc --noEmit`, and `npm run build` still pass.
- **Commit**: `[T008] test: add user profile unit tests`
