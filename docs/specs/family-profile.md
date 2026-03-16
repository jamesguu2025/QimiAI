# Module Spec: Family Profile

> Status: APPROVED — 2026-03-16 | Self-reviewed: 2026-03-16 | Second-pass reviewed: 2026-03-16 (P0: 0, P1: 0 after fixes) | Implementation status: Planned
> Module: family-profile
> Routes: `/family`
> API routes: `pages/api/family/*`
> Components: `components/Family/*`
> Branch: `feature/user-profile` (continues from existing branch)
> Scope: Child profile CRUD + challenge selection. Accessed from Dashboard card. Parent account settings (name, email, avatar) moved to `/settings` module.
> Supersedes: `docs/specs/user-profile.md` (2026-03-16)

---

## 0. Planning Baseline

This spec was written against:

- The canonical Layer 1 architecture in `docs/system-architecture.md` (amended 2026-03-16)
- The current repo structure in `/Users/jamesguu/qimi-ai-website/qimi-ai-website`
- The cross-platform blueprint in `/Users/jamesguu/WeChatProjects/adhdhelper-cursor/docs/项目技术蓝图.md`
- Official guidance for Auth.js / NextAuth protected routes and Supabase RLS

### Why this spec replaces user-profile.md

The original `user-profile` spec combined parent account settings and child profile editing on a single `/profile` page. This was restructured (2026-03-16) for the following reasons (internal design choice):

1. **Navigation unification**: All logged-in pages now use SmartDrawer. Module pages are accessed from Dashboard cards or UserMenu, not from a separate Sidebar.
2. **Separation of concerns**: "My account" (name, email, avatar, subscription) belongs in `/settings` (accessed via UserMenu). "My child's info" (name, birthday, challenges) belongs in `/family` (accessed via Dashboard card).
3. **Onboarding data reuse**: Guest onboarding already collects birthday and challenges. This data must auto-populate the family profile on registration, not force users to re-enter it.

### MVP Boundary

- This module owns child profile CRUD and challenge selection
- Parent name editing moves to the `/settings` module (separate spec)
- This module does **not** introduce `extracted_facts`, `memory_items`, or AI-generated memory summaries
- Memory remains a separate planning pass
- One child profile per user account (MVP constraint)

### Execution Baseline

- This repo currently has `build`, but does not define `lint` or `test` npm scripts
- Validation commands use `npx eslint`, `npx tsc --noEmit`, and `npm run build`

---

## 1. Feature Requirements

### 1.1 Family Profile Page (`/family`)

Users can view and edit their child's profile information.

- Page header: "Family Profile"
- Subheading: "Keep your child's details current so Qimi can stay helpful and personalized."
- Display child's computed age ("X years Y months") prominently if birthday is set
- All form fields editable inline (no separate "edit mode")
- Save button at the bottom
- Profile completion indicator at the top

### 1.2 Child Profile Management

One child profile per user account (MVP constraint).

- Form fields: child name, birth year (dropdown), birth month (dropdown), gender (3 options: Boy / Girl / Other)
- Challenge selector: multi-select grid from predefined ADHD challenge categories (see section 4.2)
- Submit saves via POST `/api/family/child` (upsert — create on first save, update on subsequent saves)
- Display child's computed age in years and months next to birth date fields (read-only, derived from birth_year + birth_month + today's date)

### 1.3 Profile Completion Indicator

Progress bar + percentage shown at the top of the family profile page.

Completion scoring (3 criteria):
- Child name is set
- Child birth year + month are set
- At least one challenge is selected

Display: 0% (0/3), 33% (1/3), 67% (2/3), 100% (3/3). Use integer division rounding. Parent name completion is no longer tracked here (moved to settings).

### 1.4 Pre-population from Guest Onboarding

If the user completed guest onboarding before registering:
- `childBirthday` → pre-populate birth year and month fields
- `challenges` → pre-populate selected challenges

The family page must show this data on first visit, not an empty form. The migration happens at login time (see system-architecture.md Section 7, Guest Data Migration).

### 1.5 Auth & Access

- Page requires login (per architecture doc permission matrix)
- Redirect to `/login` if no session
- Guest users cannot access the family profile page

### 1.6 Medical Disclaimer

- A static banner at the bottom of the page: "Qimi AI is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider."
- Styled with a light gray background and small text

### 1.7 Explicitly Out Of Scope

- No parent name/email/avatar editing (moved to `/settings`)
- No `familyNotes` editor
- No conversation-derived memory display
- No recommendation engine or follow-up logic on this page

---

## 2. Database Schema

File: `supabase/family-profile_tables.sql`

The `child_profiles` table is unchanged from the original user-profile spec:

