# Module Spec: Dashboard

> Status: ACCEPTED — 2026-05-08 | Self-reviewed: 2026-03-16 | Second-pass reviewed: 2026-03-16 (P0: 0, P1: 0 after fixes) | Implementation status: Implemented and human-accepted
> Module: dashboard
> Routes: `/dashboard`
> API routes: `pages/api/dashboard/*`
> Components: `components/Dashboard/*`
> Branch: TBD (may share branch with infrastructure unification)
> Scope: Feature hub page with summary cards linking to Family Profile, Growth Plan, and Reports.
> SOP v2.4 status: Historical implementation spec. Do not use for new execution until refreshed with Search Ledger and current-code line evidence.

> Acceptance record — 2026-05-08: Technical acceptance passed on `sprint0-complete` with local Supabase, `npx tsc --noEmit`, `git diff --check`, and `npm run build`. Human acceptance passed for Dashboard page load, SmartDrawer layout, Family Profile navigation, mobile layout, and Coming Soon handling for unimplemented modules.
> Update — 2026-05-20: Growth Plan now exists and the Dashboard Growth Plan card links to `/plan`. Reports remains disabled/Coming Soon until Report Analysis is implemented from a refreshed spec.

---

## 0. Planning Baseline

This spec was written against:

- The canonical Layer 1 architecture in `docs/system-architecture.md` (amended 2026-05-06)
- The WeChat mini-program "我的" page design (reference-only, adapted for web)
- The current repo structure
- Current code evidence: `pages/dashboard.tsx:L77-L153` implements the Dashboard page with AppLayout and feature cards.

### Design Rationale

The WeChat mini-program uses a "我的" (My) page as a feature hub with cards for Family Archive, Growth Plan, Reports, and more. In the web version, the sidebar is always the conversation list (SmartDrawer), so non-chat features need a centralized entry point. Dashboard serves this role.

Dashboard is **not** an analytics page. It is a feature hub — a place to quickly see summaries and navigate to detailed views. Internal design choice.

### MVP Boundary

- Dashboard shows summary cards for existing modules only
- No analytics, charts, or usage statistics in MVP
- Implemented module cards link to module detail pages; planned modules show disabled "Coming soon" cards until their pages exist
- Each card fetches its own summary data independently
- Research support is limited to an aggregate source count label. Dashboard must not link to a Paper Topics / Research Browser, expose a browsable paper list, or display abstracts/full text.

### Execution Baseline

- Validation commands: `npx eslint`, `npx tsc --noEmit`, `npm run build`

---

## 1. Feature Requirements

### 1.1 Dashboard Layout

```
SmartDrawer + Content area
├── Head: "Dashboard - Qimi AI"
├── Page header: "Dashboard"
├── Welcome text: "Hi {userName}, here's your family overview."
├── Summary Cards (vertical stack, responsive grid on desktop)
│   ├── Family Profile card
│   ├── Growth Plan card
│   └── Reports card
└── Medical disclaimer banner (bottom)
```

### 1.2 Family Profile Card

- **Title**: "Family Profile"
- **Summary content** (fetched from `GET /api/family/summary`):
  - If child profile exists: "{childName} · {ageText}" + "{challengeCount} challenges tracked"
  - If no child profile: "Set up your child's profile to get started"
- **Action**: Click card → navigate to `/family`
- **Visual**: Card with rounded corners, subtle border, right-arrow icon

### 1.3 Growth Plan Card

- **Title**: "Growth Plan"
- **Summary content** (fetched from `GET /api/plan/summary` — defined in growth-plan spec):
  - If items exist: "{itemCount} saved suggestions · {topCategory}"
  - If no items: "Create strategies and check in on what works"
- **Action**: Click card -> navigate to `/plan`
- **Visual**: Same card style as Family Profile

### 1.4 Reports Card

- **Title**: "Reports"
- **Summary content** (future `GET /api/reports/summary` — defined in report-analysis spec after implementation):
  - If reports exist: "{reportCount} reports uploaded"
  - Current MVP placeholder: "Report explanations are coming later"
- **Action**: Disabled "Coming soon" card until the post-MVP Report Analysis module is implemented
- **Visual**: Same card style

### 1.5 Card Loading and Error States

- Each card fetches its summary independently (parallel fetches)
- Loading: show skeleton placeholder inside card
- Error: show "Unable to load" with a retry link inside card
- If a module's API doesn't exist yet (currently Reports), hard-code the empty-state text in the card — do NOT call a nonexistent API. When the module is later built, the executor for that module updates the Dashboard card to fetch real data. This is an intentional MVP simplification (internal design choice)

### 1.6 Auth & Access

