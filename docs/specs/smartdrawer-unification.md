# Infrastructure Spec: AppLayout → SmartDrawer Unification

> Status: DONE — 2026-03-16 | Implementation status: Implemented
> Type: Shared infrastructure change (not a feature module)
> Files affected: `components/Layout/AppLayout.tsx`, `components/Chat/SmartDrawer.tsx`, `pages/chat.tsx`
> Priority: Historical P0, no longer blocking as of 2026-05-06
> Branch: current working branch (docs/architecture-v2 or dedicated branch)
> SOP v2.4 status: Historical completed infrastructure spec. Do not execute task list as new work; verify current code instead.

---

## 0. Problem Statement

Historical problem statement. Before this infrastructure task, the app had two incompatible layout patterns:

1. **Chat page** (`pages/chat.tsx`): Uses `SmartDrawer` directly, manages drawer state locally (drawerOpen, drawerCollapsed), has its own header with menu button.
2. **Other pages** (`AppLayout`): Uses `Sidebar` (`components/Layout/Sidebar.tsx`) which is a navigation sidebar (Dashboard, Chat, Blog, Settings links). Completely different from SmartDrawer.

Per `system-architecture.md` Section 2 (amended 2026-03-16), **all logged-in pages must use SmartDrawer as the global sidebar**. This matches the ChatGPT/Claude pattern where the conversation list is always visible.

## 1. Target State

After unification:

```
AppLayout (new)
├── SmartDrawer (conversation list + topics + Dashboard button)
│   ├── Desktop: sidebar (w-72) or collapsed (w-16)
│   └── Mobile: slide-in drawer from left
├── Mobile Header (menu button + logo)
└── Content area (children)
    └── flex-1, adapts to SmartDrawer width
```

- `pages/chat.tsx` uses `<AppLayout fullScreen>` instead of managing SmartDrawer directly
- `pages/dashboard.tsx`, `pages/family.tsx`, etc. all use `<AppLayout>`
- `Sidebar.tsx` is no longer imported anywhere (kept as dead code for now, not deleted)

## 2. Key Design Decisions

### 2.1 Drawer state moves to AppLayout

Currently `drawerOpen` and `drawerCollapsed` live in `pages/chat.tsx`. After unification, they move into `AppLayout` so all pages share the same drawer state.

### 2.2 SmartDrawer callbacks on non-chat pages

SmartDrawer has callbacks like `onNewChat`, `onSelectConversation`, `onSelectTopic`. On non-chat pages:

- `onNewChat` → `router.push('/chat')` (navigate to chat, store will create new chat)
- `onSelectConversation(id)` → `router.push('/chat?conversation=${id}')` (navigate to chat with that conversation)
- `onSelectTopic(key)` → `router.push('/chat?topic=${key}')` (navigate to chat with that topic)

On the chat page, these callbacks work as they do now (no navigation, just state updates).

### 2.3 Dashboard button behavior

The Dashboard button in SmartDrawer currently calls `onNewChat`. After unification:
- On any page: navigate to `/dashboard`
- Replace `onNewChat` callback with `router.push('/dashboard')`

### 2.4 Chat page refactoring scope

`pages/chat.tsx` currently does two things:
1. Layout management (SmartDrawer + header + content wrapper)
2. Chat logic (messages, sending, guest mode, onboarding)

After unification, chat.tsx only does #2. Layout is handled by AppLayout.

### 2.5 UserMenu integration

`components/UI/UserMenu.tsx` already exists but is not used anywhere. It provides a top-right avatar dropdown with Dashboard, Settings, and Log out links. Per architecture doc, UserMenu must be visible on all logged-in pages in the top bar.

AppLayout's mobile header and the chat page header must both include `<UserMenu />` on the right side. Additionally, SmartDrawer's bottom "Logged in / Sign out" footer should be removed since UserMenu now handles sign-out.

### 2.6 fullScreen prop

AppLayout already has a `fullScreen` prop. Chat page will use `fullScreen={true}` so the content area fills the full height without padding/max-width constraints. Other module pages use `fullScreen={false}` (default) for padded, max-width-constrained content.

---

## 3. Acceptance Criteria

