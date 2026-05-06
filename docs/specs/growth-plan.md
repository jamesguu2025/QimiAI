# Module Spec: Growth Plan

> Status: APPROVED — 2026-02-22 | Self-reviewed: 2026-03-14 | Second-pass reviewed: 2026-03-14 | Implementation status: Planned
> Module: growth-plan
> Routes: `/plan`
> Branch: `feature/growth-plan`
> SOP v2.4 status: Requires refresh before implementation; current-code facts must use line evidence.

---

## 0. Planning Baseline

This spec was re-checked against:

- The current repo structure and scripts in `/Users/jamesguu/qimi-ai-website/qimi-ai-website`
- The canonical Layer 1 architecture in `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/system-architecture.md`
- The cross-platform blueprint in `/Users/jamesguu/WeChatProjects/adhdhelper-cursor/docs/项目技术蓝图.md`
- Existing shared type definitions in `/Users/jamesguu/qimi-ai-website/qimi-ai-website/types/plan.ts`
- Membership and billing are not implemented yet; there is no current `pages/api/user/subscription.ts` route and no `users.subscription_tier` column in the local initial schema.

### Current Implementation Snapshot

- Route `/plan` is not implemented yet
- No `pages/api/plan/*` endpoints exist yet
- No `components/GrowthPlan/*` directory exists yet
- Shared growth-plan types already exist and must be treated as the contract baseline

### MVP Boundary

- This module covers manual CRUD plus daily check-in for plan items
- It does not include chat-derived extraction in this pass
- It does not include PDF export in this pass
- It does not introduce a dedicated Zustand store; local page state is sufficient for MVP

### Execution Baseline

- This repo currently has `build`, but does not define `lint` or `test` npm scripts
- Validation commands in the task list therefore use `npx eslint`, `npx tsc --noEmit`, and `npm run build`

## 1. Feature Requirements

### 1.1 View Plan Items (`/plan`)

Authenticated users see all their action plan items in a single-page dashboard.

- Items are grouped by category and sorted: starred items first, then by `created_at DESC`
- Each item card shows: category icon + label, pain point, strategy, star status, last check-in date, edit/delete controls
- Empty state when no items exist: prompt to create the first item
- Medical disclaimer shown at the bottom of the page: "Not a substitute for professional medical advice"

### 1.2 Create Plan Item

Users can manually add a new plan item.

