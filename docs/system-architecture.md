# System Architecture Design — Qimi AI English Web Version

> Status: APPROVED — 2026-02-21 | Amended: 2026-02-27 (mood-tracking archived) | Amended: 2026-03-16 (unified sidebar, Dashboard hub, route restructure) | Amended: 2026-05-06 (current route/layout/migration reality + SOP v2.4 note) | Self-reviewed: 2026-03-16 | Second-pass reviewed: 2026-03-16 (P0: 0, P1: 0 after fixes)
> Created: 2026-02-21
> Context: Phase 1 Layer 1 of Agent Development SOP
> Scope: Canonical Layer 1 architecture for the web app. All module specs must follow this document unless it is explicitly amended.

---

## 0. Planning Baseline

This document was re-checked against:

- Current repo reality in `/Users/jamesguu/qimi-ai-website/qimi-ai-website`
- The cross-platform product blueprint in `/Users/jamesguu/WeChatProjects/adhdhelper-cursor/docs/项目技术蓝图.md`
- Official platform guidance for Vercel Next.js deployment, Vercel Cron, Supabase RLS, Supabase Next.js auth patterns, and Auth.js / NextAuth session handling

### MVP Guardrails

- Keep the web app as a single Next.js deployment on Vercel
- Keep Supabase as the primary database and storage layer
- Keep Pages Router plus per-route auth checks as the established pattern
- Prefer API routes plus server-side Supabase admin access for mutations
- Avoid new services, registries, or abstractions unless the first 5,000 users truly need them

### Current Implementation Notes

- Some routes below are approved future routes, not already implemented pages
- Follow-up reminders already rely on Vercel Cron via `vercel.json`
- The current repo already implements `/followup/[id]` plus the supporting follow-up API routes, even though follow-up is not a primary navigation module
- As of 2026-03-16, the navigation scheme has been unified to use SmartDrawer globally (see Section 2)
- As of 2026-05-06, current code reality must be cited with line references in any future spec update, per SOP v2.4 internal fact evidence.
- Current code evidence: `components/Layout/AppLayout.tsx:5-54` imports and renders SmartDrawer; `pages/dashboard.tsx:77-153`, `pages/family.tsx:99-162`, and `pages/settings.tsx:121-155` use AppLayout.

## 1. Platform And Deployment Baseline

### Hosting and runtime

- UI pages and API routes are deployed together as a single Next.js app on Vercel
- UI uses the Pages Router under `pages/`
- Backend endpoints use Next.js API routes under `pages/api/`
- Scheduled jobs use Vercel Cron and call internal API endpoints

### Data and auth boundary

- Browser reads use the public Supabase client with the anon key
- Sensitive writes and privileged reads go through API routes with `getServerSession()` plus `getSupabaseAdmin()`
- All user-owned tables still require RLS, even if the first implementation uses server-side admin access

### Storage boundary

- Persistent uploads should use Supabase Storage
- Vercel filesystem is treated as ephemeral and must not be used for durable app data

### API response convention

- Success responses follow the current repo pattern, such as `{ reports: [...] }` or `{ profile: {...} }`
- Failure responses use `{ error: "..." }`
- New modules should not introduce a second global response envelope

## 2. Navigation Scheme

### Decision: Unified SmartDrawer as the global sidebar

> Amended 2026-03-16. Previous plan used two sidebar patterns (Sidebar for module pages, SmartDrawer for chat). This created a split navigation experience — users switching from chat to other pages saw a completely different left panel. The new plan unifies all logged-in pages under SmartDrawer, matching the pattern used by ChatGPT and Claude where the conversation list is always visible. Internal design choice.

The app uses **one** sidebar for all logged-in pages:

- **SmartDrawer** (`components/Chat/SmartDrawer.tsx`) — visible on `/chat`, `/dashboard`, `/family`, `/plan`, `/reports`, `/settings`
- **Sidebar** (`components/Layout/Sidebar.tsx`) — ~~used by AppLayout~~ **DEPRECATED**. Retained only as legacy code; new pages must not use it.
- **AppLayout** uses SmartDrawer instead of Sidebar, so all logged-in pages share the same navigation.