- [x] All logged-in pages (chat, dashboard, family, etc.) show SmartDrawer as sidebar
- [x] SmartDrawer conversation list works on non-chat pages (clicking a conversation navigates to `/chat`)
- [x] Dashboard button in SmartDrawer navigates to `/dashboard`
- [x] Mobile: hamburger menu opens SmartDrawer on all pages
- [x] Desktop: SmartDrawer collapse/expand works on all pages
- [x] Chat page retains all current functionality (messages, streaming, guest mode, onboarding, RAG toggle)
- [x] Touch swipe-to-open gesture works on all pages (mobile)
- [x] UserMenu (avatar + dropdown) is visible in top-right on all logged-in pages
- [x] SmartDrawer bottom "Logged in / Sign out" footer is removed
- [x] `Sidebar.tsx` is no longer imported by any file
- [ ] `npx eslint` passes (ESLint config incompatible with v10, skipped)
- [x] `npx tsc --noEmit` passes
- [x] `npm run build` passes

---

## 4. Execution Task List

### Task Execution Metadata

- Implementation mode: `linear`
- Acceptance mode: `single-item gate`
- Machine gate: `npx eslint`, `npx tsc --noEmit`, `npm run build`
- Human gate: allowed only after machine gate passes

### T001: Refactor AppLayout to use SmartDrawer instead of Sidebar