- "Add Plan Item" button opens `PlanItemForm` (inline or modal — executor's choice, keep it simple)
- Required fields: category (dropdown), pain point (textarea), strategy (textarea)
- On submit: POST to `/api/plan`, item appears immediately in the list

### 1.3 Edit Plan Item

Users can update any field of an existing item.

- Edit button on `PlanItemCard` opens `PlanItemForm` pre-filled with current values
- On submit: PUT to `/api/plan?id=uuid`, card updates in place

### 1.4 Delete Plan Item

- Delete button on `PlanItemCard` shows a browser-native confirm dialog ("Delete this plan item?")
- On confirm: DELETE to `/api/plan?id=uuid`, item removed from list

### 1.5 Star / Unstar

- Star icon button on each `PlanItemCard` toggles `star` field
- Optimistic UI update: flip star state immediately, then PUT to `/api/plan?id=uuid` with `{ star: <new_value> }`
- Starred items float to the top of the list

### 1.6 Check-In

- "Done Today" button on each `PlanItemCard`
- Sends POST to `/api/plan/checkin?id=uuid`
- Updates `last_check_in` timestamp on the item
- Button shows green check mark after a successful check-in; label changes to "Done Today" with the date
- If `last_check_in` is already today (user's local date), button is visually disabled but still clickable (idempotent endpoint)

### 1.7 Category Filter

- Horizontal scrollable row of filter chips above the item list
- Options: "All" + one chip per category from `PLAN_CATEGORIES`
- Selecting a chip filters the visible list client-side (no extra API call needed if all items are already loaded)
- "All" is selected by default

### 1.8 Auth & Access

- Page requires login; open the shared login modal if no session.
- Free users: maximum 5 plan items. When the limit is reached, the "Add Plan Item" button is replaced with a "Upgrade to Pro" prompt. View, edit, star, delete, and check-in remain available.
- Pro users: unlimited items

### 1.9 Subscription Source Of Truth

- Plan-item quota should treat all registered users as Free until the membership-billing module creates a canonical subscription API and schema.
- Do not add a second subscription source for this module.
- If this module is implemented before membership-billing, use the 5-item Free limit and document the later handoff to `docs/specs/membership-billing.md`.

---

## 2. Out of Scope (MVP)

The following are explicitly NOT part of this module:

- "Generate from chat" (requires modifying chat API — out of scope for this branch)
- PDF export (P2 feature)
- Weekly schedule / check-in calendar
- Progress tracking or check-in streaks over time
- Notifications or reminders

---

## 3. Database Schema

Migration source of truth: create a new versioned migration under `supabase/migrations/`.

Legacy draft name from older planning: `supabase/growth-plan_tables.sql` (do not use as the deployment source of truth).

```sql
-- ===========================================
-- Plan Items Table
-- ===========================================
CREATE TABLE IF NOT EXISTS plan_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category    TEXT        NOT NULL CHECK (category IN (
                'emotion', 'learning', 'exercise',
                'nutrition', 'social', 'sleep', 'school'
              )),
  pain_point  TEXT        NOT NULL,
  strategy    TEXT        NOT NULL,
  star        BOOLEAN     NOT NULL DEFAULT false,
  check_in_days TEXT[]    NOT NULL DEFAULT '{}',
  last_check_in TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plan_items_user_id
  ON plan_items(user_id);

CREATE INDEX IF NOT EXISTS idx_plan_items_user_category
  ON plan_items(user_id, category);

CREATE INDEX IF NOT EXISTS idx_plan_items_user_star
  ON plan_items(user_id, star DESC);

-- Enable RLS
ALTER TABLE plan_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies (auth is enforced server-side via service_role key;
-- these permissive policies ensure the service_role client can operate freely
-- while anon key access is blocked by default)
CREATE POLICY "plan_items_select" ON plan_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "plan_items_insert" ON plan_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plan_items_update" ON plan_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "plan_items_delete" ON plan_items FOR DELETE USING (auth.uid() = user_id);

-- Auto-update trigger (reuses the shared update_updated_at function
-- that must already exist in the database)
DROP TRIGGER IF EXISTS plan_items_updated_at ON plan_items;
CREATE TRIGGER plan_items_updated_at
  BEFORE UPDATE ON plan_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

---

## 4. API Routes

All routes under `pages/api/plan/`.

Auth pattern for every route (copy exactly from `pages/api/conversations/index.ts`):

```ts
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '@/lib/supabase';

const session = await getServerSession(req, res, authOptions);
if (!session?.user?.email) {
  return res.status(401).json({ error: 'Unauthorized' });
}
const supabase = getSupabaseAdmin();

// Get-or-create user by email (handle PGRST116 — not found)
let { data: user, error: userError } = await supabase
  .from('users')
  .select('id')
  .eq('email', session.user.email)
  .single();

if (userError && userError.code === 'PGRST116') {
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({ email: session.user.email })
    .select('id')
    .single();
  if (createError) {
    console.error('[plan] create user error:', createError);
    return res.status(500).json({ error: 'Internal server error' });
  }
  user = newUser;
} else if (userError) {
  console.error('[plan] user lookup error:', userError);
  return res.status(500).json({ error: 'Internal server error' });
}
```

All camelCase field mapping: `pain_point` → `painPoint`, `last_check_in` → `lastCheckIn`, `user_id` → `userId`, `created_at` → `createdAt`, `updated_at` → `updatedAt`.

---

### 4.1 `GET /api/plan` — List plan items

**Query params:** `category` (optional, one of the 7 valid values)

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "userId": "uuid",
      "category": "emotion",
      "painPoint": "My child melts down after school every day",
      "strategy": "Implement a 20-minute decompression routine with quiet play",
      "star": true,
      "lastCheckIn": "2026-02-21T18:00:00Z",
      "createdAt": "2026-02-01T10:00:00Z",
      "updatedAt": "2026-02-21T18:00:00Z"
    }
  ],
  "totalItems": 3,
  "starredCount": 1
}
```

**Logic:**
1. Auth + get-or-create user (see pattern above)
2. Build query: `supabase.from('plan_items').select('*').eq('user_id', user.id).order('star', { ascending: false }).order('created_at', { ascending: false })`
3. If `category` query param is present and valid, add `.eq('category', category)`
4. If `category` is invalid, return `400 { error: 'Invalid category' }`
5. Map snake_case DB fields to camelCase
6. Return `{ items, totalItems: items.length, starredCount: items.filter(i => i.star).length }`

---

### 4.2 `POST /api/plan` — Create plan item

**Request body:**
```json
{
  "category": "emotion",
  "painPoint": "My child melts down after school every day",
  "strategy": "Implement a 20-minute decompression routine with quiet play"
}
```

**Response (201):**
```json
{
  "item": {
    "id": "uuid",
    "userId": "uuid",
    "category": "emotion",
    "painPoint": "My child melts down after school every day",
    "strategy": "Implement a 20-minute decompression routine with quiet play",
    "star": false,
    "lastCheckIn": null,
    "createdAt": "2026-02-22T10:00:00Z",
    "updatedAt": "2026-02-22T10:00:00Z"
  }
}
```

**Logic:**
1. Auth + get-or-create user
2. Validate: `category` must be one of the 7 valid values; `painPoint` and `strategy` must be non-empty strings. Return `400 { error: 'description' }` on failure.
3. Free-user quota check: count existing items for this user. Until membership-billing exists, all registered users are Free; if count >= 5, return `403 { error: 'Free plan limit reached. Upgrade to Pro for unlimited items.' }`.
4. Insert into `plan_items`, default `check_in_days` to `[]`, return inserted row mapped to camelCase
5. Respond 201

---

### 4.3 `PUT /api/plan?id=uuid` — Update plan item

**Query param:** `id` (required UUID)

**Request body** (all fields optional, send only what changes):
```json
{
  "painPoint": "Updated pain point",
  "strategy": "Updated strategy",
  "category": "learning",
  "star": true
}
```

**Response (200):**
```json
{
  "item": { ...updatedItem }
}
```

**Logic:**
1. Auth + get-or-create user
2. Validate `id` present in query; return `400 { error: 'Missing id' }` if absent
3. Validate any provided `category` value
4. Build update object from only the fields present in the body (partial update — do NOT overwrite omitted fields)
5. Update: `supabase.from('plan_items').update(updateObj).eq('id', id).eq('user_id', user.id).select().single()`
6. If no row returned (wrong user or wrong id), return `404 { error: 'Not found' }`
7. Return mapped camelCase item

---

### 4.4 `DELETE /api/plan?id=uuid` — Delete plan item

**Query param:** `id` (required UUID)

**Response:** 204, no body

**Logic:**
1. Auth + get-or-create user
2. Validate `id` present; return `400 { error: 'Missing id' }` if absent
3. Delete: `supabase.from('plan_items').delete().eq('id', id).eq('user_id', user.id)`
4. Return 204

---

### 4.5 `POST /api/plan/checkin?id=uuid` — Check in on a plan item

**Query param:** `id` (required UUID)

**Request body:** none

**Response (200):**
```json
{
  "item": { ...itemWithUpdatedLastCheckIn }
}
```

**Logic:**
1. Auth + get-or-create user
2. Validate `id` present; return `400 { error: 'Missing id' }` if absent
3. Update `last_check_in` to `NOW()`: `supabase.from('plan_items').update({ last_check_in: new Date().toISOString() }).eq('id', id).eq('user_id', user.id).select().single()`
4. Keep `check_in_days` aligned with the shared `ActionPlanItem` type. For MVP, append the current local weekday if it is not already present.
5. If no row returned, return `404 { error: 'Not found' }`
6. Return mapped camelCase item
7. Note: endpoint is idempotent — calling it multiple times on the same day should not duplicate the weekday entry

---

## 5. Frontend Components

All under `components/GrowthPlan/`.

### 5.1 `PlanItemCard.tsx`

Displays a single plan item. Handles all in-card interactions.

**Props:**
```ts
interface PlanItemCardProps {
  item: ActionPlanItem;
  onStar: (id: string, newValue: boolean) => void;
  onCheckin: (id: string) => void;
  onEdit: (item: ActionPlanItem) => void;
  onDelete: (id: string) => void;
}
```

**Layout:**
```
[Category icon + badge]          [Star button]
[Pain point label]
  Pain point text

[Strategy label]
  Strategy text

[Last check-in: Feb 21]    [Done Today btn]  [Edit btn]  [Delete btn]
```

**Behavior:**
- Star button: filled star (teal) when starred, outline star when not. Click calls `onStar(item.id, !item.star)`.
- "Done Today" button: shows green check if `lastCheckIn` date matches today's local date. Label: "Done Today" (checked) or "Check In" (unchecked). Click calls `onCheckin(item.id)`.
- Edit button: pencil icon, click calls `onEdit(item)`.
- Delete button: trash icon, click triggers `window.confirm('Delete this plan item?')` then calls `onDelete(item.id)` if confirmed.
- Category badge: background color from `PLAN_CATEGORIES.find(c => c.id === item.category)?.color`, white text, icon + name.
- Styling: white card, rounded-xl, shadow-sm, p-4. Tailwind only.

---

### 5.2 `PlanItemForm.tsx`

Form for creating and editing plan items.

**Props:**
```ts
interface PlanItemFormProps {
  initialValues?: Partial<ActionPlanItem>;  // undefined = create mode, defined = edit mode
  onSubmit: (values: { category: PlanCategory; painPoint: string; strategy: string }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}
```

**Fields:**
- Category: `<select>` dropdown, options from `PLAN_CATEGORIES` (import from `@/types/plan`). Each option shows icon + name.
- Pain point: `<textarea>` with label "What challenge does your child face?". Min-height 3 rows.
- Strategy: `<textarea>` with label "What strategy will you try?". Min-height 3 rows.

**Behavior:**
- Client-side validation: all fields required. Show inline error text below the field if empty on submit attempt.
- Submit button label: "Save Item" (create) or "Update Item" (edit, when `initialValues` has an `id`).
- Cancel button calls `onCancel`.
- While `isSubmitting` is true, both buttons are disabled and submit button shows "Saving...".

---

### 5.3 `CategoryFilter.tsx`

Horizontal scrollable filter chip row.

**Props:**
```ts
interface CategoryFilterProps {
  selected: PlanCategory | 'all';
  onChange: (value: PlanCategory | 'all') => void;
}
```

**Behavior:**
- First chip: "All" with value `'all'`
- Remaining chips: one per entry in `PLAN_CATEGORIES` — shows icon + name
- Selected chip: teal background (`bg-teal-500`) + white text. Unselected: white background + gray border + gray text.
- Scrollable horizontally on mobile (`overflow-x-auto`, `flex flex-nowrap`). No scrollbar visible on desktop.
- Clicking a chip calls `onChange` with the new value.

---

### 5.4 `PlanSummary.tsx`

Stats bar at the top of the page.

**Props:**
```ts
interface PlanSummaryProps {
  totalItems: number;
  starredCount: number;
  lastCheckIn: string | null;  // ISO timestamp of most recent check-in across all items
}
```

**Layout:** Three stat boxes in a row (responsive: stack on mobile, row on md+):
1. "Total Items" — shows `totalItems`
2. "Starred" — shows `starredCount`
3. "Last Check-In" — shows relative date ("Today", "Yesterday", "3 days ago") or "Never" if null. Use `toLocaleDateString()` for formatting.

Styling: teal/purple accent colors consistent with existing landing page components.

---

## 6. Page

### 6.1 `pages/plan/index.tsx` — Growth Plan dashboard

**Page structure:**
```
AppLayout (from components/Layout/AppLayout)
├── <Head> title="Growth Plan - Qimi AI"
├── Page header: "Growth Plan" + "Add Plan Item" button (top-right)
├── PlanSummary (total, starred, last check-in)
├── CategoryFilter
├── Item list area
│   ├── [if loading] — skeleton / spinner
│   ├── [if error] — error message with retry button
│   ├── [if empty after filter] — "No items in this category yet"
│   ├── [if empty, no items at all] — "You haven't added any plan items yet. Click 'Add Plan Item' to get started."
│   └── [items] — PlanItemCard × N
├── PlanItemForm (shown inline below the header button, or as a simple overlay div — executor's choice)
└── Medical disclaimer: "Not a substitute for professional medical advice" (small text, bottom of page)
```

**Auth:** `useSession()` → if `status === 'loading'` render loading skeleton → if no session open the shared login modal and return null → else render content.

**State (local React state, no Zustand store needed for this module):**
```ts
const [items, setItems] = useState<ActionPlanItem[]>([]);
const [totalItems, setTotalItems] = useState(0);
const [starredCount, setStarredCount] = useState(0);
const [entitlementTier, setEntitlementTier] = useState<'free' | 'pro'>('free');
const [categoryFilter, setCategoryFilter] = useState<PlanCategory | 'all'>('all');
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [showForm, setShowForm] = useState(false);
const [editingItem, setEditingItem] = useState<ActionPlanItem | null>(null);
const [isSubmitting, setIsSubmitting] = useState(false);
```

**Data fetching:**
- On mount: fetch `GET /api/plan`. Store all items in state.
- Do not fetch `GET /api/user/subscription` until the membership-billing module creates that route. Default `entitlementTier` to `free` in this module's first implementation.
- Category filter is applied client-side: `const visibleItems = categoryFilter === 'all' ? items : items.filter(i => i.category === categoryFilter)`.
- No refetch on filter change (all items already loaded).

**Handlers:**

`handleCreate(values)`:
1. Set `isSubmitting = true`
2. POST to `/api/plan`
3. On success: prepend `response.item` to `items`, update `totalItems`/`starredCount`, hide form
4. On error: show error toast or inline error
5. Finally: set `isSubmitting = false`

`handleUpdate(id, values)`:
1. Set `isSubmitting = true`
2. PUT to `/api/plan?id=<id>`
3. On success: replace item in `items` array, update `starredCount` if star changed, clear `editingItem`
4. Finally: set `isSubmitting = false`

`handleStar(id, newValue)`:
1. Optimistic update: `setItems(items.map(i => i.id === id ? { ...i, star: newValue } : i))`
2. Recalculate and set `starredCount`
3. PUT to `/api/plan?id=<id>` with `{ star: newValue }`
4. On error: revert the optimistic update

`handleCheckin(id)`:
1. POST to `/api/plan/checkin?id=<id>`
2. On success: update the matching item's `lastCheckIn` in state

`handleDelete(id)`:
1. Browser confirm dialog
2. If confirmed: DELETE to `/api/plan?id=<id>`
3. On success: remove from `items`, decrement `totalItems`, decrement `starredCount` if item was starred

**Free user quota UI:**
- After load, if `totalItems >= 5` and `entitlementTier !== 'pro'`, replace "Add Plan Item" button with a disabled button labeled "Upgrade for More Items" styled in purple. Before membership-billing exists, all registered users remain Free.

---

## 6.2 Error Boundary & Accessibility

- **Error Boundary**: Use AppLayout's built-in error handling.
- **Accessibility**: Star toggle must have `aria-label="Star this item"` / `aria-label="Unstar this item"`. Delete button must have `aria-label="Delete plan item"`. Category filter chips should use `role="tablist"` pattern. Form inputs must have associated labels.

---

## 7. Acceptance Criteria

- [ ] Authenticated user can create, view, edit, and delete plan items
- [ ] Star toggle works; starred items sort to the top of the list
- [ ] Check-in sets `last_check_in` to current timestamp; "Done Today" button reflects the updated state
- [ ] Category filter correctly shows only items of the selected category
- [ ] Free users are blocked from creating more than 5 items (upgrade prompt shown)
- [ ] Unauthenticated users are blocked from the page and prompted via the shared login modal
- [ ] Medical disclaimer is visible on the page
- [ ] All fields in `PlanItemForm` are validated; empty field submission shows inline errors
- [ ] Delete requires confirmation before removing an item
- [ ] Page is mobile responsive (single column on small screens)
- [ ] `npx eslint` passes for touched files
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes

---

## 8. Execution Task List

### Task Execution Metadata

- Implementation mode: `linear`
- Acceptance mode: `single-item gate`
- Machine gate:
  - required checks: `npx eslint`, `npx tsc --noEmit`, `npm run build`
  - smoke test: load the affected route or API path and verify the core happy path manually
  - contract consistency check: route, schema, quota logic, and response shape must remain aligned with `/docs/system-architecture.md` and this spec
- Human gate: allowed only after machine gate passes and P0/P1 review findings are zero

Each task is one file (or two tightly coupled files). Execute in order. Run `npx eslint`, `npx tsc --noEmit`, and `npm run build` after each task before committing.

### T001: Database migration
- **File**: new `supabase/migrations/{timestamp}_growth_plan_tables.sql`
- **Do**: Write the SQL from Section 3. Create the file.
- **Verify**: File exists with correct SQL content. No lint/build step needed for SQL.
- **Commit**: `[T001] feat: add plan_items table migration`

### T002: GET /api/plan — list items
- **File**: `pages/api/plan/index.ts`
- **Do**: Handle GET method. Auth + get-or-create user (copy pattern from `pages/api/conversations/index.ts`). Optional `category` query param filter. Return `{ items, totalItems, starredCount }`.
- **Note**: This file will also handle POST (T003) and PUT/DELETE (T004). Create the file now with only GET; the other methods will be added in subsequent tasks.
- **Verify**: `npx eslint pages/api/plan/index.ts` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T002] feat: add GET /api/plan list endpoint`

### T003: POST /api/plan — create item
- **File**: `pages/api/plan/index.ts` (same file as T002)
- **Do**: Add POST handler in the same route file. Validate fields. Enforce the 5-item Free-tier limit by default until membership-billing creates the canonical entitlement API. Insert and return `{ item }` with 201.
- **Verify**: `npx eslint pages/api/plan/index.ts` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T003] feat: add POST /api/plan create endpoint`

### T004: PUT /api/plan + DELETE /api/plan — update and delete
- **File**: `pages/api/plan/index.ts` (same file)
- **Do**: Add PUT handler (partial update, ownership check via `user_id`). Add DELETE handler (ownership check, return 204).
- **Verify**: `npx eslint pages/api/plan/index.ts` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T004] feat: add PUT and DELETE /api/plan endpoints`

### T005: POST /api/plan/checkin — check in
- **File**: `pages/api/plan/checkin.ts`
- **Do**: New file. Handle POST only. Auth + get-or-create user. Update `last_check_in = NOW()` and keep `check_in_days` aligned with the shared type for the given item id (scoped to user). Return `{ item }`.
- **Verify**: `npx eslint pages/api/plan/checkin.ts` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T005] feat: add POST /api/plan/checkin endpoint`