### SmartDrawer Contents (global)

```
SmartDrawer (all logged-in pages)
├── Top: Dashboard button (switches to /dashboard)
├── Topic cards (8 categories — existing)
├── Recent conversation list (uncategorized/general conversations)
└── Bottom: Guest sign-in CTA (guest only)
```

The **Dashboard button** at the top of SmartDrawer already exists. When the user is on `/dashboard`, clicking a conversation in the list navigates back to `/chat` with that conversation loaded. No additional navigation items are needed inside SmartDrawer.

Topic cards are not feature-module navigation entries. They are chat organization affordances. Selecting a topic should open a topic-scoped chat page state, persist the resulting `conversations.folder_key`, and show that topic's conversation list in the main chat pane. SmartDrawer Recent is reserved for uncategorized/general conversations so topic-scoped conversation titles do not duplicate into the sidebar. This is a current shared-infrastructure closure item, not a downstream Growth Plan or Reports feature.

### Top-right UserMenu

The **UserMenu** (`components/UI/UserMenu.tsx`) stays in the top-right corner of all logged-in pages. It provides:

| Menu Item | Route | Description |
|-----------|-------|-------------|
| Dashboard | `/dashboard` | Feature hub (already present in current UserMenu implementation) |
| Settings | `/settings` | Account settings (name, email, avatar, notifications, subscription) |
| Sign Out | — | Ends session |

### Browser Tab Title

Browser tab titles must be dynamic and reflect the current page context:

| Page | Tab Title |
|------|-----------|
| `/chat` (new) | "New Chat - Qimi AI" |
| `/chat` (with conversation) | "{conversation title} - Qimi AI" |
| `/dashboard` | "Dashboard - Qimi AI" |
| `/family` | "Family Profile - Qimi AI" |
| `/plan` | "Growth Plan - Qimi AI" |
| `/reports` | "Reports - Qimi AI" |
| `/settings` | "Settings - Qimi AI" |

Implementation: use `<Head><title>...</title></Head>` in each page component.

> ~~Mood (Heart, `/mood`, mood-tracking)~~ — ARCHIVED, feature cancelled 2026-02-27

**Crisis Calm**: Not a sidebar or menu item. Accessed via a floating button injected through the shared layout (visible on all logged-in pages). Rationale: crisis calm is an emergency tool, not a daily navigation target. It should be 1 tap away when needed, not buried in a nav list.

### Mobile Behavior
- SmartDrawer becomes a slide-in drawer (toggled via hamburger icon or left-edge swipe gesture — existing chat behavior)
- All logged-in pages share the same mobile drawer behavior
- Bottom action: no Tab Bar — consistent with drawer pattern

### Implementation Note
The SmartDrawer sidebar unification is implemented in `AppLayout`. `components/Layout/Sidebar.tsx` is retained only as legacy code and should not be used by new pages.

---

## 3. Page Route Table

> Amended 2026-03-16: `/profile` split into `/family` (child/family data) and `/settings` (account). `/dashboard` promoted from redirect to a feature hub page.