```sql
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

CREATE INDEX IF NOT EXISTS idx_child_profiles_user_id ON child_profiles(user_id);

ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "child_profiles_select" ON child_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "child_profiles_insert" ON child_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "child_profiles_update" ON child_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "child_profiles_delete" ON child_profiles FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS child_profiles_updated_at ON child_profiles;
CREATE TRIGGER child_profiles_updated_at
  BEFORE UPDATE ON child_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

Note: If the migration from the old `supabase/user-profile_tables.sql` has already been applied to the database, this file is a no-op. The table schema is identical.

---

## 3. API Routes

All routes under `pages/api/family/`.

### API Boundary Rule

- Browser does not write family data directly to Supabase
- All mutations happen through API routes after session validation
- `child_profiles` still gets RLS policies even though the implementation writes through `getSupabaseAdmin()`

### 3.1 `GET /api/family` — Get child profile

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
    "updatedAt": "2026-02-20T00:00:00Z"
  }
}
```

Note: `childProfile` is `null` if the user has not created one yet.

**Logic:**
1. Auth check (getServerSession → 401 if no email)
2. Get-or-create user by email (PGRST116 pattern)
3. Query `child_profiles` where `user_id = userId` (single row)
4. Return child profile row (or null) in camelCase format

### 3.2 `POST /api/family/child` — Create or update child profile (upsert)

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

### 3.3 `GET /api/family/summary` — Get summary for Dashboard card

**Response (200):**
```json
{
  "summary": {
    "childName": "Alex",
    "ageText": "8 yrs 6 mos",
    "challengeCount": 3,
    "completionPercent": 100
  }
}
```

Returns `null` summary if no child profile exists.

**Logic:**
1. Auth check
2. Get user, query child_profiles
3. Compute age from birth_year + birth_month + current date
4. Compute completion percentage (3 criteria, each 33%)
5. Return compact summary

---

## 4. Frontend Components

All under `components/Family/`.

### 4.1 `FamilyCompletionBar.tsx`

Progress bar showing how complete the family profile is. Props: `childProfile: ChildProfile | null`.

- Compute completion from 3 criteria:
  1. `childProfile?.name` is non-empty
  2. `childProfile?.birthYear` and `childProfile?.birthMonth` are set
  3. `childProfile?.challenges.length > 0`