### T006: PlanItemCard + PlanItemForm components
- **Files**: `components/GrowthPlan/PlanItemCard.tsx`, `components/GrowthPlan/PlanItemForm.tsx`
- **Do**: Implement both components per Section 5.1 and 5.2. Import `ActionPlanItem`, `PlanCategory`, `PLAN_CATEGORIES` from `@/types/plan`. Tailwind only. No external UI libraries.
- **Verify**: `npx eslint components/GrowthPlan/PlanItemCard.tsx components/GrowthPlan/PlanItemForm.tsx` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T006] feat: add PlanItemCard and PlanItemForm components`

### T007: CategoryFilter + PlanSummary components
- **Files**: `components/GrowthPlan/CategoryFilter.tsx`, `components/GrowthPlan/PlanSummary.tsx`
- **Do**: Implement both components per Section 5.3 and 5.4. Import `PLAN_CATEGORIES` and `PlanCategory` from `@/types/plan`. Tailwind only.
- **Verify**: `npx eslint components/GrowthPlan/CategoryFilter.tsx components/GrowthPlan/PlanSummary.tsx` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T007] feat: add CategoryFilter and PlanSummary components`

### T008: /plan page — compose everything
- **File**: `pages/plan/index.tsx`
- **Do**: Implement the full page per Section 6.1. Import all four components from `components/GrowthPlan/`. Implement all handlers. Auth check with `useSession`. Local state only (no new Zustand store). Medical disclaimer at the bottom.
- **Verify**: `npx eslint pages/plan/index.tsx` passes, `npx tsc --noEmit` passes, `npm run build` passes. Manually verify: create an item, star it, filter by category, check in, edit, delete.
- **Commit**: `[T008] feat: add /plan growth plan dashboard page`

### T009: Add unit tests
- **File**: `__tests__/growth-plan.test.ts`
- **Do**: Test input validation logic: category must be one of the 7 valid values (reject invalid), painPoint and strategy must be non-empty strings (reject empty/missing). Test first-implementation Free quota enforcement: a user with 5 existing items gets 403 because membership-billing has not created Pro entitlement yet. Test CRUD flows: POST creates item (201), GET lists items (sorted: starred first, then by created_at DESC), PUT partial update only changes provided fields, DELETE returns 204. Test checkin endpoint: updates `last_check_in` and keeps `check_in_days` aligned. Test ownership: user cannot read/update/delete another user's items (404). Test auth: request without session returns 401.
- **Verify**: add the test file together with the chosen test runner setup for this repo, then ensure `npx eslint`, `npx tsc --noEmit`, and `npm run build` still pass.
- **Commit**: `[T009] test: add growth plan unit tests`