| Path | Page | Module | Auth Required | Layout | Status |
|------|------|--------|---------------|--------|--------|
| `/` | Landing page | landing | No | LandingLayout | Implemented |
| `/about` | About us | landing | No | LandingLayout | Implemented |
| `/founder` | Founder's letter | landing | No | LandingLayout | Implemented |
| `/blog` | Blog listing | landing | No | LandingLayout | Implemented |
| `/blog/[slug]` | Blog article | landing | No | LandingLayout | Implemented |
| `/login` | Login / Sign up | auth | No | Standalone | Superseded by modal auth; no current `pages/login.tsx` |
| `/chat` | AI Chat (main app) | core | No (guest mode) | SmartDrawer + Chat UI | Implemented |
| `/followup/[id]` | Follow-up landing page | followup-reminder | Yes | SmartDrawer + Content | Implemented |
| `/dashboard` | Feature hub (summary cards) | dashboard | Yes | SmartDrawer + Content | Implemented, not yet human-accepted |
| `/family` | Family profile (child info, challenges) | family-profile | Yes | SmartDrawer + Content | Implemented, not yet human-accepted |
| `/plan` | Growth plan dashboard | growth-plan | Yes | SmartDrawer + Content | Planned |
| `/reports` | Report history | report-analysis | Yes | SmartDrawer + Content | Planned |
| `/reports/upload` | Upload new report | report-analysis | Yes | SmartDrawer + Content | Planned |
| `/reports/[id]` | View report analysis | report-analysis | Yes | SmartDrawer + Content | Planned |
| `/settings` | Account settings (name, email, subscription placeholder, delete account) | settings | Yes | SmartDrawer + Content | Implemented, not yet human-accepted |
| `/calm` | Crisis calm session | crisis-calm | No (guest ok) | Fullscreen (no nav) | Planned |
| `/privacy` | Privacy policy | legal | No | LandingLayout | Planned |
| `/terms` | Terms of service | legal | No | LandingLayout | Planned |
| ~~`/profile`~~ | ~~User + child profile~~ | ~~user-profile~~ | — | — | **Split** into `/family` + `/settings` (2026-03-16) |
| ~~`/mood`~~ | ~~Mood tracking~~ | ~~mood-tracking~~ | — | — | Archived (2026-02-27) |

### Route Ownership Rules
- Each module ONLY creates pages under its designated routes
- dashboard: `/dashboard`
- family-profile: `/family`
- growth-plan: `/plan`, `/plan/*`
- report-analysis: `/reports`, `/reports/*`
- settings: `/settings`
- crisis-calm: `/calm`
- followup-reminder: `/followup/[id]`
- ~~user-profile: `/profile`~~ — split into family-profile + settings (2026-03-16)
- ~~mood-tracking: `/mood`, `/mood/*`~~ — Archived (2026-02-27)

---

## 4. Shared Layout / App Shell

### Layout Hierarchy

> Amended 2026-03-16: All logged-in pages now use SmartDrawer as the global sidebar. AppLayout with legacy Sidebar is deprecated.

```
_app.tsx (SessionProvider + font)
├── LandingLayout  — Landing pages (/, /about, /founder, /blog)
│   ├── Navbar (logo, nav links, login/signup buttons)
│   └── Footer (links, copyright)
│
├── SmartDrawer + Content — All logged-in pages
│   │                       (/chat, /dashboard, /family, /plan, /reports, /settings, /followup/[id])
│   ├── SmartDrawer (topic cards, conversation list, Dashboard button)
│   ├── Top bar (Logo, page-specific controls, UserMenu)
│   └── Main content area (responsive, scrollable)
│
└── Fullscreen     — Crisis calm (/calm)
    └── Full viewport, no nav, exit button only
```

### Logged-in Page Usage Pattern (for new module pages)

AppLayout now wraps SmartDrawer. New module pages should use AppLayout unless the module explicitly owns a fullscreen experience such as `/calm`.

```tsx
import AppLayout from '@/components/Layout/AppLayout';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const { openLoginModal } = useAuthUIStore();

  if (status === 'loading') return <div>Loading...</div>;
  if (!session) { openLoginModal(); return null; }

  return (
    <AppLayout>
      <Head><title>Dashboard - Qimi AI</title></Head>
      {/* Module content here */}
    </AppLayout>
  );
}
```

### Implementation Note
The AppLayout to SmartDrawer refactor is complete in the current working branch. Future module specs should treat SmartDrawer layout as implemented infrastructure and should verify behavior rather than duplicating the old inline chat layout.

---

## 5. Module Entry Registration

### How a new module connects to the app

Each module is self-contained. No global registration file. Modules connect via:

1. **Page file** — Create `pages/{route}.tsx`, import AppLayout (which wraps SmartDrawer)
2. **API routes** — Create `pages/api/{module-name}/*.ts`
3. **Components** — Create `components/{ModuleName}/*.tsx`
4. **Store** (if needed) — Create `stores/{moduleName}Store.ts`
5. **DB migration** — Create a versioned SQL migration under `supabase/migrations/`

### Module Checklist (for each new module)