- Page requires login
- Open the shared login modal if no session; there is no current standalone `pages/login.tsx`
- Guest users cannot access Dashboard

### 1.7 Medical Disclaimer

Same as family-profile spec: static banner at page bottom.

---

## 2. API Routes

### 2.1 `GET /api/dashboard/summary` (optional optimization)

If needed for performance, a single endpoint that returns all card summaries in one call. However, the MVP implementation should use individual implemented module summary APIs and must not call `/api/reports/summary` until Report Analysis exists.

This endpoint is **deferred** — only implement if the multi-fetch pattern causes noticeable latency.

---

## 3. Frontend Components

All under `components/Dashboard/`.

### 3.1 `DashboardCard.tsx`

Reusable card component for Dashboard summary cards.

Props:
- `title: string` — Card heading
- `summary: string | null` — Summary text (null = loading)
- `emptyText: string` — Text to show when module has no data
- `href?: string` — Link target for implemented modules
- `icon: React.ReactNode` — Icon for the card
- `loading: boolean` — Show skeleton
- `error: boolean` — Show error state
- `disabled?: boolean` — Render as non-clickable for planned modules
- `badge?: string` — Optional small status label, e.g. "Coming soon"

Styling:
- Rounded corners (`rounded-2xl`), subtle border (`border-slate-200`), white background
- Hover: slight shadow elevation
- Right arrow icon (ChevronRight) on the right side
- Mobile-first: full width, stacks vertically
- Desktop: can be 2-column grid if space allows

### 3.2 `DashboardPage.tsx` (or inline in `pages/dashboard.tsx`)

The page component that composes the cards. Handles auth check, data fetching, and rendering.

### 3.3 State Management

No `dashboardStore` is needed. Dashboard cards fetch summary data on mount and hold it in local component state. No cross-page persistence required.

---

## 4. Pages

### 4.1 `pages/dashboard.tsx` — Dashboard hub page

Current reality: `pages/dashboard.tsx` is already a Dashboard page, not a redirect.

Auth pattern: `useSession()` → loading skeleton → open shared login modal if no session → parallel fetch summaries → render cards.

Data flow:
- On mount: fetch summary APIs in parallel
- Each card independently handles its loading/error/empty state
- No cross-card state dependency

---

## 5. Acceptance Criteria

- [x] Authenticated user sees Dashboard with Family Profile, Growth Plan, and Reports cards
- [x] Family Profile card shows correct summary when child profile exists
- [x] Cards show appropriate empty state text when no data exists
- [x] Clicking the Family Profile card navigates to `/family`
- [x] Growth Plan card navigates to `/plan`
- [x] Reports card shows Coming soon and does not navigate to nonexistent pages
- [x] Unauthenticated users are blocked from the page and prompted via the shared login modal
- [x] Medical disclaimer is visible at the bottom
- [x] SmartDrawer is visible and functional on Dashboard
- [x] Page is mobile responsive (tested at 375px width)
- [x] Browser tab title shows "Dashboard - Qimi AI"
- [ ] `npx eslint` passes (ESLint config incompatible with v10, skipped)
- [x] `npx tsc --noEmit` passes
- [x] `npm run build` passes

---

## 6. Execution Task List

### Task Execution Metadata

- Implementation mode: `linear`
- Acceptance mode: `single-item gate`
- Machine gate: `npx eslint`, `npx tsc --noEmit`, `npm run build`
- Human gate: allowed only after machine gate passes

### Dependency

This module requires the AppLayout → SmartDrawer unification to be completed first. The Dashboard page also needs at least the family summary API to show real data. Growth Plan is now implemented and linked. Reports can show empty-state text until Report Analysis is built.

### T001: Create DashboardCard component

- **File**: `components/Dashboard/DashboardCard.tsx`
- **Do**: Implement reusable card with loading/error/empty states as specified in section 3.1.
- **Verify**: `npx eslint`, `npx tsc --noEmit`, `npm run build` pass.
- **Commit**: `[T001] feat: add DashboardCard component`

### T002: Create /dashboard page (historical task; already implemented)

- **File**: `pages/dashboard.tsx`
- **Do**: Historical task only. Current code already implements the Dashboard hub page.
- **Verify**: `npx eslint`, `npx tsc --noEmit`, `npm run build` pass.
- **Commit**: `[T002] feat: replace /dashboard redirect with feature hub page`

### T003: Add unit tests

- **File**: `__tests__/dashboard.test.ts`
- **Do**: Test card rendering with different states (loading, data, empty, error).
- **Verify**: `npx eslint`, `npx tsc --noEmit`, `npm run build` pass.
- **Commit**: `[T003] test: add dashboard unit tests`
