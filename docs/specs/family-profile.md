# Module Spec: Family Profile

> Status: REDESIGNED — 2026-03-17 | Implementation status: Implemented, not yet human-accepted | Previous versions had incorrect ChallengeSelector on profile page. This version aligns with blueprint § 2.9.
> Module: family-profile
> Routes: `/family`
> API routes: `pages/api/family/*`
> Components: `components/Family/*`
> Branch: `feature/family-profile`
> Scope: Child basic info editing + read-only onboarding challenge tags + AI-extracted facts display. Accessed from Dashboard card.
> SOP v2.4 status: Requires refresh before further implementation; current-code facts must use line evidence.

---

## 0. Planning Baseline

This spec was written against:

- **Blueprint § 2.9** (个人中心): `展示孩子年龄与挑战标签摘要（来自 guide_child_profile）`
- **Blueprint § 用户档案 data structure**: `child_birthday`, `challenges[]`, `familyNotes`, `extractedFacts[]`
- **Blueprint § 2.3** (对话后台处理): `每次对话后自动提取用户家庭信息（Memory Extraction）→ 提取的事实存入用户档案`
- The canonical Layer 1 architecture in `docs/system-architecture.md`
- The memory layer spec in `docs/specs/memory-profile-summary.md`
- Current code evidence: `pages/family.tsx:L99-L162` renders the implemented family page; `pages/api/user/migrate-guest-data.ts:L118-L141` writes guest child data to `child_profiles`.

### Blueprint Traceability

| UI Element | Blueprint Source | Type |
|-----------|-----------------|------|
| Child age display | § 2.9: `展示孩子年龄` | Blueprint |
| Challenge tags (read-only) | § 2.9: `挑战标签摘要（来自 guide_child_profile）` | Blueprint |
| Child name/gender editing | Web-only addition: blueprint has no name field, web adds for personalization | Web extension |
| AI-extracted facts display | § 用户档案: `extractedFacts[]` with 10 categories | Blueprint |
| Family notes / summary | § 用户档案: `familyNotes: "AI 生成的家庭情况摘要"` | Blueprint |

### Design Principle

> The challenges collected during Guest onboarding exist to give the AI **immediate context** — they are NOT a feature users come back to edit. Real family context comes from conversation-derived extraction (extractedFacts), which is more specific and valuable than generic onboarding checkboxes.

### MVP Boundary

- This module owns child basic info (name, birthday, gender) editing
- Onboarding challenges are displayed as **read-only tags**, not an editable selector
- AI-extracted facts display depends on `memory-profile-summary` module. If memory layer is not yet built, show an empty state with explanation text
- Family notes / summary display depends on `profile_summaries` table. If not yet built, show empty state
- Parent account settings (name, email, avatar) remain in `/settings` module
- One child profile per user account (MVP constraint)

### Guest Data Migration Rule

Per `docs/system-architecture.md` Section 7, when a guest registers:
- `childBirthday` → `child_profiles.birth_year` + `child_profiles.birth_month`
- `challenges` (SelectedChallenge[]) → `child_profiles.challenges` (JSONB)
- The migration endpoint (`pages/api/user/migrate-guest-data.ts`) must write to `child_profiles`, NOT to legacy `users` table columns

---

## 1. Feature Requirements

### 1.1 Family Profile Page (`/family`)

Page layout (top to bottom):

```
AppLayout (SmartDrawer + Content)
├── Head: "Family Profile - Qimi AI"
├── Section 1: Child Info Card
│   ├── Child name (editable, text input)
│   ├── Age display: "X years Y months" (computed from birthday, prominent)
│   ├── Birthday (editable: year + month dropdowns)
│   └── Gender (editable: Boy / Girl / Other pills)
│
├── Section 2: Onboarding Challenges (read-only)
│   ├── Section heading: "Initial Concerns" with subtitle "From your onboarding session"
│   └── Challenge tags displayed as colored read-only pills, grouped by category
│       (e.g., "Emotions: Frequent tantrums, Mood swings" / "Attention: Easily distracted")
│       If no challenges: "No challenges recorded from onboarding"
│
├── Section 3: What Qimi Has Learned (from conversations)
│   ├── Section heading: "What Qimi Has Learned" with subtitle "Insights from your conversations"
│   ├── If memory_items exist: display as cards grouped by category
│   │   (e.g., "Child Info: Child's name is Alex, attends Lincoln Elementary")
│   │   (e.g., "Behavior: Monday mornings are hardest, transitions take 15+ minutes")
│   ├── If no memory_items: "As you chat with Qimi, insights about your family will appear here."
│   └── Future: each card has confirm/archive actions (NOT in MVP)
│
├── Section 4: Family Summary
│   ├── Section heading: "Family Summary"
│   ├── If profile_summary exists: display as editable text area (max 800 chars)
│   ├── If no summary: "A summary of your family's situation will be generated as you chat."
│   └── Save button for summary edits
│
└── Medical disclaimer banner (bottom)
```

