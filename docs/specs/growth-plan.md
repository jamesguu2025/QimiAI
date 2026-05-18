# Module Spec: Growth Plan

> Status: APPROVED — 2026-02-22 | Self-reviewed: 2026-03-14 | Second-pass reviewed: 2026-03-14 | Implementation status: Planned | Amended: 2026-05-11 (Chat Save addendum)
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

---

## 9. Addendum: Chat Save To Growth Plan

> Added: 2026-05-11
> Scope: planning spec for "AI suggestion -> user confirms -> save action plan" from chat into existing Growth Plan.
> Status: Ready for implementation

### 9.0 Current-Code Evidence

Internal facts are line-referenced per SOP v2.4:

- `plan_items` already exists with `category`, `pain_point`, `strategy`, `star`, `check_in_days`, `last_check_in`, `created_at`, and `updated_at`, but no source conversation/message/time columns: `supabase/migrations/20260509000100_growth_plan_tables.sql:3-22`.
- `plan_items` RLS is scoped by `auth.uid() = user_id`: `supabase/migrations/20260509000100_growth_plan_tables.sql:33-51`.
- Current `/api/plan` maps DB fields to `ActionPlanItem` and enforces the Free limit as `FREE_PLAN_LIMIT = 5`: `pages/api/plan/index.ts:21-37`, `pages/api/plan/index.ts:131-177`.
- Current create API accepts only `category`, `painPoint`, and `strategy`; it does not persist source metadata: `pages/api/plan/index.ts:131-168`.
- Current `ActionPlanItem` and `CreatePlanItemRequest` already contain optional `sourceMessageId`, but no `sourceConversationId` or `sourceTime`: `types/plan.ts:35-64`.
- Chat pre-creates a conversation and emits `conversation_created` before tokens for logged-in users: `pages/api/chat/stream.ts:294-325`.
- Chat saves user and assistant messages after streaming, but the stream currently does not return the persisted assistant `messages.id` to the client: `pages/api/chat/stream.ts:73-94`, `pages/api/chat/stream.ts:346-359`.
- Frontend chat state currently uses local temporary message ids such as `ai-${Date.now()}` and marks completion on `done`: `stores/chatStore.ts:154-162`, `stores/chatStore.ts:268-280`.

### 9.1 Search Evidence And Source Links

Search ledger:

| Decision ID | Query | Result | Source URL |
|---|---|---|---|
| ADR-GP-CS-1 | `AI app suggestion confirm save action plan user consent coaching app` | Found(partial) | https://www.maxi.io/en/ |
| ADR-GP-CS-1 | `health coaching app action plan user confirms AI suggestion save` | Found(partial) | https://leverhealth.com/ |
| ADR-GP-CS-2 | `Wysa app AI recommends tool user chooses action plan safety privacy consent` | Found(partial) | https://www.wysa.com/faq |
| ADR-GP-CS-3 | `Headspace AI principles diagnosis clinical advice privacy consent` | Found(partial) | https://www.headspace.com/ai and https://www.headspace.com/consumer-health-data |
| ADR-GP-CS-4 | `OpenAI structured outputs JSON schema official docs` | Found | https://developers.openai.com/api/docs/guides/structured-outputs |

Evidence interpretation:

- Maxi exposes the mature pattern closest to this feature: chat creates a goal plan, then "AI proposes, you approve" with one-tap acceptance. This supports **explicit user approval before committing plan/habit changes**, but it is a coaching app, not pediatric health care, so applicability is partial.
- Lever Health frames the loop as small daily actions, check-in, and coach feedback, and shows an insight asking whether the user wants to make a detected behavior the default. This supports **small actionable plan items and user confirmation for ongoing behavior changes**, but does not specify Growth Plan schema.
- Wysa says its AI recommends evidence-based skills and techniques, states it is self-help/self-monitoring, not a substitute for medical advice or crisis support, and documents privacy boundaries. This supports **keeping AI suggestions bounded, user-directed, and non-diagnostic**.
- Headspace says its AI does not diagnose, treat, replace licensed care, or provide medical/clinical advice, and its consumer health data policy requires affirmative consent for certain sensitive health-data processing. This supports **confirmation, safety language, and health-data minimization**.
- OpenAI Structured Outputs documentation supports JSON-schema-constrained extraction and programmatically detectable refusals. This supports **using structured extraction for `category`, `challenge`, and `strategy` rather than parsing assistant prose ad hoc**.

