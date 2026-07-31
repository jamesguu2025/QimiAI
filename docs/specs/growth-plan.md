# Module Spec: Growth Plan

> Status: APPROVED — 2026-02-22 | Self-reviewed: 2026-03-14 | Second-pass reviewed: 2026-03-14 | Implementation status: Implemented and human-accepted on current baseline | Amended: 2026-05-11 (Chat Save addendum) | Status aligned: 2026-05-22
> Module: growth-plan
> Routes: `/plan`
> Branch: historical source branch `feature/growth-plan`; accepted implementation now lives on the current baseline.
> SOP v2.4 status: Current accepted baseline includes the manual plan flow and Chat Save addendum; future Growth Plan work must refresh current-code facts with line evidence.

> **MVP quota amendment — 2026-07-25:** Earlier five-item Free-tier limits in this historical spec are superseded for the no-billing MVP. Saving, viewing, editing, starring, checking in, and deleting Saved/Composed Plans do not call the model and therefore do not consume an AI allowance or a five-item product quota. Cost-bearing AI plan actions—Generate, Regenerate, and AI-assisted Save from Chat—share one authenticated allowance of 10 user-initiated operations per Asia/Shanghai week. Internal draft/audit retries within one user action count as that single operation. Supabase atomic counters are authoritative; the UI only displays remaining usage. Guest users must register before saving or generating plans.

---

## 0. Planning Baseline

This spec was re-checked against:

- The current repo structure and scripts in `/Users/jamesguu/qimi-ai-website/qimi-ai-website`
- The canonical Layer 1 architecture in `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/system-architecture.md`
- The cross-platform blueprint in `/Users/jamesguu/WeChatProjects/adhdhelper-cursor/docs/项目技术蓝图.md`
- Existing shared type definitions in `/Users/jamesguu/qimi-ai-website/qimi-ai-website/types/plan.ts`
- Membership and billing are not implemented yet; there is no current `pages/api/user/subscription.ts` route and no `users.subscription_tier` column in the local initial schema.

### Current Implementation Snapshot

- Route `/plan` is implemented on the current accepted baseline.
- `pages/api/plan/*` includes manual plan management plus chat decision/extract/save paths.
- `components/GrowthPlan/*` and shared Growth Plan types are part of the current contract baseline.

### MVP Boundary

- This module covers manual CRUD plus daily check-in for plan items.
- The accepted MVP baseline also includes Chat Save to Growth Plan through the addendum in Section 9.
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

- Automatic background plan generation from every chat message. The explicit user-confirmed Chat Save path is in scope and governed by Section 9.
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

---

## 10. Evidence-Grounded Plan Builder Amendment (2026-07-22)

> Status: implemented and machine-accepted on 2026-07-22. Human acceptance is still required before PDF export or commit.
> Scope: add a `Generate Plan` entry on `/plan`, generate one editable evidence-shaped draft, and save only after explicit user confirmation. PDF export is deliberately deferred until this slice passes human acceptance.

### 10.1 Current-State Evidence And Scope

Internal facts were verified against the current branch rather than inferred:

- `/plan` loads and creates user-scoped plan items through `/api/plan` (`pages/plan/index.tsx:50-79`, `pages/plan/index.tsx:96-130`). The implemented page now exposes both `Generate Plan` and `Add Plan Item`, with mutually exclusive builder/manual edit state (`pages/plan/index.tsx:253-320`).
- A plan item already supports a card summary, Markdown explanation, and structured intervention blocks (`types/plan.ts:34-59`); the existing card renders those blocks with GFM (`components/GrowthPlan/PlanItemCard.tsx:14-18`, `components/GrowthPlan/PlanItemCard.tsx:73-102`, `components/GrowthPlan/PlanItemCard.tsx:120-124`).
- The create API already enforces authentication, user scoping, the five-item free limit, and structured fields (`pages/api/plan/index.ts:67-112`, `pages/api/plan/index.ts:146-200`).
- The repository already has bounded payload/rate-limit helpers (`lib/rate-limit.ts:17-69`) and an authenticated, timeout-bounded DeepSeek structured-extraction pattern (`pages/api/plan/extract-from-chat.ts:83-119`, `pages/api/plan/extract-from-chat.ts:195-270`, `pages/api/plan/extract-from-chat.ts:273-354`).

Historical decision at the time of this slice: the minimum design added no table or migration and stored a generated plan as one existing `plan_items` row. This decision is superseded by Section 10.25 after real use showed that a cross-topic composed plan cannot truthfully belong to one source category and should not re-enter its own source library.

### 10.2 Evidence Summary

The product method is a synthesis of established behavioral and organizational supports, not a claim that AI itself is a validated ADHD treatment:

1. Barkley frames ADHD executive-function difficulty as a performance problem and recommends externalizing information, time, and motivation at the point of performance, reducing time gaps, using physical cues, minimizing distractions, and breaking long tasks into short steps with immediate feedback or incentives. Source: [Russell A. Barkley, ADHD, Executive Functioning, and Self-Regulation](https://www.russellbarkley.org/factsheets/ADHD_EF_and_SR.pdf).
2. CDC identifies parent training in behavior management, behavioral classroom management, and organizational skills training as behavioral supports; it also recommends routines, brief clear directions, task breakdown, goals/rewards, monitoring, and adjustment. Sources: [CDC — Treatment of ADHD](https://www.cdc.gov/adhd/treatment/index.html), [CDC — ADHD in the Classroom](https://www.cdc.gov/adhd/treatment/classroom.html), [CDC — Parent Training in Behavior Management](https://www.cdc.gov/adhd/treatment/behavior-therapy.html).
3. AAP parent guidance recommends specific doable goals, consistent positive reinforcement, small reachable steps, charts/checklists, brief directions, and teacher collaboration. Source: [HealthyChildren.org — Behavior Therapy for Children with ADHD](https://www.healthychildren.org/English/health-issues/conditions/adhd/Pages/Behavior-Therapy-Parent-Training.aspx).
4. CHOP guidance recommends a limited number of concrete, developmentally appropriate, positively worded target behaviors; arranging antecedents for success; immediate motivating rewards; gradual addition of steps; and home-school consistency. Source: [CHOP — How is ADHD treated?](https://www.chop.edu/sites/default/files/adhd-4-how-is-adhd-treated.pdf).
5. Daily report cards have supportive but bounded evidence: a meta-analysis covered seven group-design studies (272 participants; three randomized), and a separate randomized trial evaluated behavioral parent training plus a daily report card for homework in children aged 5–12. These sources support offering a simple school-feedback mode, not promising universal effectiveness. Sources: [Iznardo et al., 2017 meta-analysis](https://pubmed.ncbi.nlm.nih.gov/29135352/), [Merrill et al., 2017 randomized trial](https://pubmed.ncbi.nlm.nih.gov/27618639/).
6. ADHD coaching can inform collaborative language and stepwise reflection, but CHADD notes that coaching lacks substantive science-based outcome evidence. It may shape tone, not serve as the clinical basis of this feature. Sources: [CHADD — Coaching](https://chadd.org/about-adhd/coaching/), [CHADD — Parent Training or Coaching?](https://chadd.org/adhd-weekly/do-i-need-parent-training-or-coaching/).

Evidence boundaries:

- External clinical/educational evidence, stable: observable targets, environmental/antecedent support, short steps, immediate positive reinforcement, monitoring, and home-school coordination.
- External evidence, bounded: daily report card as an optional school implementation; do not describe it as guaranteed or appropriate for every child.
- External evidence, weak: coaching-style reflection and collaboration; use only as interaction tone.
- Internal product choice, provisional: one draft at a time, input fields, a default seven-day first check-in, field limits, layout, and wording. Seven days is a usability default, not a clinical standard; the user may change it.

### 10.3 User Story And Functional Contract

As a signed-in parent, I can select `Generate Plan`, describe one recurring situation, and receive one focused, editable draft that helps me try and observe a small change without presenting the output as diagnosis or treatment.

Required generation inputs:

- `category`: one existing `PlanCategory`.
- `setting`: `home` or `school`.
- `challenge`: the one situation to improve, plain text.
- `whenAndWhere`: where/when the difficulty occurs.
- `currentPattern`: what can be observed now; optional but encouraged.
- `whatHelps`: strengths, interests, supports, or past successes; optional.
- `reviewInDays`: 3–14, default 7 and explicitly labeled as editable.

Generated draft requirements:

- One short, non-blaming challenge title.
- One positively worded and observable target behavior; at most two only when inseparable.
- One concise strategy summary.
- A short explanation using tentative wording (`may help`, not efficacy promises).
- Three to five short child/parent actions, sequenced and feasible in the stated setting.
- One antecedent/environment block that externalizes cues and reduces friction.
- One immediate, specific, non-punitive reinforcement or feedback block. Do not require food, money, or removal of earned rewards.
- One tracking block with a simple observable measure, named observer, and the user-selected first review interval.
- For `school`, an optional brief home-school feedback/check-in format; no IEP/legal conclusions.

The draft is never saved automatically. The preview exposes editable category, challenge, summary, explanation, and every block. `Save Plan` uses the existing `POST /api/plan` only after explicit confirmation.

### 10.4 UX And State Model

Entry:

- Add a secondary `Generate Plan` button next to `Add Plan Item` on `/plan`.
- When the five-item free quota is reached, both creation actions remain disabled under the existing upgrade state.
- Opening generation hides the manual form/edit form to avoid competing edit surfaces.

Builder states:

1. `input`: focused form with the seven fields above and concise helper copy.
2. `generating`: disable duplicate submit, show `Building your draft...`, preserve entered values.
3. `preview`: render editable structured fields and `Back`, `Regenerate`, and `Save Plan` actions.
4. `saving`: disable mutations and show `Saving...`.
5. `success`: close builder, insert returned item into local state, update counts, and open its category.
6. `error`: preserve input/draft and show a generic retryable error; provider details remain server-only.

Accessibility:

- Use a normal inline card/form rather than a modal for the MVP, so keyboard order and mobile scrolling remain predictable.
- Every control has a label; validation text is adjacent; loading buttons expose disabled state; errors use `role="alert"`.
- User-entered and generated Markdown is rendered only through the existing `ReactMarkdown + remarkGfm` path; no raw HTML.

### 10.5 API Contract

`POST /api/plan/generate`

Authentication: required through the existing NextAuth server-session pattern.

Request:

```json
{
  "category": "learning",
  "setting": "home",
  "challenge": "Starting homework after dinner",
  "whenAndWhere": "Weeknights at the kitchen table",
  "currentPattern": "Needs repeated prompts and leaves the table",
  "whatHelps": "Likes choosing the first subject and visible timers",
  "reviewInDays": 7
}
```

Success `200`:

```json
{
  "draft": {
    "category": "learning",
    "painPoint": "Starting homework after dinner",
    "strategy": "Use one visible start cue and a short first step.",
    "strategySummary": "Use one visible start cue and a short first step.",
    "explanationMarkdown": "External cues and a smaller first action may reduce the gap between intention and starting.",
    "interventionBlocks": [
      { "title": "Target", "contentMarkdown": "..." },
      { "title": "Set up for success", "contentMarkdown": "..." },
      { "title": "Steps", "contentMarkdown": "..." },
      { "title": "Immediate feedback", "contentMarkdown": "..." },
      { "title": "Track and review", "contentMarkdown": "..." }
    ]
  }
}
```

Server rules:

- Accept only `POST`; return 405 otherwise.
- Reject unauthenticated requests with 401.
- Reject payloads over 12 KiB; rate-limit each signed-in user to 10 requests per 10 minutes.
- Validate category/setting, integer review interval, required trimmed strings, and per-field length before calling the provider.
- Call the configured DeepSeek non-streaming endpoint once with a 30-second timeout and low temperature.
- Parse JSON after stripping optional fences. Validate every generated field again: valid category, non-empty bounded text, one to six blocks, bounded title/content, and blocked safety content.
- Hard-block crisis/emergency instructions and concrete medication dose/start/stop/change directives. Diagnosis, medication, school accommodation, or legal-adjacent input may produce only parent-controlled actions such as observation, logging, questions for a qualified clinician, or requesting a school conversation.
- Never include provider response text, stack traces, API keys, diagnosis, or medication conclusions in error responses.
- `POST /api/plan/generate` performs no database insert. Saving continues through the existing quota-enforcing `POST /api/plan`.

No schema change is required. `source_type` remains `manual` because this plan originates from a parent-guided builder rather than a chat message; analytics may distinguish it with a client/server event source of `generated` in a later instrumentation slice.

### 10.6 Prompt Contract

The system prompt must state:

- This is a planning aid for a parent, not diagnosis, medical advice, psychotherapy, or a substitute for a clinician/teacher.
- Use only details in the request; do not invent the child's age, diagnosis, school policy, preferences, rewards, or family capacity.
- Focus on one situation and one observable target; use non-blaming, developmentally neutral language.
- Externalize the cue, time, steps, and feedback at the point of performance.
- Prefer antecedent supports and positive reinforcement over punishment or delayed consequences.
- Make steps small, concrete, and reversible; name who does what and when.
- Include a minimal tracker and the supplied review interval; describe review as an experiment to adjust, not proof of treatment success.
- School output may suggest a brief teacher-parent check-in or daily report format, but must not make legal/IEP determinations.
- Return strict JSON only, conforming to the response shape in Section 10.5.

### 10.7 Alternatives And ADR-Lite

Alternatives:

| Option | Benefit | Cost/Risk | Decision |
|---|---|---|---|
| A. Guided intake → editable AI draft → confirmed save | Uses relevant context while retaining user control; can enforce the evidence-shaped structure | More interaction and one provider call | Adopt |
| B. One-click plan from account/chat history | Lowest effort | Hidden assumptions, excess data disclosure, vague targets, and no meaningful consent boundary | Reject for MVP |
| C. Static template only | Deterministic and cheapest | Cannot adapt steps, cues, or tracking to the family's situation | Retain as possible provider-failure fallback later, not in this slice |
| D. Do nothing; manual item only | No new technical risk | Leaves parents to translate broad advice into executable steps | Reject because this is the requested MVP value gap |

Decisions:

| ID | Decision | Evidence layer | Status / reversal trigger |
|---|---|---|---|
| ADR-GP-10-1 | Generate one focused plan with one observable target. | External/stable: Barkley, CDC, AAP, CHOP | Accepted; revisit only if usability evidence shows users need linked subplans. |
| ADR-GP-10-2 | Use guided context fields before generation. | External/stable method principles + internal/provisional UI choice | Accepted; simplify fields if human testing shows abandonment. |
| ADR-GP-10-3 | Require editable preview and explicit save. | Internal safety/privacy rule; consistent with existing chat-save boundary | Accepted; no auto-save. |
| ADR-GP-10-4 | Encode cues, short steps, immediate feedback, and tracking as named blocks. | External/stable, with DRC evidence bounded | Accepted; school feedback remains optional and non-legal. |
| ADR-GP-10-5 | Store one generated plan in the existing structured item model; no migration. | Internal/stable current-code evidence | Superseded by Section 10.25 after cross-topic save behavior was human-tested. |
| ADR-GP-10-6 | Default first review to seven days but allow 3–14 days. | Internal/provisional usability choice | Accepted as copy-labeled default, not a clinical claim; change after user testing. |
| ADR-GP-10-7 | Defer PDF until the builder passes human acceptance. | Internal delivery-gate choice | Accepted; begin PDF only after explicit user approval. |

### 10.8 Prior Art / Search Ledger

Accessed at: `2026-07-22`.

| Query / purpose | Source | source_type | Claim supported | retrieval_log_ref |
|---|---|---|---|---|
| Russell Barkley ADHD executive function externalize time motivation point of performance | [Barkley factsheet](https://www.russellbarkley.org/factsheets/ADHD_EF_and_SR.pdf) | First-party expert educational document | External cues/time/motivation, shorter steps, immediate consequences | Web research trace, 2026-07-22 |
| CDC ADHD treatment parent training classroom organizational skills current | [CDC treatment](https://www.cdc.gov/adhd/treatment/index.html) | Government clinical guidance | Parent/classroom/organizational supports; monitor and adjust | Web research trace, 2026-07-22 |
| CDC ADHD classroom positive feedback short assignments daily report card | [CDC classroom](https://www.cdc.gov/adhd/treatment/classroom.html) | Government clinical/education guidance | Positive feedback, clear work, breaks, lower distraction, collaboration | Web research trace, 2026-07-22 |
| CDC parent training behavior management reinforcement structure monitoring | [CDC behavior therapy](https://www.cdc.gov/adhd/treatment/behavior-therapy.html) | Government clinical guidance | Reinforcement, structure, practice, monitoring, flexible adjustment | Web research trace, 2026-07-22 |
| AAP parent training ADHD specific goals rewards checklist instructions | [HealthyChildren](https://www.healthychildren.org/English/health-issues/conditions/adhd/Pages/Behavior-Therapy-Parent-Training.aspx) | Professional pediatric guidance | Doable goals, reinforcement, small steps, checklists, teacher collaboration | Web research trace, 2026-07-22 |
| CHOP ADHD evidence based target behaviors antecedents reward home school note | [CHOP PDF](https://www.chop.edu/sites/default/files/adhd-4-how-is-adhd-treated.pdf) | Pediatric hospital guidance | Concrete positive targets, antecedents, immediate reward, progressive steps | Web research trace, 2026-07-22 |
| daily behavior report card ADHD meta-analysis | [PubMed meta-analysis](https://pubmed.ncbi.nlm.nih.gov/29135352/) | Peer-reviewed systematic review/meta-analysis abstract | Bounded support for school daily report cards | Web research trace, 2026-07-22 |
| ADHD homework parent training daily report card randomized trial | [PubMed RCT](https://pubmed.ncbi.nlm.nih.gov/27618639/) | Peer-reviewed randomized trial abstract | Behavioral parent training plus DRC for homework | Web research trace, 2026-07-22 |
| CHADD ADHD coaching evidence goal planning | [CHADD coaching](https://chadd.org/about-adhd/coaching/), [CHADD comparison](https://chadd.org/adhd-weekly/do-i-need-parent-training-or-coaching/) | Advocacy/education organization | Coaching vocabulary; explicit evidence limitation | Web research trace, 2026-07-22 |

Link check result: all listed URLs were opened or returned an accessible search/abstract record during the research pass. No inaccessible source is used for a decisive claim.

### 10.9 Acceptance Criteria And Delivery Gates

Technical acceptance:

- [ ] Generate endpoint returns 401 without a session, 405 for non-POST, 400 for invalid fields/oversize payload, 429 after the limit, 502 for provider/invalid-output failure, and 200 for a valid draft.
- [ ] Generate endpoint never inserts or updates `plan_items`.
- [ ] Prompt and deterministic validation block crisis content and concrete medication changes/doses.
- [ ] Generated draft contains bounded structured content and can be edited before save.
- [ ] Save uses existing `/api/plan` quota and user-scoping behavior; one draft creates one item.
- [ ] Existing manual create/edit, chat save, star, check-in, and delete behavior remain intact.
- [ ] Targeted validation script, `npx tsc --noEmit`, and `npm run build` pass.

Functional acceptance plan (local Supabase only):

- [ ] On `/plan`, `Generate Plan` is visible beside manual add when below quota.
- [ ] Submit a home homework-starting scenario; preview includes target, setup, steps, feedback, and tracking/review.
- [ ] Edit the generated summary and a block, save, refresh, and confirm edits persist.
- [ ] Submit a school scenario; output may include a brief teacher-parent check-in but no IEP/legal conclusion.
- [ ] Invalid/empty input stays on the form with field feedback.
- [ ] Provider failure keeps the user's input and offers retry.
- [ ] Double-submit cannot make duplicate provider/save requests.
- [ ] At five items both creation paths show the existing upgrade state, and API save still returns 403.
- [ ] Mobile width and keyboard tab order remain usable.

Human acceptance:

- The user tests wording, effort, plan usefulness, editability, and saved rendering locally.
- Any P0/P1 issue returns to evidence/design or implementation as appropriate. PDF work does not start until the user explicitly approves this gate.

PDF/final gate (deferred):

- After builder approval, design and implement PDF from the saved structured plan, visually verify it, rerun regression, request final acceptance, and commit only after approval.

### 10.10 Execution Tasks

Execution is linear because the helper contract feeds the API, which feeds the page component.

1. T017 — Plan-generation contract and validator
   - File: `lib/plan-generation.ts`
   - Input/output: normalize request, build prompt, parse and validate provider JSON into `CreatePlanItemRequest`-compatible draft.
   - Constraints: pure helpers, no database, no secret logging, bounded fields/blocks, deterministic safety checks.
   - Verify: targeted validation script covers valid, malformed, invalid input, and unsafe output.
   - Dependency: none.
2. T018 — Authenticated generation API
   - File: `pages/api/plan/generate.ts`
   - Input/output: Section 10.5 request and response.
   - Constraints: existing auth/provider/rate-limit patterns; one timeout-bounded provider call; no database mutation.
   - Verify: typecheck/build plus authenticated local smoke where provider configuration is available.
   - Dependency: T017.
3. T019 — Guided builder UI
   - File: `components/GrowthPlan/PlanGenerator.tsx`
   - Input/output: intake form → editable draft → confirmed `onSave` values.
   - Constraints: inline accessible form; preserve input on errors; no auto-save; no new dependency.
   - Verify: browser acceptance scenarios and typecheck.
   - Dependency: T017/T018.
4. T020 — `/plan` integration
   - File: `pages/plan/index.tsx`
   - Input/output: button/state integration and existing create callback with structured values.
   - Constraints: preserve manual form/edit behavior, quota, ordering, and stats.
   - Verify: manual and generated save local smoke.
   - Dependency: T019.
5. T021 — Targeted regression script
   - File: `scripts/validate-plan-generation.mjs`; add package script only if useful.
   - Input/output: executable assertions for pure request/output/safety validation.
   - Constraints: no production network/database; deterministic.
   - Verify: script exits zero, then run full machine gates.
   - Dependency: T017.

### 10.11 AQS / EBG Self-Detection

- [PASS] High-risk health-adjacent claims have multiple directly linked primary/government/professional/peer-reviewed sources; coaching is explicitly marked weak.
- [PASS] Stable evidence is separated from provisional product parameters; seven days is not represented as a clinical standard.
- [PASS] Current-code claims include direct file-and-line evidence; dynamic behavior is assigned an executable acceptance test.
- [PASS] Authentication, payload limits, rate limits, timeout, output validation, safe error handling, XSS boundary, and no-auto-save are explicit.
- [PASS] Existing route/data/layout patterns are reused; no migration, new datastore, feature flag, queue, RAG flow, or dependency is introduced.
- [PASS] Alternatives include guided generation, instant generation, static template, and do-nothing baseline.
- [PASS] Machine acceptance precedes functional/human acceptance; PDF and commit are gated on later user approval.
- [PASS] All cited external-practice statements have an adjacent verified link and are recorded in the Search Ledger.
- [PASS] MVD is satisfied by amending the existing Growth Plan spec and adding only a lifecycle review record.

Review record: `docs/reviews/growth-plan-generation-planning-2026-07-22.md`.

### 10.12 Implementation Gate Record (2026-07-22)

Implemented files:

- `lib/plan-generation.ts` — request normalization, prompt contract, output validation, and deterministic safety checks.
- `pages/api/plan/generate.ts` — authenticated, rate-limited, payload-bounded, timeout-bounded draft endpoint with no database write.
- `components/GrowthPlan/PlanGenerator.tsx` — guided input and editable confirmation UI.
- `pages/plan/index.tsx` — entry-button, mutually exclusive form state, and existing save integration.
- `scripts/validate-plan-generation.mjs` — deterministic contract/safety regression.

Machine and functional results:

- [PASS] `node --experimental-strip-types scripts/validate-plan-generation.mjs` — 12 assertions.
- [PASS] `npx tsc --noEmit`.
- [PASS] `npm run build`; `/api/plan/generate` is present in the Next route manifest.
- [PASS] Anonymous route smoke: `GET /api/plan/generate` returned 405 and anonymous `POST` returned 401.
- [PASS] Authenticated local browser smoke with local Supabase: generated a five-block homework-start plan, edited the summary, saved one item, and verified the edited summary plus all structured sections persisted.
- [PASS] 390 px viewport: `documentElement.scrollWidth` equaled `innerWidth`; `Generate Plan` remained present.
- [PASS] No browser console errors during the local happy path.
- [PENDING] Human wording/usefulness acceptance by the product owner.
- [BLOCKED BY GATE] PDF export and commit.

### 10.13 Human-Feedback Amendment — Saved Plan Composer (2026-07-22)

> This amendment supersedes the intake-first UX and request body in Sections 10.3–10.6. The evidence-shaped output structure remains valid. The first implementation failed human acceptance because it asked the user to restate a situation already discussed before the source plan was saved.

Corrected product model:

- `Saved Plans` are the source library.
- `Plan Builder` is a composer and visualizer, not a second intake interview and not a source of unrelated new interventions.
- Starred items are selected automatically on open, remain visibly starred, and may be deselected for a context-specific output.
- Other saved items may be selected manually; a user may also add bounded plan-only notes.
- Chat-saved items already preserve the extracted challenge, summary, explanation, structured blocks, and minimal provenance. Generation must use those saved fields; it must not ask a generic `describe the real situation` question again.
- If sources conflict or lack one essential implementation choice, the output must mark `Decide together` / `Not specified` rather than inventing a child preference, reward, diagnosis, schedule, or school policy. A later refinement may add one targeted disambiguation control, but no generic questionnaire returns.

Corrected page order:

1. Open a two-column composer.
2. Left column: starred and other saved sources, filters/selection, and `Add your own item`.
3. Right column: choose output type and see selected-source/theme summary.
4. Generate from the selected sources.
5. Default to a rendered visual preview; allow switching to editable fields.
6. Save the composed draft through the existing plan-item path for this acceptance slice. A dedicated compiled-plan document model is deferred until the PDF/storage lifecycle is approved.

Output types:

- `focused`: one primary target with an implementation table.
- `routine`: daily/weekly time-or-trigger sequence.
- `home_school`: two or three positively stated targets with a simple feedback/communication structure.

Corrected `POST /api/plan/generate` request:

```json
{
  "outputType": "routine",
  "planItemIds": ["user-owned-plan-item-uuid"],
  "manualItems": ["A parent-added idea for this composition only"]
}
```

Server behavior:

- Authenticate, resolve the current app user, and load every requested source from `plan_items` with both `id IN (...)` and `user_id = current user`.
- Reject an invalid UUID, more than 12 saved sources, more than 5 manual items, empty selection, missing/foreign source, oversize manual text, and oversize total source material.
- Preserve client selection order after the ownership query so starred-first composition remains deterministic.
- Send only the saved plan title/summary/explanation/structured blocks and bounded manual notes to the provider; do not load full conversation history in this slice.
- Provider may deduplicate, sequence, operationalize, and add the evidence-backed scaffolding fields. It may not introduce a new intervention unrelated to the selected sources.
- The primary category is deterministic from the first selected saved item; manual-only output uses `learning` as a neutral compatibility category until the user edits it.

Required visualization content:

- Plan purpose / primary focus.
- A GFM table appropriate to the output type. Default columns: `When / Trigger`, `Who`, `What to do`, `Cue / Setup`, `Immediate feedback`, `How to track`.
- Brief guidance explaining how to implement consistently without blame or punishment.
- Review/adjust section with an observable measure. No fixed duration is invented when sources do not contain one; use `Choose a review date`.
- Source summary listing the saved-plan titles/manual notes used. Do not fabricate academic citations inside the individualized plan.

Corrected UI states:

- `compose`: selected-source list and output-type control; no generic situation fields.
- `generating`: preserve selections and manual notes.
- `visual`: rendered Markdown/table preview is the default result.
- `edit`: editable title, summary, explanation, and block Markdown.
- `saving/error`: preserve the generated draft and surface the existing save/quota message.

Corrected acceptance additions:

- [ ] Opening the composer with starred items selects them without another click.
- [ ] A user can deselect a starred item, select an unstarred item, and add a plan-only manual note.
- [ ] No challenge/context/current-pattern questionnaire is present.
- [ ] Generate request contains IDs/manual notes rather than client-supplied saved-plan content.
- [ ] User A cannot compose from User B's item ID.
- [ ] Routine output renders a time/trigger-oriented table; focused and home-school outputs use their evidence-shaped structures.
- [ ] Visual preview is default; edit mode preserves user changes before save.
- [ ] Existing source items are not mutated or deleted by composition.
- [ ] PDF remains gated on human acceptance; first-class composed-plan persistence is implemented in Section 10.25.

### 10.14 Corrected Implementation Gate Record (2026-07-22)

- [PASS] Starred Saved Plans are selected automatically and remain user-dismissible.
- [PASS] Other Saved Plans and up to five plan-only manual items can be included.
- [PASS] The previous situation/context/current-pattern/review questionnaire has been removed from the UI and request contract.
- [PASS] The browser sends only source IDs/manual notes; the server reloads sources with `user_id` ownership filtering and rejects a missing/foreign ID.
- [PASS] Focused, routine, and home-school output controls are available without a separate wizard step.
- [PASS] Generated results default to rendered Markdown/GFM visualization and can switch to editable fields.
- [PASS] Prompt requires time/trigger, actor, action, cue/setup, immediate feedback, tracking, review, and source attribution; missing choices are labeled rather than invented.
- [PASS] English and Chinese crisis/concrete-medication directive patterns are covered by deterministic output validation.
- [PASS] Targeted script passed 15 assertions; `npx tsc --noEmit` and `npm run build` passed.
- [PASS] Authenticated local browser smoke: starred source auto-selected; manual note added; routine output generated a six-column time/trigger table; visual/edit toggles worked; edited composition saved; original source remained unchanged.
- [PASS] 390 px composer had no document-level horizontal overflow and no browser console errors.
- [PENDING] New human acceptance.
- [BLOCKED BY GATE] PDF export and commit. Dedicated composed-plan persistence is implemented in Section 10.25.

### 10.15 Human-Feedback Amendment — Composition Boundary And Visual Readability (2026-07-23)

The product owner accepted the Saved Plan composer model and clarified the boundary between reorganizing a plan and changing an intervention.

Generation boundary:

- `Generate Plan` may preserve, deduplicate, sequence, and visually reorganize selected Saved Plan content.
- It may add execution scaffolding such as a saved or explicitly unresolved trigger, actor, setup cue, non-punitive immediate feedback, and a minimal tracking method.
- It must not independently increase or decrease repetitions, sets, hold time, duration, frequency, difficulty, or reinforcement schedules.
- It must not infer pain from asymmetry, label one side as weak without a saved source saying so, prescribe extra work for one side, or introduce a different intervention.
- If a selected source already contains a progression or adjustment instruction, the composer may preserve it but must not extend it. Otherwise the review block says to discuss the observed pattern before changing the plan.
- Re-searching evidence and proposing a materially changed intervention belongs to a later review conversation and produces a user-confirmed new version; it is not part of this composition call.

Visual-preview requirements:

- Strengthen the hierarchy between plan identity, purpose, implementation, review, and sources.
- Use restrained category color, icons, section tones, and compact metadata to improve scanning without making clinical certainty look stronger.
- Keep all generated text available; visual treatment must not silently summarize away instructions.
- Make the main implementation table easier to scan with a distinct header, alternating rows, generous spacing, and horizontal containment on narrow screens.
- Visually distinguish `Review and adjust` from the daily implementation area so review guidance is not mistaken for an immediate instruction.

Tracking-model clarification for the later interactive-plan slice:

- The universal status is `completed`, `partly completed`, or `not done`.
- A structured reason is requested only for partial/non-completion, with optional notes.
- Outcome/response fields are plan-specific. Physical discomfort is not a universal field; behavior, learning, sleep, school, emotion, and physical plans require different observable measures.

### 10.16 Evidence Re-Audit — One Plan Model, Not Three Document Types (2026-07-23)

The product owner identified a lifecycle gap: Saved Plans are not classified as `focused`, `routine`, or `home_school` when saved, yet the composer asked the user to choose one of those output types later. The evidence review does not support presenting these as a standard professional taxonomy.

Re-audited common framework:

- Barkley: externalize time, cues, steps, and motivation at the point of performance; shorten the delay between action and feedback.
- CDC/AAP parent and classroom guidance: use specific achievable goals, brief clear instructions, predictable routines, positive reinforcement, charts/checklists, and regular family-school communication when relevant.
- IRIS behavior-support guidance: define observable/measurable behavior, consider what happens before and after it, document implementation, monitor both fidelity and outcome, and review the plan with the team rather than treating it as static.
- Pediatric home-program evidence: embed activities into family routines, provide clear training and professional guidance, account for time/motivation/support barriers, and maintain collaborative family-professional communication.

Product conclusion:

- `Focused`, `Daily / Weekly Routine`, and `Home–School Coordination` are withdrawn as generation-time document types. They were internal presentation concepts, not an evidence-defined classification.
- The composer generates one unified practical plan from the selected source material.
- The required core is: purpose, when/trigger, concrete action, actor/support/setup, immediate feedback, minimal tracking, review, and sources.
- Home-school communication appears only when supplied source material includes both settings; schedule information appears only when the sources contain it.
- Future timelines, weekly calendars, or home-school summaries are optional views of the same canonical plan, not separate generated plans. They remain out of scope until the canonical compiled-plan data model is approved.

Simplified request:

```json
{
  "planItemIds": ["user-owned-plan-item-uuid"],
  "manualItems": ["A parent-added idea for this composition only"]
}
```

Simplified visual table:

`When / Trigger | What to do | Support / Setup | Feedback / Track`

The actor must be named inside `What to do` or `Support / Setup`. This four-column format retains the common evidence-backed components while reducing horizontal and cognitive load.

### 10.17 Responsive Composer Correction (2026-07-23)

Human testing found that opening `Generate Plan` did not adapt correctly at intermediate viewport widths. Root cause: the application sidebar and the composer both switched to desktop layout at the same `lg` viewport breakpoint, even though the sidebar had already reduced the content container width.

Correction:

- Keep the composer single-column through laptop/intermediate widths and switch to two columns only at `xl`.
- Add `w-full min-w-0` boundaries to the page, composer, source cards, manual notes, selected-source chips, and preview container.
- Allow composer headings and status controls to wrap rather than force width.
- Make preview mode controls full-width on small screens.
- Keep the generated table inside its own bounded horizontal scroller and reduce the unified four-column table minimum width from 760px to 620px.
- Acceptance requires no document-level horizontal overflow at mobile, tablet, intermediate desktop-with-sidebar, or wide desktop widths.

### 10.18 Closed-World Source-Fidelity Contract (2026-07-23)

The product owner rejected case-specific negative rules such as “do not replace adult supervision with independent work” as the primary contract. That wording catches one observed failure but does not generalize to behavioral, learning, sleep, school, emotion, or other plans.

Canonical rule:

- `Generate Plan` is a closed-world transformation over the user-selected Saved Plans and manual composition notes.
- It may summarize, deduplicate, group, sequence source-backed actions, and format them for readability.
- It must not use general knowledge, professional convention, evidence, or plausibility to complete missing individualized facts.
- Every factual or operational statement must be traceable to an explicit source statement. Missing optional display fields are omitted; the generator does not fill them with placeholders, defaults, or a visible missing-fields section.
- The protected fact classes include actor, beneficiary, schedule, trigger, sequence dependency, quantity, duration, frequency, intensity, difficulty, equipment, environment, assistance, supervision, independence, choice, preference, cue, feedback, reward, consequence, tracking metric, outcome, symptom, risk, review interval, success criterion, progression, adjustment, role, setting, and intervention.
- A source technique instruction or observation cannot be promoted into a new daily tracker, outcome, target, or success criterion.
- The contract applies symmetrically: generation may neither add a support nor remove one, neither add independence nor remove independence, and neither strengthen nor weaken any other protected fact.

Defense in depth:

1. The generation prompt declares the sources to be a complete closed-world boundary and requires unsupported optional fields to be omitted.
2. The deterministic output validator requires a dynamic source-backed table containing `What to do`, plus `Plan sources`; it rejects empty optional columns and unsupported review placeholders.
3. Before a draft reaches the browser, a separate fail-closed source-fidelity audit compares the normalized Saved Plan sources with the candidate draft. A draft that adds, removes, strengthens, weakens, or repurposes a protected fact is rejected rather than shown or saved.
4. One bounded format retry and one bounded source-fidelity retry are permitted. Both regenerate from the original sources; neither repairs intervention facts locally. If either final validation fails, the endpoint remains fail-closed.
5. The audit returns no individualized issue text to the browser. Production logging contains counts and structural error codes only; local development may log audit issues for diagnosis.

This second pass is a launch-safety guard, not proof that model-based semantic verification is infallible. Human acceptance must still test varied plan domains and sparse-source cases.

### 10.19 Post-MVP Structured Tracking Deferral (2026-07-23)

The product owner approved the direction for per-action completion status, non-completion reasons, Dashboard entry, and progress visualization, but explicitly deferred implementation until after the MVP launch.

Deferred slice:

- Three mutually exclusive execution states: completed, partly completed, and not done.
- A separate no-opportunity/not-scheduled path excluded from the completion denominator.
- Structured barrier reason plus optional note for partial/non-completion.
- Compact `Today's plan` Dashboard surface linked to a dedicated plan detail/check-in route.
- Visual completion trends and recurring-barrier summaries with clear missing-data rules.
- Optional plan-specific outcome measures separated from daily implementation fidelity.
- A compiled-plan/step/check-in/version data model; no interactive controls are added to static Markdown without durable structured storage.

The full future scope, data-model questions, and AI-review boundary are recorded as `OPT-005` in `docs/optimization-backlog.md`. They are not MVP launch blockers and must not expand the current source-fidelity hardening slice.

### 10.20 Dynamic Source-Backed Columns (2026-07-23)

Human review confirmed that source fidelity alone is insufficient when the visual output repeats missing-value placeholders. In the foot-exercise case, all four rows displayed `Feedback: Not specified`, `Track: Not specified`, and repeated actor/measure placeholders. Those cells contained no actionable information and reduced space for the source-backed instructions.

Correction:

- The plan table uses the canonical column order `When / Trigger | What to do | Support / Setup | Feedback | Track`, but only `What to do` is universal.
- Every other column appears only when at least one selected source explicitly contains that type of information.
- Feedback and tracking are separate concepts and therefore separate optional columns; the static preview does not imitate the deferred interactive check-in UI.
- Empty optional columns are invalid. A partially applicable displayed column may use an em dash for individual rows, but a column containing no substantive source-backed value is removed.
- Missing actor, feedback, tracking, or review information is omitted rather than repeated per row. The final plan does not display a `Saved Plan gaps` block.
- `Review and adjust` appears only when a source contains a review date, method, measure, or adjustment instruction, and displays only those supported parts. It does not render `Measure: Not specified`.
- A deterministic presentation normalizer removes all-empty optional columns, splits the legacy combined `Feedback / Track` column, strips repeated missing-value placeholders, and moves legacy top-level gap/source arrays into visual blocks. It only removes or relocates existing provider text; it never supplies intervention content.

This preserves the closed-world boundary while avoiding a template that visually rewards empty fields.

### 10.21 Real-Path Generation Reliability Correction (2026-07-23)

Human testing reproduced `Could not build a safe visual plan` on the exact authenticated Saved Plan flow even though the earlier direct model fixture had passed. The earlier result was not valid end-to-end acceptance because it bypassed the saved-row lookup, API normalization, format validator, and source-fidelity audit used by the browser.

Root causes and correction:

- Provider output varied between equivalent table header spellings and occasionally returned incomplete review formatting. Header aliases, canonical column ordering, empty-cell handling, and unsupported review placeholders are now normalized deterministically before validation.
- A first format failure receives one schema-only retry. Final failure returns a format-specific message rather than incorrectly calling every failure a safety rejection.
- The semantic audit sometimes rejected valid `Saved Plan gaps`, exact source titles, or a source-stated trial/reassessment period. Its contract now explicitly classifies these transformations and checks source completeness as well as unsupported additions.
- A failed or unavailable first audit receives one fresh source-fidelity generation and re-audit. The endpoint still returns no candidate unless the final draft passes both structural and semantic checks.
- A deterministic source-coverage check independently requires all explicit numeric quantity/unit facts to remain present and requires a `Review and adjust` block whenever the selected material contains review/reassessment facts. This closes the observed audit false-negative where a valid draft silently dropped the 4-week reassessment.
- Generic review advice not present in the sources is removed deterministically and prohibited by the prompt.

Acceptance uses the authenticated browser flow with the same saved foot-exercise material, not a copied fixture. Three consecutive post-correction generations returned 200 and preserved the four source actions, their quantities/setup, the 4-week reassessment fact, dynamic columns, and exact source title. Targeted validation, TypeScript, diff checks, and production build also passed.

### 10.22 Non-Duplicative Support Presentation (2026-07-23)

Human review found that `Support / Setup` repeated phrases already present in `What to do` (for example, sitting with bare feet flat, holding a counter, and standing near a wall). The evidence supports preserving point-of-performance environmental and assistance conditions, but it does not require a fixed column with that label.

Correction:

- Each source fact appears in one best-fit display location.
- `What to do` contains the action, technique, dose, and any setup condition that cannot be separated safely.
- `Support / Setup` is optional and appears only when it adds independent posture, equipment, location, environmental, cue, assistance, or supervision information.
- When a setup clause is moved into the support column, it is removed from the action without changing the remaining action or dose.
- If every substantive support cell is already contained in its corresponding action, the deterministic table normalizer removes the entire support column.
- Numbered cross-references such as `Steps 1 and 2` are expanded to the exact action names already present in the table so the reader never has to count rows.
- When a `When / Trigger` column exists, compatible source timing phrases are consolidated there and are not repeated inside the action.
- Schedule context and cadence belong together in `When / Trigger`; for example, `During school breaks or holidays, at least 3 times per week`. `What to do` then contains only the named maintenance actions. The generator must not invent broader wording, but when a Saved Plan explicitly contains an additional compatible schedule such as `all weeks, even off weeks`, that fact must also remain in `When / Trigger`.
- A composite plan may combine user-selected Saved Plans from different categories. Source fidelity is evaluated against the complete selected set, not only the first category; every selected source and all of its explicit operational quantities must remain represented.
- Complex composites run deterministic quantity/review coverage before semantic auditing. Incomplete candidates receive up to two bounded, issue-directed repairs. The semantic audit cannot reject a source merely for having a different category when that exact title is present in the selected set and the candidate's Plan sources block.
- Every newly created plan has a concise saved title of at most 60 characters. Generated plans create a short source-backed noun phrase instead of copying a long Saved Plan sentence; the same title is shown in preview/edit mode and persisted when the composed plan is saved. Manual create/edit and server writes enforce the same limit.
- `Saved Plan gaps` is removed from the final visual plan. Missing optional content is represented by omission, not by a prominent incomplete-plan card.

MVP acceptance requires one sparse exercise plan where duplicated support collapses and one learning/behavior plan where genuinely independent support remains visible.

### 10.23 Generation Progress Visibility (2026-07-24)

Plan generation can include draft creation, deterministic source-coverage checks, semantic source-fidelity review, and a bounded repair pass. A button-label change alone does not give the user enough evidence that the request is still pending.

While generation or regeneration is in progress, the composer therefore shows:

- a continuously moving activity indicator and elapsed time;
- the expected workflow stages: reading Saved Plans, organizing actions and schedules, checking source fidelity, and preparing the visual plan;
- a longer-wait explanation after 18 seconds because combined plans may require an additional source check;
- an explicit browser-offline warning when the device loses network connectivity; and
- copy stating that the stages are an expected workflow, not a fabricated exact completion percentage.

The generated draft remains unavailable until the API returns successfully. The progress UI communicates pending state only and does not weaken source-fidelity validation or claim server-side streaming progress.

### 10.24 Cross-Topic Visual Grouping (2026-07-24)

When a composed plan contains Saved Plans from different product topics, one uninterrupted action table makes unrelated actions appear to be one routine and removes the reader's source context.

- A single-topic composition keeps the compact `Plan at a glance` action table.
- A multi-topic composition remains one saved plan, but renders one separately titled action-table block per selected Saved Plan category, using the existing user-facing topic names such as `Exercise & Movement`, `Learning Strategies`, or `Social Skills`.
- Actions remain under the category stored on their source Saved Plan. The generator does not infer a different topic from action wording.
- Multiple Saved Plans in the same category are combined and deduplicated inside that one topic section.
- If a multi-topic composition also contains manual composition items, they use a separate `Additional items` block rather than receiving an inferred topic.
- Source coverage validation rejects a cross-topic draft that omits a required topic section or falls back to one mixed `Plan at a glance` table. The existing bounded repair loop then requests a corrected grouped draft.

Topic headings are visual organization only. They do not create separate documents, diagnoses, goals, or intervention facts.

### 10.25 First-Class Composed Plans And Two-Depth Access (2026-07-24)

Human testing showed that saving a cross-topic composed plan back into `plan_items` assigned the complete plan to the first selected source category. It also made the composed output selectable as future source material, blurred the difference between source and final plan, and provided no clear save destination.

Data decision:

- `plan_items` remains the categorized Saved Plan source library.
- `composed_plans` is the canonical store for generated-and-saved plans, with title, summary, explanation, topic categories, structured content blocks, source plan IDs, ownership, and timestamps.
- A composed plan has zero or more topic categories and never receives one artificial primary category.
- Saving a generated plan writes to `/api/composed-plans`; it no longer consumes or appears as a categorized Saved Plan source.
- Free accounts may retain up to five composed plans in the current MVP policy. Source-plan quota remains separate.

Information architecture:

- Growth Plan places `My Composed Plans` directly below the page heading as the canonical full-detail library.
- Each plan is collapsed by default. Opening it reveals topic/review/source section headings; opening an individual section reveals its complete Markdown/table content.
- The existing category accordions are explicitly labeled `Saved Plan Sources` and remain below the composed-plan library.
- Dashboard exposes a collapsed `My Plans` overview. It shows up to three recent titles and topic badges, then links to `/plan?plan={id}#my-composed-plans` for the full plan. Dashboard does not duplicate full intervention tables.
- A successful save closes the composer, inserts and expands the new plan in `My Composed Plans`, scrolls to the library, and displays a named success message.

Known-record repair:

- The legacy record titled `Foot arch and balance routine; Memory and social skills plan` is migrated transactionally from `plan_items` to `composed_plans` while preserving its ID, title, summary, explanation, timestamps, and all structured blocks.
- Its topic categories are first derived from exact existing block titles; its source IDs are matched from the existing `Plan sources` block. The legacy source-row deletion occurs only after the composed row exists.
- A follow-up, record-scoped migration moves the complete existing Markdown rows from the overloaded `Social Skills` table into `Learning Strategies` (school check-in, recap, reminder wall), `Social Skills` (go-to phrases, role-play), and `School Communication` (teacher accommodation). The exercise, review, and source blocks remain intact. No empty Emotional Support section is created because the saved plan contains no standalone emotional-support action.

This slice does not implement daily completion records, outcome measures, plan versions, or PDF export. Those remain governed by the deferred tracking model and PDF acceptance gate.