### 1.2 Child Info Management

- Form fields: child name (text, max 50 chars), birth year (dropdown), birth month (dropdown), gender (3 pills)
- **No ChallengeSelector component** — challenges are NOT editable on this page
- Save button saves via POST `/api/family` (upsert)
- Display child's computed age prominently next to birthday fields

### 1.3 Onboarding Challenges Display (Read-Only)

- Read challenges from `child_profiles.challenges` (JSONB, `SelectedChallenge[]` format)
- Display as colored pills grouped by category (use category color from GuestOnboarding CATEGORIES constant)
- Pills are NOT clickable / NOT toggleable — purely visual
- If user wants to change challenges, they would need to go through onboarding again (not supported in MVP)

### 1.4 AI-Extracted Facts Display

- Read from `memory_items` table via `GET /api/memory/relevant` (or a new endpoint)
- Display grouped by category (child_info, school, family, behavior, preference, medical, concern, goal, progress, sports)
- Each fact shows: content text + when it was learned
- If `memory_items` table doesn't exist yet or is empty, show friendly empty state
- **No editing in MVP** — facts are read-only. Future: confirm/archive actions

### 1.5 Family Summary Display

- Read from `profile_summaries` table via `GET /api/memory/summary`
- Display as an editable text area (max 800 chars)
- Save via `PUT /api/memory/summary`
- If `profile_summaries` table doesn't exist yet, show friendly empty state
- **This section depends on memory-profile-summary module being implemented**

### 1.6 Pre-population from Guest Onboarding

If the user completed guest onboarding before registering:
- `childBirthday` → pre-populate birth year and month
- `challenges` → pre-populate the read-only challenge tags
- The family page must show this data on first visit, not empty fields

### 1.7 Auth & Access

- Page requires login. Open the shared login modal if no session; there is no current standalone `pages/login.tsx`.
- Guest users cannot access the family profile page.

### 1.8 Medical Disclaimer

Static banner at page bottom: "Qimi AI is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider."

### 1.9 Explicitly Out Of Scope

- No ChallengeSelector / editable challenge grid (challenges are set during onboarding only)
- No parent name/email/avatar editing (moved to `/settings`)
- No memory item editing/confirming/archiving in MVP
- No recommendation engine on this page

---

## 2. Database Schema

Migration source of truth: `supabase/migrations/20260506000200_family_tables.sql`

Legacy reference snippet: `supabase/family_tables.sql`