ADR-lite:

| Decision ID | Decision | Risk | External Evidence | Local Evidence | Supported Claim | Unsupported Gap | Status | Confirmation |
|---|---|---|---|---|---|---|---|---|
| ADR-GP-CS-1 | Never auto-save; show `Save to Growth Plan`, then require confirm/edit | High | Found(partial): Maxi approval pattern, Lever behavior-change confirmation | Existing Growth Plan create flow is explicit POST only | User approval is the right commitment step | Sources do not define Qimi-specific ADHD copy or schema | Accepted | API tests prove no plan item is created before confirm |
| ADR-GP-CS-2 | Save structured content as `painPoint`, `explanationMarkdown`, `interventionBlocks[]`, and `strategySummary`; use Markdown only inside content blocks | High | Found(partial): Wysa bounded tools/skills; PostgreSQL JSONB docs; GFM/React Markdown support | Current Web already renders assistant Markdown tables with `react-markdown` + `remark-gfm`; Growth Plan schema can be expanded | Keep saved items concrete, renderable, and reusable for later PDF orchestration | Exact Qimi block schema is an internal product choice | Accepted | Extraction schema validation + `/plan` Markdown table smoke test |
| ADR-GP-CS-3 | Store source metadata as nullable provenance fields | High | Found(partial): health privacy/consent guidance | Current schema lacks provenance columns; types partially anticipate `sourceMessageId` | Provenance improves auditability and duplicate control | Source metadata retention period is product choice | Provisional | Migration is expand-only; privacy copy visible |
| ADR-GP-CS-4 | Use structured JSON extraction with validation and retry/fallback | Normal | Found: OpenAI Structured Outputs | Current API already validates plan fields before insert | Schema-constrained output reduces malformed extraction | Does not guarantee semantic correctness | Accepted | Unit tests for malformed JSON/refusal/unsafe content |

### 9.2 Product UX Flow

Trigger rule:

- After an assistant message finishes streaming, send only the final assistant content to a server-side lightweight LLM decision endpoint.
- Show `Save to Growth Plan` only when the decision endpoint returns `shouldPropose=true`. The decision must require at least two concrete parent-actionable steps plus timing, frequency, quantity, sequence, or other implementation detail. Examples: a routine, environmental adjustment, school communication script, sleep step, social practice, exercise/movement plan, nutrition support, or emotion-regulation strategy.
- When RAG research is available, the assistant answer should use the retrieved papers as the backbone for intervention choice and parameters while keeping the visible response practical and parent-readable. This mirrors the mini-program principle of "research as the plan skeleton, natural explanation as the surface," rather than a heavy literature-review display.
- Research-backed answers should expose clickable source access in Web: inline Markdown links for key claims when available, plus a compact `Based on N research papers` source list with paper metadata. This is a Web-specific improvement over the mini-program's non-clickable paper list.
- Do not show the button for generic explanation, medication dosage instructions, crisis/emergency content, legal/IEP rights-only explanation without a strategy, or incomplete streaming messages. Diagnosis/IEP-adjacent content may be saveable when it is reframed as a parent action, such as "track observations for the clinician" or "prepare questions for the school meeting."
- The previous front-end keyword/regex gate is not the primary path. It may only be used for historical DSML-style fallback if legacy messages contain explicit internal save markers.

Flow:

1. Assistant response appears in chat.
2. Frontend calls `POST /api/plan/decision` with the final assistant message. If eligible, a small secondary button appears below that assistant message: `Save to Growth Plan`.
3. User clicks the button. This click is the explicit user confirmation. If unauthenticated, open the existing login modal and do not extract/save yet.
4. Frontend calls the chat-save API with `conversationId`, persisted `sourceMessageId` when available, `assistantContent`, and optional nearby user message context.
5. Backend calls the LLM once to extract `category`, `painPoint`, `explanationMarkdown`, `interventionBlocks[]`, and `strategySummary`; it preserves GFM Markdown tables/lists inside content blocks.
6. Backend validates safety, ownership, quota, and duplicates, then inserts into `plan_items`.
7. On success, the chat button becomes `Saved to Growth Plan` for that message; the UI should not offer another save for the same source.
8. On duplicate near-match, show a small inline warning and allow `Save Anyway`; same-source duplicates remain blocked.
9. On quota failure, show the existing free-limit upgrade copy inline.

Out of scope for this addendum:

- No automatic saving.
- No PDF export implementation in this slice. This slice must preserve structured content so a later PDF export can run a second AI pass for cross-item dedupe, merge, ordering, titles, parent tips, and document layout.
- No automatic reminders.
- No complex multi-step plan generator.
- No background extraction for every message unless the user clicks save.
- No concrete medication dosage/change action, crisis-plan, or emergency instruction saving. Medication-adjacent content may be saved only as non-prescriptive parent actions such as observing effects, tracking side effects, and preparing questions for the prescribing doctor.

### 9.3 API Design

Create two endpoints under `pages/api/plan/`.

#### `POST /api/plan/extract-from-chat`

Purpose: legacy/diagnostic preview draft only. The production click path may skip this endpoint and call `save-from-chat` directly because the user's click is the confirmation. This endpoint must not insert into `plan_items`.

Request:

```json
{
  "conversationId": "uuid-or-null",
  "sourceMessageId": "persisted-assistant-message-uuid-or-null",
  "clientMessageId": "optional-client-temp-id",
  "sourceTime": "2026-05-11T10:00:00.000Z",
  "assistantContent": "assistant message text",
  "userContext": "optional preceding user message"
}
```

Response 200:

```json
{
  "draft": {
    "category": "sleep",
    "challenge": "The child struggles to settle at bedtime after stimulating evening activities.",
    "strategy": "Try a 20-minute wind-down routine: dim lights, put screens away, choose one quiet activity, then use the same bedtime cue each night.",
    "confidence": 0.84,
    "sourceConversationId": "uuid-or-null",
    "sourceMessageId": "persisted-assistant-message-uuid-or-null",
    "sourceTime": "2026-05-11T10:00:00.000Z"
  },
  "duplicate": {
    "isDuplicate": false,
    "matchedItemId": null,
    "reason": null
  }
}
```

Error responses:

- `401 { "error": "Unauthorized" }`
- `400 { "error": "No actionable strategy found" }`
- `400 { "error": "Unsafe or unsupported plan item" }`
- `429 { "error": "Too many requests" }` if later rate limiting is added
- `500 { "error": "Failed to extract plan item" }`

#### `POST /api/plan/save-from-chat`

Purpose: extract and save the user-confirmed assistant suggestion in one low-friction action. The user's button click is the confirmation; this endpoint performs LLM extraction, validation, duplicate checks, quota checks, and insert.

Request:

```json
{
  "assistantContent": "assistant message text, including Markdown tables if present",
  "userContext": "optional preceding user message",
  "sourceConversationId": "uuid-or-null",
  "sourceMessageId": "persisted-assistant-message-uuid-or-null",
  "sourceTime": "2026-05-11T10:00:00.000Z",
  "duplicateOverride": false
}
```

Response 201:

```json
{
  "item": {
    "id": "uuid",
    "userId": "uuid",
    "category": "sleep",
    "painPoint": "The child struggles to settle at bedtime after stimulating evening activities.",
    "strategy": "Try a 20-minute wind-down routine: dim lights, put screens away, choose one quiet activity, then use the same bedtime cue each night.",
    "strategySummary": "Use a short, consistent wind-down routine before bed.",
    "explanationMarkdown": "A predictable routine can reduce stimulation and help the child transition toward sleep.",
    "interventionBlocks": [
      {
        "title": "20-minute routine",
        "contentMarkdown": "| Time | Step |\\n| --- | --- |\\n| 20 min before bed | Dim lights |\\n| 10 min before bed | Quiet reading |"
      }
    ],
    "star": false,
    "checkInDays": [],
    "lastCheckIn": null,
    "sourceConversationId": "uuid-or-null",
    "sourceMessageId": "persisted-assistant-message-uuid-or-null",
    "sourceTime": "2026-05-11T10:00:00.000Z",
    "createdAt": "2026-05-11T10:00:02.000Z",
    "updatedAt": "2026-05-11T10:00:02.000Z"
  }
}
```

Duplicate response 409:

```json
{
  "error": "This suggestion already looks saved.",
  "duplicate": {
    "matchedItemId": "uuid",
    "reason": "same source message"
  }
}
```

Implementation notes:

- Auth and get-or-create-user must follow existing `/api/plan` pattern.
- Free quota uses the existing Growth Plan limit: until membership-billing lands, all users are treated as Free and capped at 5 items.
- The confirm endpoint can share validation and insertion logic with `POST /api/plan`, but the original endpoint should remain valid for manual creation.

### 9.4 DB Schema Extension

Recommendation: extend `plan_items` with nullable provenance columns.

```sql
ALTER TABLE plan_items
  ADD COLUMN IF NOT EXISTS source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (source_type IN ('manual', 'chat'));

CREATE INDEX IF NOT EXISTS idx_plan_items_user_source_message
  ON plan_items(user_id, source_message_id)
  WHERE source_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_plan_items_user_source_conversation
  ON plan_items(user_id, source_conversation_id)
  WHERE source_conversation_id IS NOT NULL;
```

Structured content extension:

```sql
ALTER TABLE plan_items
  ADD COLUMN IF NOT EXISTS strategy_summary TEXT,
  ADD COLUMN IF NOT EXISTS explanation_markdown TEXT,
  ADD COLUMN IF NOT EXISTS intervention_blocks JSONB NOT NULL DEFAULT '[]'::jsonb;
```

Rationale:

- `sourceConversationId` helps the user return to the chat that produced the strategy.
- `sourceMessageId` enables deterministic duplicate prevention when a persisted assistant message id is available.
- `sourceTime` preserves useful provenance even if message id is missing, temporary, deleted, or generated in guest state before login.
- Client temporary ids such as `ai-${Date.now()}` must not be stored in `source_message_id`; if the persisted UUID is unavailable, store `source_message_id = NULL` and rely on `source_time` plus normalized-content duplicate checks.
- Columns are nullable and expand-only, so the migration is backward compatible with existing plan items and manual creation.
- `source_type` keeps manual items distinguishable without forcing source fields.

Required type updates:

- Add `sourceConversationId?: string`, `sourceTime?: string`, and `sourceType?: 'manual' | 'chat'` to `ActionPlanItem`.
- Add `strategySummary?: string`, `explanationMarkdown?: string`, and `interventionBlocks?: { title?: string; contentMarkdown: string }[]` to `ActionPlanItem`.
- Keep the existing `strategy` field as a compatibility/card-summary field.

Persisted assistant message id issue:

- The best implementation is to make chat persistence return assistant `messages.id` in the final SSE `done` payload.
- If that is not included in the first implementation, `sourceMessageId` may be omitted and duplicate detection falls back to `sourceConversationId + normalized strategy`.

### 9.5 Prompt / Extraction JSON Schema

Extraction instruction:

```text
You extract one actionable Growth Plan item from an assistant message for a parent of a child with ADHD.
Return JSON only.
Extract only strategies that the parent can choose to save and try.
Preserve useful GitHub-Flavored Markdown tables, lists, and headings inside interventionBlocks[].contentMarkdown.
Do not output HTML.
Do not create diagnosis, medication dosage, emergency, legal, or professional-treatment instructions.
If content is diagnosis/IEP/legal-adjacent but can be turned into a safe parent action, extract the parent action instead of rejecting it.
If there is no concrete strategy, return hasActionableStrategy=false.
Use only these categories for saveable strategies: emotion, learning, exercise, nutrition, social, sleep, school.
Use category=none when hasActionableStrategy=false.
Keep challenge and strategy factual, specific, and editable by the user.
Do not include private identifiers unless the user already wrote them and they are essential; prefer generic wording.
```

JSON schema:

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "hasActionableStrategy",
    "category",
    "painPoint",
    "explanationMarkdown",
    "interventionBlocks",
    "strategySummary",
    "confidence",
    "safetyFlags"
  ],
  "properties": {
    "hasActionableStrategy": { "type": "boolean" },
    "category": {
      "type": "string",
      "enum": ["none", "emotion", "learning", "exercise", "nutrition", "social", "sleep", "school"]
    },
    "painPoint": {
      "type": "string",
      "maxLength": 500
    },
    "explanationMarkdown": {
      "type": "string",
      "maxLength": 2000
    },
    "interventionBlocks": {
      "type": "array",
      "maxItems": 8,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["contentMarkdown"],
        "properties": {
          "title": { "type": "string", "maxLength": 120 },
          "contentMarkdown": { "type": "string", "maxLength": 3000 }
        }
      }
    },
    "strategySummary": {
      "type": "string",
      "maxLength": 500
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "safetyFlags": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["none", "medical", "diagnosis", "medication", "crisis", "legal", "not_child_related", "too_vague"]
      }
    }
  }
}
```

Server validation:

- Reject when `hasActionableStrategy=false`.
- Reject when `confidence < 0.55`.
- Reject only hard-blocked content: concrete medication dosage/change instructions, `crisis`, emergency response instructions, or content that cannot be reframed as a parent-controlled action.
- For `medical`, `diagnosis`, `medication`, or `legal` flags, allow preview when the extracted strategy is a mild parent action rather than a conclusion, prescription, or directive; show confirm-modal caution copy instead of failing closed.
- Validate category against `PLAN_CATEGORIES`, not only the model output; `category="none"` is valid only when rejecting a non-actionable extraction and must never be saved.
- Trim text; reject empty or too-long fields after trimming.
- Do not trust the LLM to decide duplicates; compute duplicate status server-side.

### 9.6 Duplicate Prevention

Duplicate checks run before returning preview and again before insert:

1. Same-source exact match:
   - If `sourceMessageId` is present and another item exists for the same `user_id + source_message_id`, treat as duplicate.
2. Same-conversation normalized match:
   - Normalize `painPoint + strategy`: lowercase, trim, collapse whitespace, remove punctuation.
   - If a same-user item from the same `sourceConversationId` has normalized similarity above the implementation threshold, return duplicate.
3. Cross-conversation near match:
   - For the same user and category, compare normalized `strategy`; if near-identical, warn in the confirm modal.
   - Do not block if the user chooses `duplicateOverride=true`, except for same-source exact duplicates.

No destructive merge in MVP:

- Do not auto-merge into existing items.
- Do not overwrite starred items.
- Do not delete duplicates automatically.

### 9.7 Failure And Degradation Strategy

- No actionable strategy: do not open the modal; show a small inline message: "I could not find a concrete strategy to save from this reply."
- Extraction provider timeout or malformed JSON: show a retry affordance; do not save anything.
- Hard-blocked safety content: show "This suggestion cannot be saved as a plan item. Please use professional or emergency support when needed."
- Gray-zone diagnosis/IEP/legal-adjacent content: allow the confirm modal when it is framed as a parent action, and show a small caution that Qimi is organizing a next step rather than giving medical or legal advice.
- Duplicate exact match: change button to `Already saved`; offer link/open action to `/plan` if available.
- Duplicate near match: show warning in modal and allow user to edit before saving.
- Quota exceeded: return existing 403 free-limit behavior and preserve the draft in the modal.
- Missing persisted source ids: allow save with `sourceTime` and `source_type='chat'`; do not block user value on implementation metadata.
- Chat save API down while chat works: chat remains unaffected; show non-blocking error only below the clicked message.

### 9.8 Privacy And Safety Boundaries

- User confirmation is mandatory. The app must not auto-save suggested interventions from AI text.
- Only save the extracted `category`, `painPoint`, `strategySummary`, `explanationMarkdown`, `interventionBlocks`, and minimal provenance fields; do not copy the full chat transcript into `plan_items`.
- Do not save crisis, self-harm, abuse, concrete medication dosage/change, emergency, or direct professional-treatment instructions as Growth Plan items.
- Medication-adjacent content can be saved only when converted into a parent-controlled action, for example tracking dose timing, benefits, side effects, sleep, appetite, mood, and questions to discuss with the prescribing doctor.
- Diagnosis/IEP/legal-adjacent content can be saved only when converted into a mild parent action, for example tracking observations, preparing questions, requesting a school meeting, or discussing concerns with a qualified professional.
- Keep the existing medical disclaimer on `/plan`; add confirm-modal microcopy: "Qimi can help organize ideas, but this is not medical advice."
- Source metadata is user-owned and scoped by existing auth and RLS. API queries must always filter by `user_id`.
- Do not expose source conversation links unless the current user owns the conversation.
- Do not send attachments or full conversation history to extraction unless required; first implementation should send the assistant message and one preceding user message at most.

### 9.9 Acceptance Criteria

Technical acceptance:

- [ ] `POST /api/plan/extract-from-chat` never inserts into `plan_items`.
- [ ] `POST /api/plan/save-from-chat` inserts only after authenticated user clicks `Save to Growth Plan`; no background auto-save exists.
- [ ] Free-user limit remains 5 total Growth Plan items, shared with manual creation.
- [ ] Source metadata migration is expand-only and passes local Supabase reset.
- [ ] Structured content migration is expand-only and preserves old `strategy`-only items.
- [ ] Same `sourceMessageId` cannot be saved twice for the same user.
- [ ] User A cannot save, preview, update, or inspect User B's conversation/message/item.
- [ ] Malformed extraction JSON, hard-blocked unsafe flags, and low confidence fail closed; gray-zone diagnosis/IEP/legal-adjacent content is allowed only as a parent-controlled action with caution copy.
- [ ] `npx tsc --noEmit` and `npm run build` pass for touched files.

Functional acceptance plan:

- [ ] Ask chat for a concrete bedtime routine; after stream completion, `Save to Growth Plan` appears.
- [ ] Click save; button shows `Saving...`, then `Saved to Growth Plan` without opening an edit modal.
- [ ] Saved item appears on `/plan` with category, summary, explanation, and Markdown-rendered intervention blocks.
- [ ] Ask for a strategy that includes a Markdown table; the table is preserved in `/plan`.
- [ ] Return to the same chat message; button shows saved/already-saved state.
- [ ] Click save again from the same message; duplicate is blocked or shown as already saved.
- [ ] With 5 existing items, saving from chat returns the same free-limit failure as manual create.
- [ ] Ask for generic ADHD explanation; no save button appears.
- [ ] Ask for medication dosage or crisis advice; no saveable plan item is produced.
- [ ] Ask diagnosis/IEP-adjacent questions with a concrete parent action; a cautious editable draft can be saved.

Human acceptance:

- User verifies copy, modal editing, duplicate warning, and `/plan` item appearance in local Supabase.

Merge/carry-forward decision:

- Merge only after technical acceptance passes, functional plan is executed, and human acceptance has zero P0/P1 issues.
- Carry forward lower-priority polish such as "link back to exact chat message scroll position" if source metadata and save behavior pass.

### 9.10 Task Split

Implementation mode: linear. Chat save touches chat UI, LLM extraction, Growth Plan API, and schema; do not parallelize unless write scopes are separated and current branch is stable.

1. T010: Expand schema for source metadata
   - File: new migration under `supabase/migrations/`
   - Add nullable source columns and indexes from Section 9.4.
   - Verify: `npm run supabase:reset` locally.

2. T011: Update plan types and mapping
   - Files: `types/plan.ts`, `pages/api/plan/index.ts`, `pages/api/plan/checkin.ts` if needed.
   - Add source fields to mapped responses without breaking manual create.
   - Verify: `npx tsc --noEmit`, `npm run build`.

3. T012: Add extraction API
   - File: `pages/api/plan/extract-from-chat.ts`
   - Auth, source ownership check when `conversationId` is present, structured extraction, validation, duplicate preview.
   - Verify malformed JSON, no-actionable, unsafe, and happy path.

4. T013: Add confirmed save API
   - File: `pages/api/plan/save-from-chat.ts`
   - Reuse validation, enforce quota, enforce duplicate checks, insert with `source_type='chat'`.
   - Verify 401, 403 quota, 409 duplicate, 201 success.

5. T014: Return persisted assistant message id from chat stream
   - Files: `pages/api/chat/stream.ts`, `services/chat.ts`, `stores/chatStore.ts`, `types/api.ts` if needed.
   - Include persisted assistant `messageId` in final stream metadata when available.
   - If this proves invasive, defer and rely on fallback metadata.

6. T015: Add chat message save UI
   - Files: `components/Chat/ChatMessage.tsx`, `stores/chatStore.ts`, possibly a new `components/GrowthPlan/SaveFromChatModal.tsx`.
   - Show button only on eligible completed assistant messages; implement modal edit/confirm flow.
   - Verify mobile layout and keyboard/focus behavior.

7. T016: Add tests and local smoke
   - Files: existing or new tests depending on repo test setup.
   - Cover extraction validation, duplicate checks, quota, auth, and UI smoke manually.

### 9.11 AQS Self-Review

Security:

- [PASS] Auth required for extraction and saving; guests must sign in before preview/save.
- [PASS] Authorization must check `user_id` ownership for plan items and source conversations.
- [PASS] RLS remains scoped by `auth.uid() = user_id`.
- [PASS] Inputs are validated server-side; LLM output is never trusted without schema and enum checks.
- [PASS] Errors use `{ error: "..." }` and do not expose provider output or stack traces.

Architecture:

- [PASS] Uses existing `/api/plan/*`, `plan_items`, `PLAN_CATEGORIES`, and chat message UI.
- [PASS] Preview and save are separate endpoints, preserving mandatory user confirmation.
- [PASS] No new global route registry or app shell changes.
- [PASS] Failure of chat-save does not block chat.

Engineering quality:

- [PASS] Task list is linear with machine gate before human gate.
- [PASS] Duplicate checks are deterministic enough for MVP and do not depend on LLM judgment.
- [PASS] Structured extraction uses schema validation, fail-closed handling for hard-blocked content, and caution handling for gray-zone parent actions.
- [PASS] Adds tests around auth, quota, duplicate, malformed extraction, and unsafe content.

Technical stack compliance:

- [PASS] Uses Next.js API routes and Supabase migrations already used by this repo.
- [PASS] Schema change is expand-only; no destructive DROP/RENAME.
- [PASS] Local Supabase remains the acceptance environment.

Reverse checks:

- [PASS] No background automatic saving, no PDF implementation in this slice, no reminders, no complex generator.
- [PASS] No new datastore or subscription source.
- [PASS] MVD: this is added to the existing Growth Plan spec because it is a sub-slice of the same module and shares route/API/schema contracts.