```
New module "{module-name}":
├── pages/{route}.tsx           — Main page (uses AppLayout with SmartDrawer)
├── pages/api/{module-name}/    — API routes (auth pattern)
├── components/{ModuleName}/    — UI components
├── stores/{moduleName}Store.ts — Zustand store (if needed)
└── supabase/migrations/{timestamp}_{module-name}.sql — DB migration + RLS
```

Note: No sidebar entry is needed. Module pages are accessed via Dashboard cards or UserMenu. SmartDrawer content (conversation list + topic cards) is the same on all pages.

Legacy module SQL files such as `supabase/family_tables.sql` may remain as snippets/reference, but acceptance and deployment use the versioned `supabase/migrations/` path.

### No Global Config Files to Edit
- No `routes.ts` registry
- No `modules.ts` manifest
- No `_app.tsx` modification
- Just create files in the right directories and they work (Next.js file-based routing)

---

## 6. Shared Type Definitions

### Current State (DO NOT modify these files)

| File | Types | Used By |
|------|-------|---------|
| `types/user.ts` | User, ChildProfile, GuestData, Subscription, UserQuota | All modules |
| `types/chat.ts` | Message, Conversation, TopicFolder, SendMessageRequest | Chat, growth-plan |
| ~~`types/mood.ts`~~ | ~~MoodLevel, MoodRecord, MoodStats, MOOD_SCORES, MOOD_EMOJIS~~ | ~~mood-tracking~~ *(ARCHIVED)* |
| `types/plan.ts` | PlanCategory, ActionPlanItem, PLAN_CATEGORIES | growth-plan |
| `types/api.ts` | ApiResponse, SSEChunk, RAGSource, PaginatedResponse | All modules |
| `types/index.ts` | Re-exports all above | Import hub |

### Rules for New Types

1. **If the type is only used within one module** → Define in module directory (e.g., `components/CrisisCalm/types.ts`)
2. **If the type is used across modules** → Define locally first, tag commit with `[NEEDS_SHARED_TYPE]`, maintainer promotes to `types/*.ts`
3. **Never modify `types/*.ts` directly** during module development

### Types That Will Likely Need Promotion (anticipated)

| Type | Module Source | Used By |
|------|-------------|---------|
| `CrisisSession` | crisis-calm | crisis-calm only (stay local) |
| `UserProfile` (extended) | family-profile | family-profile + chat (system prompt injection) |
| `ReportRecord` | report-analysis | report-analysis only (stay local for now) |

---

## 7. Data Flow Conventions

### State Management: Zustand Only

| Store | Scope | Persistence |
|-------|-------|-------------|
| `chatStore` | Chat messages, conversations, streaming | localStorage cache (5-min TTL) |
| `userStore` | Auth state, guest data, child profile, quota | localStorage (selective persist) |
| `{module}Store` | Module-specific state | Per-module decision |

### New Module Store Rules

1. Create `stores/{moduleName}Store.ts`
2. Import with `import { use{Module}Store } from '@/stores/{moduleName}Store'`
3. DO NOT import or modify `chatStore` or `userStore`
4. Use `zustand/middleware` persist only if data needs to survive page refresh

### Module-to-Module Communication

Modules do NOT directly communicate with each other's stores. Instead:

| Scenario | Pattern |
|----------|---------|
| Module needs user info | Import `userStore` selectors (read-only, NO setters) |
| Module needs chat context | Pass via props or URL params |
| Growth plan extracts from chat | API-level (server-side, not store-to-store) |
| ~~Mood affects chat prompt~~ | ~~Read mood data in API route, inject into system prompt~~ *(ARCHIVED)* |

### API Data Flow

```
Component → fetch('/api/{module}/endpoint') → API route → Supabase → Response
                                              ↑
                                    getServerSession() for auth
                                    getSupabaseAdmin() for DB
```

### Mutation pattern

- Default path: browser calls API route, API route validates input, checks session, performs DB or storage mutation
- Avoid direct browser writes for sensitive entities such as reports, billing state, quotas, and server-generated artifacts
- Client-side direct Supabase reads are acceptable only when the table is intentionally browser-readable and protected by RLS

### Caching Strategy