```sql
CREATE TABLE IF NOT EXISTS child_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  birth_year INTEGER CHECK (birth_year >= 2000 AND birth_year <= 2030),
  birth_month INTEGER CHECK (birth_month >= 1 AND birth_month <= 12),
  gender TEXT CHECK (gender IN ('boy', 'girl', 'other')),
  challenges JSONB NOT NULL DEFAULT '[]',
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

`challenges` is JSONB storing `SelectedChallenge[]` objects from GuestOnboarding:
```json
[
  { "id": "tantrums", "name": "Frequent tantrums", "categoryId": "emotion", "categoryName": "Emotions" },
  { "id": "distracted", "name": "Easily distracted", "categoryId": "focus", "categoryName": "Attention" }
]
```

**Migration note**: If the table already exists with `TEXT[]` type, run: `ALTER TABLE child_profiles ALTER COLUMN challenges TYPE JSONB USING '[]'::jsonb;`

**Note**: `memory_items` and `profile_summaries` tables are defined in `docs/specs/memory-profile-summary.md`. This module reads from them but does not create them.

---

## 3. API Routes

All routes under `pages/api/family/`.

### 3.1 `GET /api/family` — Get child profile

**Response (200):**
```json
{
  "childProfile": {
    "id": "uuid",
    "name": "Alex",
    "birthYear": 2018,
    "birthMonth": 4,
    "gender": "boy",
    "challenges": [
      { "id": "tantrums", "name": "Frequent tantrums", "categoryId": "emotion", "categoryName": "Emotions" }
    ]
  }
}
```

`childProfile` is `null` if the user has not created one yet.

### 3.2 `POST /api/family` — Update child basic info (upsert)

**Request body** (only basic info fields — NO challenges):
```json
{
  "name": "Alex",
  "birthYear": 2018,
  "birthMonth": 4,
  "gender": "boy"
}
```

Note: `challenges` are NOT accepted in this endpoint. Challenges are set during onboarding migration only.

### 3.3 `GET /api/family/summary` — Get summary for Dashboard card

Same as before — returns child name, age text, challenge count, completion percentage.

---

## 4. Frontend Components

All under `components/Family/`.

### 4.1 `ChildInfoCard.tsx`

Editable card for child's basic information.

Props: `childProfile: ChildProfile | null`, `onSaved(profile): void`

Fields:
- Child name: text input, max 50 chars
- Birth year: `<select>` dropdown
- Birth month: `<select>` dropdown
- Gender: three toggle pills (Boy / Girl / Other)
- Computed age display (read-only)
- Save button

Does NOT include challenges.

### 4.2 `ChallengeTags.tsx` (NEW — replaces ChallengeSelector)

Read-only display of onboarding challenges as colored tag pills.

Props: `challenges: SelectedChallenge[]`

- Group challenges by `categoryId`
- Display category name as section label
- Each challenge shown as a small colored pill (use category color from GuestOnboarding CATEGORIES)
- Pills are NOT interactive — no onClick, no toggle
- If challenges array is empty, show "No challenges recorded from onboarding"

### 4.3 `ExtractedFactsSection.tsx` (NEW)

Display section for AI-extracted facts from conversations.

Props: `facts: MemoryItem[] | null`, `loading: boolean`

- If memory layer is not built yet (API returns 404), show: "As you chat with Qimi, insights about your family will appear here."
- If facts exist, group by category and display as cards
- Each card: category label + content text + "Learned on {date}"
- Read-only in MVP

### 4.4 `FamilySummarySection.tsx` (NEW)

Display/edit section for family summary.

Props: `summary: string | null`, `loading: boolean`, `onSave(text): void`

- If memory layer is not built yet (API returns 404), show: "A summary of your family's situation will be generated as you chat."
- If summary exists, show as editable `<textarea>` with max 800 chars
- Save button calls `PUT /api/memory/summary`

### 4.5 `FamilyCompletionBar.tsx` (KEEP)

Same as current — shows completion percentage based on name, birthday, challenges.

### 4.6 `ChallengeSelector.tsx` — DELETE

This component should be **removed** from the Family module. It belongs only in `GuestOnboarding.tsx`. Delete `components/Family/ChallengeSelector.tsx`.

---

## 5. Pages

### 5.1 `pages/family.tsx` — Family profile page

Auth pattern: `useSession()` → loading skeleton → open shared login modal if no session → fetch data → render.

Data fetching on mount (parallel):
1. `GET /api/family` → child profile (name, birthday, gender, challenges)
2. `GET /api/memory/relevant?limit=20` → extracted facts (graceful 404 if memory module not built)
3. `GET /api/memory/summary` → family summary (graceful 404 if memory module not built)

Layout: sections as described in 1.1.

---

## 6. Acceptance Criteria

- [ ] Child basic info (name, birthday, gender) is editable and saves correctly
- [ ] Onboarding challenges display as read-only colored tags (NOT an editable selector)
- [ ] Challenge tags are grouped by category with correct category colors
- [ ] If no challenges exist, appropriate empty state is shown
- [ ] Extracted facts section shows friendly empty state when memory module is not built
- [ ] Family summary section shows friendly empty state when memory module is not built
- [ ] Child age is computed and displayed correctly
- [ ] Pre-populated data from guest onboarding appears (after migration fix)
- [ ] Unauthenticated users are blocked from the page and prompted via the shared login modal
- [ ] Medical disclaimer is visible at the bottom
- [ ] Page is mobile responsive (tested at 375px width)
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes

---

## 7. Execution Task List

### Task Execution Metadata

- Implementation mode: `linear`
- Acceptance mode: `single-item gate`
- Machine gate: `npx tsc --noEmit`, `npm run build`

### T001: Fix database schema — challenges column TEXT[] → JSONB

- **File**: `supabase/migrations/20260506000200_family_tables.sql`
- **Do**: Update `challenges` column from `TEXT[]` to `JSONB NOT NULL DEFAULT '[]'`
- **Verify**: File matches section 2 schema.
- **Commit**: `[T001] fix: change challenges column to JSONB`

### T002: Delete ChallengeSelector, create ChallengeTags (read-only)

- **Delete**: `components/Family/ChallengeSelector.tsx`
- **Create**: `components/Family/ChallengeTags.tsx` — read-only colored tag pills grouped by category (see 4.2)
- **Do**: Copy the category color mapping from `GuestOnboarding.tsx` CATEGORIES constant (only need `id`, `name`, `color`)
- **Verify**: `npx tsc --noEmit`, `npm run build` pass.
- **Commit**: `[T002] feat: replace ChallengeSelector with read-only ChallengeTags`

### T003: Rewrite ChildProfileForm → ChildInfoCard (no challenges)

- **Delete or rewrite**: `components/Family/ChildProfileForm.tsx` → `components/Family/ChildInfoCard.tsx`
- **Do**: Remove ChallengeSelector import and usage. Form only has name, birthday, gender. POST body does not include challenges.
- **Verify**: `npx tsc --noEmit`, `npm run build` pass.
- **Commit**: `[T003] feat: simplify ChildInfoCard to basic info only`

### T004: Create ExtractedFactsSection and FamilySummarySection (empty-state ready)

- **Files**: `components/Family/ExtractedFactsSection.tsx`, `components/Family/FamilySummarySection.tsx`
- **Do**: Implement as specified in 4.3 and 4.4. Both must gracefully handle 404 (memory module not built yet) with friendly empty state text.
- **Verify**: `npx tsc --noEmit`, `npm run build` pass.
- **Commit**: `[T004] feat: add extracted facts and family summary sections`

### T005: Rewrite /family page with new layout

- **File**: `pages/family.tsx`
- **Do**: Replace current page with new layout: ChildInfoCard + ChallengeTags (read-only) + ExtractedFactsSection + FamilySummarySection + disclaimer. Parallel-fetch from 3 APIs with graceful error handling.
- **Verify**: `npx tsc --noEmit`, `npm run build` pass.
- **Commit**: `[T005] feat: redesign /family page with read-only challenges and memory sections`

### T006: Fix POST /api/family — remove challenges from accepted fields

- **File**: `pages/api/family/index.ts`
- **Do**: POST should only accept `name`, `birthYear`, `birthMonth`, `gender`. Remove `challenges` from POST body handling. GET still returns challenges (read-only).
- **Verify**: `npx tsc --noEmit`, `npm run build` pass.
- **Commit**: `[T006] fix: remove challenges from POST /api/family`

### T007: Fix guest data migration — write to child_profiles

- **File**: `pages/api/user/migrate-guest-data.ts`
- **Do**:
  1. Fix request body parsing to match what `guestStorage.migrateToUser()` sends: `{ userId, guestData: { childBirthday, challenges, chatHistory, firstQuestion } }`
  2. Write birthday + challenges to `child_profiles` table (JSONB), not `users` table
  3. Remove `JSON.stringify(challenges)` — Supabase handles JSONB serialization automatically
  4. Keep chat history migration as-is
- **Verify**: `npx tsc --noEmit`, `npm run build` pass.
- **Commit**: `[T007] fix: migrate guest data to child_profiles`

### T008: Fix FamilyCompletionBar — handle JSONB challenges

- **File**: `components/Family/FamilyCompletionBar.tsx`
- **Do**: Update completion check for challenges from `string[]` to `SelectedChallenge[]` (object array).
- **Verify**: `npx tsc --noEmit`, `npm run build` pass.
- **Commit**: `[T008] fix: update FamilyCompletionBar for JSONB challenges`

### T009: Fix summary API — handle JSONB challenges

- **File**: `pages/api/family/summary.ts`
- **Do**: Update `challengeCount` to handle JSONB array.
- **Verify**: `npx tsc --noEmit`, `npm run build` pass.
- **Commit**: `[T009] fix: update summary API for JSONB challenges`