- **File**: `components/Layout/AppLayout.tsx`
- **Do**:
  1. Read `pages/chat.tsx` lines 28-31 to understand current SmartDrawer state management (`drawerOpen`, `drawerCollapsed`)
  2. Read `components/Chat/SmartDrawer.tsx` to understand its props interface
  3. Remove `import Sidebar from './Sidebar'`
  4. Add `import { SmartDrawer } from '../Chat/SmartDrawer'`
  5. Add `import { useRouter } from 'next/router'`
  6. Add `import { useSession } from 'next-auth/react'`
  7. Add state: `const [drawerOpen, setDrawerOpen] = useState(false)` (already exists)
  8. Add state: `const [drawerCollapsed, setDrawerCollapsed] = useState(false)`
  9. Add: `const router = useRouter()`
  10. Add: `const { data: session } = useSession()`
  11. Add: `const isGuest = !session`
  12. Replace `<Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />` with:
      ```tsx
      <SmartDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isCollapsed={drawerCollapsed}
        onToggleCollapse={() => setDrawerCollapsed(!drawerCollapsed)}
        onNewChat={() => router.push('/chat')}
        onSelectTopic={(folderKey) => router.push(`/chat?topic=${folderKey}`)}
        onSelectConversation={(id) => router.push(`/chat?conversation=${id}`)}
        isGuest={isGuest}
      />
      ```
  13. Update the content area div class to adapt to SmartDrawer width:
      ```tsx
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ${drawerCollapsed ? 'lg:ml-16' : 'lg:ml-72'}`}>
      ```
  14. Update the mobile header menu button to use `setDrawerOpen(true)` (already correct, just verify variable name matches)
  15. Add touch gesture handlers for swipe-to-open (copy from `pages/chat.tsx` lines 59-71):
      ```tsx
      const touchStartX = useRef<number>(0);
      const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
      const handleTouchEnd = (e: React.TouchEvent) => {
        const diff = e.changedTouches[0].clientX - touchStartX.current;
        if (touchStartX.current < 30 && diff > 50 && !drawerOpen) setDrawerOpen(true);
      };
      ```
      Add `onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}` to the content wrapper div.
- **Constraint**: Do NOT modify `SmartDrawer.tsx` in this task. Do NOT delete `Sidebar.tsx`.
- **Verify**: `npx eslint components/Layout/AppLayout.tsx`, `npx tsc --noEmit`, `npm run build`
- ⚠️ **不要 commit。** 告诉用户你改了什么，等用户说"可以 commit"后执行：`git commit -m "[T001] refactor: replace Sidebar with SmartDrawer in AppLayout"`。未经确认绝对不要 commit。

### T001-fix: Add UserMenu to AppLayout + remove SmartDrawer auth footer

- **Files**: `components/Layout/AppLayout.tsx`, `components/Chat/SmartDrawer.tsx`
- **Do**:
  1. In `components/Layout/AppLayout.tsx`:
     - Add `import UserMenu from '../UI/UserMenu'`
     - Add optional callback props to AppLayoutProps interface: `onNewChat?: () => void`, `onSelectConversation?: (id: string) => void`, `onSelectTopic?: (key: string) => void`
     - Accept these props in the component destructuring
     - Update SmartDrawer callbacks to use the optional props with fallback: `onNewChat={onNewChat || (() => router.push('/chat'))}` (same pattern for the other two)
     - In the mobile header div, replace the spacer `<div className="w-8" />` with `<UserMenu />`
     - Add a desktop-only header bar (visible on `lg:` breakpoint) that shows the logo on the left and `<UserMenu />` on the right. This header should only appear when the page is NOT fullScreen. For fullScreen pages (chat), the page provides its own header.
  2. In `components/Chat/SmartDrawer.tsx`:
     - Find the auth footer section at the bottom (around line 940-965, the section that shows "Logged in" / "Sign out" for logged-in users)
     - Remove this entire logged-in footer block. UserMenu now handles sign-out.
     - Keep the guest footer ("Sign in for unlimited") — only remove the logged-in version.
- **Constraint**: Do not change any other SmartDrawer functionality.
- **Verify**: `npx eslint`, `npx tsc --noEmit`, `npm run build`
- ⚠️ **不要 commit。** 告诉用户你改了什么，等用户说"可以 commit"后执行：`git commit -m "[T001-fix] feat: add UserMenu to AppLayout, remove SmartDrawer auth footer"`。未经确认绝对不要 commit。

### T002: Update SmartDrawer Dashboard button to navigate to /dashboard

- **File**: `components/Chat/SmartDrawer.tsx`
- **Do**:
  1. Find the Dashboard button (around line 827-835, the `<button>` with `onClick={onNewChat}` and title="Dashboard")
  2. This button currently calls `onNewChat`. Change it to navigate to `/dashboard` directly:
     - Add `import { useRouter } from 'next/router'` (if not already imported)
     - Add `const router = useRouter()` inside the component (if not already present)
     - Change the Dashboard button's onClick from `onNewChat` to `() => router.push('/dashboard')`
  3. Do NOT change any other functionality in SmartDrawer
- **Constraint**: Only modify the Dashboard button's onClick handler. Do not touch conversation list, topic cards, search, or any other feature.
- **Verify**: `npx eslint components/Chat/SmartDrawer.tsx`, `npx tsc --noEmit`, `npm run build`
- ⚠️ **不要 commit。** 告诉用户你改了什么，等用户说"可以 commit"后执行：`git commit -m "[T002] feat: SmartDrawer Dashboard button navigates to /dashboard"`。未经确认绝对不要 commit。

### T003: Refactor chat.tsx to use AppLayout instead of inline SmartDrawer

- **File**: `pages/chat.tsx`
- **Do**:
  1. Add `import AppLayout from '../components/Layout/AppLayout'`
  2. Remove the direct `<SmartDrawer ... />` JSX block (lines 242-251)
  3. Remove local state: `drawerOpen`, `drawerCollapsed` (lines 29-30) — these now live in AppLayout
  4. Remove local touch gesture handlers: `touchStartX`, `handleTouchStart`, `handleTouchEnd` (lines 50-71) — these now live in AppLayout
  5. Remove the `onTouchStart` and `onTouchEnd` props from the content div (line 256-257)
  6. Remove the mobile menu button from the chat header (lines 261-265) — AppLayout provides this
  7. Wrap the entire return JSX (excluding Head and early returns for loading/onboarding) in `<AppLayout fullScreen>...</AppLayout>`
  8. The chat page's content area should now be just the chat content (header with logo/new chat button, messages, input), without SmartDrawer or mobile menu button. The structure becomes:
      ```tsx
      return (
        <AppLayout fullScreen>
          <Head><title>Chat - Qimi AI</title></Head>
          <div className="flex-1 flex flex-col">
            {/* Chat header (logo + new chat button, NO menu button) */}
            <header className="flex-shrink-0 h-14 flex items-center justify-center px-4 border-b border-slate-100 bg-white relative">
              <button onClick={() => { createNewChat(); setMessages([WELCOME_MESSAGE]); }} className="hover:opacity-80 transition-opacity" title="Back to Dashboard">
                <img src="/logo.svg" alt="Qimi" className="h-8" />
              </button>
              {messages.length > 1 && (
                <button onClick={() => { createNewChat(); setMessages([WELCOME_MESSAGE]); }} className="absolute right-4 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                  + New Chat
                </button>
              )}
            </header>
            {/* ... rest of chat content unchanged ... */}
          </div>
        </AppLayout>
      );
      ```
  9. BUT: AppLayout's SmartDrawer callbacks use `router.push('/chat')` for onNewChat — on the chat page, we actually want to call `createNewChat()` locally instead of navigating. To handle this, add a new optional prop to AppLayout: `onNewChat?: () => void`, `onSelectConversation?: (id: string) => void`, `onSelectTopic?: (key: string) => void`. When these are provided, use them instead of router.push. Update AppLayout accordingly.
  10. Pass these overrides from chat.tsx:
      ```tsx
      <AppLayout
        fullScreen
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onSelectTopic={handleSelectTopic}
      >
      ```
- **Important**: The early returns for `status === 'loading'` and `showOnboarding` should remain OUTSIDE AppLayout (they are full-screen takeovers that don't show SmartDrawer).
- **Constraint**: Do not change message sending logic, guest mode, RAG toggle, or any chat functionality. Only refactor the layout wrapper.
- **Reference**: Current `pages/chat.tsx` for all existing functionality that must be preserved.
- **Verify**: `npx eslint pages/chat.tsx`, `npx tsc --noEmit`, `npm run build`. Then manually verify: chat page looks and works the same as before (SmartDrawer visible, messages work, guest mode works).
- ⚠️ **不要 commit。** 告诉用户你改了什么，等用户说"可以 commit"后执行：`git commit -m "[T003] refactor: chat page uses AppLayout instead of inline SmartDrawer"`。未经确认绝对不要 commit。

### T004: Handle chat query parameters (conversation and topic)

- **File**: `pages/chat.tsx`
- **Do**:
  1. When AppLayout navigates from a non-chat page to `/chat?conversation=xxx`, chat.tsx needs to detect and load that conversation
  2. Add a useEffect that watches `router.query.conversation`:
     ```tsx
     useEffect(() => {
       const conversationId = router.query.conversation as string;
       if (conversationId) {
         selectConversation(conversationId);
         // Clean up the URL to avoid re-triggering
         router.replace('/chat', undefined, { shallow: true });
       }
     }, [router.query.conversation]);
     ```
  3. Similarly handle `router.query.topic`:
     ```tsx
     useEffect(() => {
       const topic = router.query.topic as string;
       if (topic) {
         createNewChat();
         // Topic-specific behavior can be added later
         router.replace('/chat', undefined, { shallow: true });
       }
     }, [router.query.topic]);
     ```
- **Constraint**: Do not change any existing chat logic. Only add query parameter handling.
- **Verify**: `npx eslint pages/chat.tsx`, `npx tsc --noEmit`, `npm run build`
- ⚠️ **不要 commit。** 告诉用户你改了什么，等用户说"可以 commit"后执行：`git commit -m "[T004] feat: handle conversation and topic query params from SmartDrawer navigation"`。未经确认绝对不要 commit。

### T005: Verify and clean up

- **Files**: multiple (read-only scan + minor fixes)
- **Do**:
  1. Run `npx eslint` on the whole project — fix any new warnings
  2. Run `npx tsc --noEmit` — fix any type errors
  3. Run `npm run build` — fix any build errors
  4. Search the codebase for any remaining imports of `Sidebar` from `components/Layout/Sidebar`: `grep -r "from.*Layout/Sidebar" pages/ components/` — if any found, remove those imports and replace with AppLayout usage
  5. Do NOT delete `Sidebar.tsx` — it stays as dead code until manually cleaned up
  6. Verify SmartDrawer is no longer directly imported in any page file (only AppLayout imports it)
- **Verify**: All three checks pass clean. No orphaned imports.
- ⚠️ **不要 commit。** 告诉用户你改了什么，等用户说"可以 commit"后执行：`git commit -m "[T005] chore: clean up imports after SmartDrawer unification"`。未经确认绝对不要 commit。