| Data Type | Cache Location | TTL | Invalidation |
|-----------|---------------|-----|--------------|
| Conversations list | localStorage | 5 min | On create/delete |
| User profile | Zustand persist | Until logout | On profile update |
| ~~Mood records~~ | ~~No client cache~~ | ~~N/A~~ | ~~Always fresh from API~~ *(ARCHIVED)* |
| Growth plan items | No client cache | N/A | Always fresh from API |

New modules: default to **no client-side caching** for mutable records. Add caching only if there is a demonstrated performance need and a clear invalidation path.

### Guest Data Migration

> Added 2026-03-16. Internal design choice aligned with the WeChat mini-program's existing migration behavior.

When a guest user registers or logs in, all temporary data collected during the guest session must be migrated to permanent Supabase storage:

| Guest Data (localStorage) | Target Table | Target Fields |
|--------------------------|--------------|---------------|
| `childBirthday` | `child_profiles` | `birth_year`, `birth_month` |
| `challenges` | `child_profiles` | `challenges` |
| `chatHistory` | `conversations` + `messages` | Already handled by existing migration |
| `messageCount` | — | Discarded (registered users have server-side quota tracking) |

**Migration trigger**: The migration runs once when `useSession()` returns an authenticated session AND `guestStorage.get()` contains data. After successful migration, `guestStorage` is cleared.

**Current implementation** (`pages/api/user/migrate-guest-data.ts`):
- Chat history → `conversations` + `messages` tables (implemented, working)
- `childBirthday` + `challenges` → written to `users.child_birthday` and `users.challenges` columns (implemented, but these are **legacy columns** that will be superseded by `child_profiles` table)

**Migration update required** (internal design choice):
When the family-profile module is implemented, the migration endpoint must be updated to write birthday and challenges into `child_profiles` instead of `users`:
1. Keep chat history migration as-is (already correct)
2. Change child data migration: `childBirthday` + `challenges` → call `POST /api/family/child` to upsert into `child_profiles` table
3. The `users.child_birthday` and `users.challenges` columns become legacy and should not be read by new code
4. The `/family` page reads from `child_profiles` only

**Important**: The user should not be asked to re-enter information they already provided during onboarding. If a child profile already exists (from migration), the `/family` page shows the existing data for review and editing.

## 8. Permission Matrix

### User Roles

| Role | How Identified | Description |
|------|---------------|-------------|
| **Guest** | No session, guestStorage exists | Unregistered visitor, localStorage only |
| **Free User** | Session exists; no active billing entitlement in current schema | Registered, limited quota |
| **Pro User** | Future billing entitlement from membership-billing module | Paid subscriber, full access after billing module exists |

### Access Matrix

| Feature / Page | Guest | Free User | Pro User |
|----------------|-------|-----------|----------|
| Landing page (`/`) | Full | Full | Full |
| Blog (`/blog`) | Full | Full | Full |
| Chat (`/chat`) | 5 messages | 20 msg/day | Unlimited |
| RAG research mode | No | 5 queries/day | Unlimited |
| ~~Mood tracking (`/mood`)~~ | ~~No~~ | ~~Full~~ | ~~Full~~ *(ARCHIVED)* |
| Crisis calm (`/calm`) | Full | Full | Full |
| Growth plan (`/plan`) | No | Full (max 5 items) | Full (unlimited) |
| Report analysis (`/reports`) | No | 1 report/month | Unlimited |
| Dashboard (`/dashboard`) | No | Full | Full |
| Family profile (`/family`) | No | Full | Full |
| Settings (`/settings`) | No | Full | Full |
| File upload (reports) | No | 5MB limit | 20MB limit |
| Export PDF (growth plan) | No | No | Yes |

### Auth Enforcement Pattern

**Page level** (client-side auth gate):
```tsx
const { data: session, status } = useSession();
const { openLoginModal } = useAuthUIStore();
if (status === 'loading') return <Loading />;
if (!session) { openLoginModal(); return null; }
```

There is no current standalone `pages/login.tsx`. Logged-in feature pages should open the shared auth modal for unauthenticated users unless a future auth spec explicitly reintroduces a standalone login route.