- Display: "Family Profile X% complete" — values: 0%, 33%, 67%, 100%
- Bar fill color: teal (#00D4AA) for 67–100%, amber for 33%, gray for 0%
- Below bar: list of incomplete items as small gray hint text

### 4.2 `ChallengeSelector.tsx`

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

### 4.3 `ChildProfileForm.tsx`

Form for entering or editing child profile data. Props: `childProfile: ChildProfile | null`, `onSaved(childProfile: ChildProfile): void`.

- Fields:
  - Child name: text input, max 50 characters
  - Birth year: `<select>` dropdown, options range from current year down to 2000
  - Birth month: `<select>` dropdown, options January–December (value 1–12)
  - Gender: three toggle pills — Boy / Girl / Other
  - Challenges: renders `<ChallengeSelector>` below the above fields
- Computed display (read-only text below birth year/month): "Age: X years Y months"
- If `birthYear` or `birthMonth` is not yet set, do not render the age display
- Submit button: "Save" — calls POST `/api/family/child`, then calls `onSaved`
- Loading state: disable submit button and show spinner while saving
- Show inline success message "Saved!" for 2 seconds after successful save
- **Pre-population**: If `childProfile` prop contains data (from migration or prior save), all fields start pre-filled

---

## 5. Pages

### 5.1 `pages/family.tsx` — Family profile page

```
AppLayout (SmartDrawer + Content)
├── Head: "Family Profile - Qimi AI"
├── Page header: "Family Profile"
├── Subheading text
├── FamilyCompletionBar (childProfile)
├── ChildProfileForm (childProfile, onSaved)
└── Medical disclaimer banner (bottom)
```

Auth pattern: `useSession()` → loading skeleton → redirect if no session → fetch `GET /api/family` → render content.

Data flow:
- On mount: fetch `GET /api/family` → store `childProfile` in local component state
- `ChildProfileForm.onSaved` → update local `childProfile` state (optimistic, no re-fetch needed)
- Pass updated state to `FamilyCompletionBar` so percentage recalculates live after saves

Loading state: skeleton (gray rounded rectangles) while fetch is in progress.

Error state: "Unable to load family profile. Please refresh." in red text.

### 5.2 Accessibility

- All form inputs must have associated `<label>` elements or `aria-label`
- Gender selector pills should use `role="radiogroup"` with `role="radio"` on each option
- Challenge chips should use `aria-pressed` to indicate selection state

---

## 6. Acceptance Criteria

- [ ] Authenticated user can view child profile on the family page
- [ ] Child profile form pre-populates with existing data (from migration or prior save)
- [ ] Child profile can be created (first save) and updated (subsequent saves) via upsert
- [ ] Challenge multi-select shows all 6 categories with correct items
- [ ] Selected challenges are highlighted in teal; deselected are gray-bordered
- [ ] Profile completion bar shows correct percentage and updates live after saves
- [ ] Child age is computed and displayed correctly
- [ ] Unauthenticated users are redirected to `/login`
- [ ] Medical disclaimer is visible at the bottom of the page
- [ ] Page is mobile responsive (tested at 375px width)
- [ ] Summary API returns correct data for Dashboard card
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
  - smoke test: load `/family` and verify the core happy path manually
  - contract consistency check: route, schema, and response shape must align with `docs/system-architecture.md` and this spec
- Human gate: allowed only after machine gate passes and P0/P1 review findings are zero

### Dependency

This module requires the AppLayout → SmartDrawer unification (system-architecture.md Section 9, P0 blocker) to be completed first. Until then, the page can be developed using the SmartDrawer layout pattern from `pages/chat.tsx` directly.

### T000: Clean up legacy user-profile code

- **Context**: The `feature/user-profile` branch contains partially implemented code under the old `/api/profile` and `components/Profile/` paths (files: `pages/profile.tsx`, `pages/api/profile/index.ts`, `pages/api/profile/child.ts`, `components/Profile/*`, `supabase/user-profile_tables.sql`). This code was written against the superseded `user-profile.md` spec and has not been accepted. These files are live in the repo and will produce a working (but wrong) `/profile` page if not cleaned up.
- **Do**:
  1. Delete `pages/profile.tsx` (old page, superseded by `/family`)
  2. Delete `pages/api/profile/index.ts` and `pages/api/profile/child.ts` (old API routes, replaced by `/api/family/*`)
  3. Rename `components/Profile/` → `components/Family/` and rename files:
     - `ProfileCompletionBar.tsx` → `FamilyCompletionBar.tsx`
     - `ProfileHeader.tsx` → **delete** (parent name editing temporarily removed; will be restored when `/settings` module is built. This is an intentionally accepted product gap — see note below.)
     - `ChallengeSelector.tsx` → keep as-is
     - `ChildProfileForm.tsx` → keep as-is
  4. Rename `supabase/user-profile_tables.sql` → `supabase/family-profile_tables.sql`
  5. Update all internal imports in moved files
- **Note on parent name editing gap**: Deleting `ProfileHeader.tsx` removes the ability to edit parent name. This functionality will be restored in the `/settings` module (project-control.md item 6). Until then, parent name is set from the OAuth provider (Google/Facebook) and cannot be changed in-app. This gap is intentionally accepted because name editing is low-frequency and the OAuth name is usually correct.
- **Verify**: `npx tsc --noEmit` passes, no orphaned imports, `pages/profile.tsx` no longer exists.
- **Commit**: `[T000] refactor: rename user-profile to family-profile, clean up legacy paths`

### T001: Create database migration

- **File**: `supabase/family-profile_tables.sql`
- **Do**: Copy the SQL from section 2 above. If `supabase/user-profile_tables.sql` already exists with identical schema, rename it instead.
- **Verify**: File exists with correct SQL.
- **Commit**: `[T001] feat: add child_profiles table migration`

### T002: Create GET /api/family and POST /api/family/child routes

- **Files**: `pages/api/family/index.ts`, `pages/api/family/child.ts`
- **Do**: Implement GET (fetch child profile) and POST (upsert child profile) as specified in section 3.
- **Reference**: Follow `pages/api/conversations/index.ts` auth + get-or-create pattern.
- **Verify**: `npx eslint`, `npx tsc --noEmit`, `npm run build` pass.
- **Commit**: `[T002] feat: add family profile API routes`

### T003: Create GET /api/family/summary route

- **File**: `pages/api/family/summary.ts`
- **Do**: Return compact summary for Dashboard card (child name, age text, challenge count, completion %).
- **Verify**: `npx eslint`, `npx tsc --noEmit`, `npm run build` pass.
- **Commit**: `[T003] feat: add family summary API for Dashboard card`

### T004: Create FamilyCompletionBar and ChallengeSelector components

- **Files**: `components/Family/FamilyCompletionBar.tsx`, `components/Family/ChallengeSelector.tsx`
- **Do**: Implement as specified in sections 4.1 and 4.2.
- **Styling**: Tailwind only. Teal (#00D4AA). Mobile-first.
- **Verify**: `npx eslint`, `npx tsc --noEmit`, `npm run build` pass.
- **Commit**: `[T004] feat: add FamilyCompletionBar and ChallengeSelector components`

### T005: Create ChildProfileForm component

- **File**: `components/Family/ChildProfileForm.tsx`
- **Do**: Implement as specified in section 4.3. Import ChallengeSelector from same directory.
- **Verify**: `npx eslint`, `npx tsc --noEmit`, `npm run build` pass.
- **Commit**: `[T005] feat: add ChildProfileForm component`

### T006: Create /family page

- **File**: `pages/family.tsx`
- **Do**: Implement as specified in section 5.1. Use AppLayout (or SmartDrawer layout if AppLayout unification is not yet done).
- **Verify**: `npx eslint`, `npx tsc --noEmit`, `npm run build` pass.
- **Commit**: `[T006] feat: add /family page`

### T007: Add unit tests

- **File**: `__tests__/family-profile.test.ts`
- **Do**: Test validation logic (birthYear range, birthMonth range, gender enum, challenges array). Test upsert behavior. Test auth (401 without session).
- **Verify**: `npx eslint`, `npx tsc --noEmit`, `npm run build` pass.
- **Commit**: `[T007] test: add family profile unit tests`