**API level** (server-side 401):
```ts
const session = await getServerSession(req, res, authOptions);
if (!session?.user?.email) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

**Quota enforcement** (server-side):
```ts
// Check quota in API route before processing
const quota = await getUserQuota(userId);
if (quota.messagesUsed >= quota.messagesLimit) {
  return res.status(429).json({ error: 'Daily message limit reached' });
}
```

### Special Cases

- **Crisis calm** (`/calm`): No auth required — emergency tool must be accessible to everyone
- **Chat guest mode**: 5-message limit enforced client-side (guestMessageCount) + should add server-side check
- **Stripe subscription check**: Not implemented yet. Current schema has no `users.subscription_tier` column and no `GET /api/user/subscription` route. For now, all registered users are treated as Free tier. Pro features must not be treated as enforceable until the membership-billing module creates the billing schema/API.

---

## 9. Shared Infrastructure Changes Required Before Module Development

> Amended 2026-03-16: Sidebar unification replaces the previous plan to add nav items to Sidebar.tsx.

These changes must be made by the maintainer to shared files before new module pages can be built:

| Change | File(s) | Description | Priority |
|--------|---------|-------------|----------|
| Unify AppLayout to use SmartDrawer | `components/Layout/AppLayout.tsx` | Implemented. Verify in acceptance rather than rebuilding. | Done |
| Add Dashboard button behavior | `components/Chat/SmartDrawer.tsx` | Dashboard button already exists. Ensure it links to `/dashboard` and is visually active when on non-chat pages. | Verify |
| Guest data migration (challenges + birthday) | `pages/api/user/migrate-guest-data.ts` | Implemented to write `birth_year`, `birth_month`, and `challenges` into `child_profiles` (`pages/api/user/migrate-guest-data.ts:118-141`). | Verify |
| Add crisis entry affordance | `components/Layout/AppLayout.tsx` | Floating button visible on all logged-in pages (only if crisis module proceeds) | P2 |

**Current conclusion:** AppLayout → SmartDrawer unification is no longer the critical blocker. The current blockers are SOP v2.4 planning refresh for active specs, compliance launch-gate closure, and technical/human acceptance for already implemented pages.

## 10. Architecture Decision Record

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Navigation | Unified SmartDrawer on all logged-in pages | Eliminates split-sidebar UX. Matches ChatGPT/Claude pattern where conversation list is always visible. (Amended 2026-03-16, was: separate Sidebar for module pages) |
| Dashboard as feature hub | `/dashboard` shows summary cards for Family, Plan, Reports | Centralizes non-chat features in one visible location. Matches the WeChat mini-program "我的" page concept adapted for web. (Added 2026-03-16) |
| Profile split | `/family` (child data) + `/settings` (account) | Separates product-core data (child profile, challenges) from account management. `/family` is accessed from Dashboard; `/settings` from UserMenu. (Added 2026-03-16) |
| Module page entry | Via Dashboard cards + UserMenu, not sidebar nav items | SmartDrawer stays focused on conversations. Feature pages are accessed from Dashboard hub or UserMenu dropdown. (Added 2026-03-16) |
| Guest data migration | Auto-migrate to Supabase on registration | User should never re-enter onboarding data. Challenges + birthday flow into child_profiles automatically. (Added 2026-03-16) |
| Follow-up entry | Email deep link, not sidebar item | Return-path feature, not a primary daily navigation target |
| Crisis access | Floating button, not nav item | Emergency tool = must be instantly visible, not buried |
| Crisis layout | Fullscreen, no nav | Calming experience, no distractions |
| State management | Separate stores per module | Namespace isolation per CLAUDE.md concurrency rules |
| Module communication | Via API / read-only from userStore | No direct store-to-store coupling |
| Auth approach | Per-route, no middleware | Existing pattern, keep consistent |
| Caching | Default none, add only if needed | MVP stage, simplicity > performance |
| Guest crisis access | Allowed (no auth) | Emergency support should have zero barriers |
| Deployment model | Single Vercel app + Supabase | Mature MVP baseline with the lowest operational complexity |
| Storage model | Supabase Storage for web uploads | Fits the existing stack and avoids adding another file service |
| Browser tab titles | Dynamic per page/conversation | Improves UX when user has multiple tabs. Standard practice (ChatGPT, Claude). (Added 2026-03-16) |
