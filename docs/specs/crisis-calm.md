# Module Spec: Crisis Calm

> Status: ARCHIVED — 2026-05-20 | Self-reviewed: 2026-03-14 | Second-pass reviewed: 2026-03-14 | Implementation status: Archived / Deferred from MVP
> Module: crisis-calm
> Routes: `/calm`
> Branch: `feature/crisis-calm`

> SOP v2.4 status: Requires refresh before implementation; accessibility and crisis-support claims need source evidence, and current-code facts must use line evidence.
> Archive note — 2026-05-20: User explicitly deferred Crisis Calm from the MVP roadmap. Do not implement from this historical spec unless the module is reopened and refreshed under the current SOP and compliance posture.

---

## 0. Planning Baseline

This spec was re-checked against:

- The current repo structure and scripts in `/Users/jamesguu/Library/CloudStorage/OneDrive-个人/work/Million Dollar Business/qimi-website`
- The canonical Layer 1 architecture in `/Users/jamesguu/Library/CloudStorage/OneDrive-个人/work/Million Dollar Business/qimi-website/docs/system-architecture.md`
- The cross-platform blueprint in `/Users/jamesguu/WeChatProjects/adhdhelper-cursor/docs/项目技术蓝图.md`
- Existing implementation notes in `/Users/jamesguu/Library/CloudStorage/OneDrive-个人/work/Million Dollar Business/qimi-website/docs/technical-decisions-for-review.md`
- Official accessibility guidance for `aria-live` and `prefers-reduced-motion`

### Current Implementation Snapshot

- Route `/calm` is not implemented yet; no `pages/calm.tsx` was found in the current branch on 2026-05-06.
- There is no full `components/CrisisCalm/*` module set in the current branch.
- There is one partial prototype component: `components/CrisisCalm/BreathingHalo.tsx:L1-L53`.

### MVP Boundary

- This module covers a single fullscreen calming page with breathing guidance and rotating reassurance text
- It does not include persisted session history
- It does not include audio playback in this pass
- It does not include therapist escalation flows, crisis chat, or emergency contact storage

### Execution Baseline

- This repo currently has `build`, but does not define `lint` or `test` npm scripts
- Validation commands in the task list therefore use `npx eslint`, `npx tsc --noEmit`, and `npm run build`

## 1. Feature Requirements

### 1.1 Breathing Exercise (`/calm`)

A fullscreen, visually guided breathing exercise (inhale 4s, hold 4s, exhale 6s).

- Animated SVG circle that expands during inhale, holds at full size, then contracts during exhale
- Text prompt inside or below the circle matches the current phase ("Breathe In", "Hold", "Breathe Out")
- Phase timer counts down within the current phase (e.g., "4", "3", "2", "1")
- State machine cycles automatically: inhale (4s) → hold (4s) → exhale (6s) → repeat
- Smooth CSS transitions — no jarring snaps between phases

### 1.2 Calming Affirmations

One affirmation displayed at a time, auto-rotating every 8 seconds with a fade transition.

- Affirmation list (hardcoded in component, no API):
  - "You are safe."
  - "This feeling will pass."
  - "You are doing your best."
  - "Take it one breath at a time."
  - "You are not alone."
  - "It is okay to rest."
  - "You have gotten through this before."
- Fade out current text, fade in next text (CSS opacity transition, 0.5s)
- No manual skip controls (MVP — auto-rotate only)

### 1.3 Session Timer

Shows how long the user has been in calm mode since arriving at `/calm`.

- Format: MM:SS (e.g., "03:47")
- Starts at 00:00 when page mounts, counts up every second
- No forced minimum session time — user can exit immediately
- Timer display is subtle (small text, low contrast) so it does not distract

### 1.4 Exit Button

Always visible. Returns user to whatever page they came from.

- Uses `router.back()` — no hardcoded destination
- Positioned top-right corner (consistent with modal/fullscreen conventions)
- Label: "Exit" with a close icon (X)
- Never hidden, even during active breathing animation

### 1.5 Reduced Motion And Accessibility

- Breathing phase text uses `aria-live="polite"` so assistive technology can announce phase changes
- If the user prefers reduced motion, the page falls back to a static halo plus countdown text instead of continuous scale animation
- Text contrast remains readable on mobile and in low-light conditions
- No flashing or abrupt motion is introduced

### 1.6 Auth and Access

- No auth required — this is an emergency tool
- No `useSession()` check, no redirect to `/login`
- Accessible to guests, logged-in users, and anyone with the URL
- Page does NOT use `AppLayout` (no Sidebar, no top navigation)

### 1.7 Medical Disclaimer

- A single line of small text at the bottom of the page:
  `"Not a substitute for professional medical advice. If you are in crisis, call 988 (Suicide & Crisis Lifeline)."`
- Color: `text-slate-500` (low contrast to not dominate, but readable)

---

## 2. Database Schema

None. This module has no database tables.

All state is local to the component (React `useState` + `useEffect`). Nothing is persisted.

---

## 3. API Routes

None. This module has no API routes.

All logic is client-side only.

---

## 4. Frontend Components

All under `components/CrisisCalm/`.

### 4.1 `BreathingCircle.tsx`

Animated SVG circle with three-phase breathing state machine.

- Props: none (self-contained, manages its own state)
- Internal state: `phase: 'inhale' | 'hold' | 'exhale'`, `countdown: number`
- Phase durations: inhale = 4000ms, hold = 4000ms, exhale = 6000ms
- SVG circle: use `transform: scale()` to animate from small (inhale start) to large (inhale end / hold) to small (exhale end)
- Use CSS `transition: transform <duration>s ease-in-out` on the SVG circle element for smooth animation (do NOT animate the `r` attribute directly — `r` transitions are unreliable cross-browser)
- Circle color: teal `#00D4AA` with low-opacity fill (`fill-opacity: 0.2`) and teal stroke
- Existing `BreathingHalo.tsx` may be reused as a decorative background layer if it helps visual polish, but it is optional and not the canonical state machine component
- Text prompt rendered below or centered inside the circle: "Breathe In" / "Hold" / "Breathe Out"
- Countdown number rendered in smaller text below the prompt
- `useEffect` with `setInterval` drives the state machine; clean up on unmount
- Respect `prefers-reduced-motion`: render a static circle/halo and continue updating only the text countdown when reduced motion is requested

### 4.2 `AffirmationCarousel.tsx`

Rotating affirmation text with CSS fade transition.

- Props: none (self-contained, hardcoded affirmation list)
- Internal state: `currentIndex: number`, `visible: boolean` (for fade)
- Rotation interval: 8000ms
- Transition: set `visible = false` (fade out, 500ms) → update index → set `visible = true` (fade in, 500ms)
- Tailwind classes: `transition-opacity duration-500` toggling `opacity-0` / `opacity-100`
- Text styling: `text-xl text-slate-200 text-center italic font-light`
- `useEffect` with `setInterval`; clean up on unmount

### 4.3 `CalmTimer.tsx`

Elapsed time display in MM:SS format.

- Props: none (self-contained, starts on mount)
- Internal state: `seconds: number`
- `useEffect` with `setInterval` incrementing every 1000ms; clean up on unmount
- Formatting: `String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0')`
- Styling: `text-sm text-slate-500 tabular-nums` (subtle, non-distracting)
- Label above counter: `"Time in calm mode"` in `text-xs text-slate-600`

### 4.4 `CalmControls.tsx`

Exit button, always visible.

- Props: none (self-contained)
- Exit button: calls `router.back()` from `next/router`
  - Styling: `fixed top-4 right-4 flex items-center gap-2 text-slate-300 hover:text-white transition-colors`
  - Label: "Exit" with close icon
  - Prefer the existing `lucide-react` dependency for the icon instead of hand-rolled inline SVG

---

## 5. Pages

### 5.1 `pages/calm.tsx` — Fullscreen calming page

No AppLayout wrapper. Dark background. Composes all four components.

```
<div> (fullscreen, bg-slate-900)
├── CalmControls (fixed, top-right)
├── Main centered column
│   ├── Heading: "Take a moment" (text-2xl text-white)
│   ├── BreathingCircle
│   ├── AffirmationCarousel
│   └── CalmTimer
└── Medical disclaimer (fixed, bottom, text-center)
```

Implementation notes:
- No `import AppLayout` — this page intentionally has no navigation
- `<Head>` title: `"Crisis Calm — Qimi AI"`
- Root div: `min-h-screen bg-slate-900 flex flex-col items-center justify-center relative`
- Medical disclaimer: `fixed bottom-4 left-0 right-0 text-center text-xs text-slate-500 px-4`
- Disclaimer text: `"Not a substitute for professional medical advice. If you are in crisis, call 988 (Suicide & Crisis Lifeline)."`
- No auth check (`useSession` not imported)
- Mobile-first: all layout uses flex column, centered, full width on small screens

---

## 5.2 Error Boundary & Accessibility

- **Error handling**: Do not introduce a custom page-local error boundary in this MVP pass. Keep the page simple and deterministic; if later incidents show the need, this can move to a shared error-handling pattern.
- **Accessibility**: Breathing animation should include `aria-live="polite"` on the phase text so screen readers announce phase changes. Respect `prefers-reduced-motion` and avoid fake controls that imply unavailable capabilities.

---

## 6. Acceptance Criteria

- [ ] `/calm` page renders fullscreen with dark background (no Sidebar, no top nav)
- [ ] Breathing circle animates through inhale / hold / exhale cycle automatically
- [ ] Breathing phase text and countdown update correctly with each phase
- [ ] Affirmations rotate every 8 seconds with a fade transition
- [ ] Session timer counts up from 00:00 from the moment the page loads
- [ ] Exit button is always visible and calls `router.back()`
- [ ] Medical disclaimer with 988 hotline is visible at the bottom
- [ ] No login required — page is accessible without a session
- [ ] No auth redirect occurs for guests
- [ ] Page is mobile responsive (centered layout, readable on 375px width)
- [ ] Reduced motion mode shows a static visual instead of animated scaling
- [ ] `npx eslint` passes with no new warnings
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes

---

## 7. Execution Task List

### Task Execution Metadata

- Implementation mode: `linear`
- Acceptance mode: `single-item gate`
- Machine gate:
  - required checks: `npx eslint`, `npx tsc --noEmit`, `npm run build`
  - smoke test: open `/calm` and verify breathing, affirmation rotation, timer, and exit flow manually
  - contract consistency check: route, auth-free access, and fullscreen layout must remain aligned with `/docs/system-architecture.md` and this spec
- Human gate: allowed only after machine gate passes and P0/P1 review findings are zero

Each task is one file. Execute in order.

### T001: Create BreathingCircle component
- **File**: `components/CrisisCalm/BreathingCircle.tsx`
- **Do**: SVG circle with `useEffect` state machine (inhale 4s → hold 4s → exhale 6s). Animate via CSS `transform: scale()` transition (NOT `r` attribute). Render phase text ("Breathe In" / "Hold" / "Breathe Out") and countdown number. No props — fully self-contained. Respect `prefers-reduced-motion` by falling back to a static visual.
- **Styling**: Teal circle (`stroke: #00D4AA`, low-opacity teal fill). `text-white` for text prompts. Smooth transitions — no jarring snaps.
- **Verify**: `npx eslint` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T001] feat: add BreathingCircle component with state machine`

### T002: Create AffirmationCarousel component
- **File**: `components/CrisisCalm/AffirmationCarousel.tsx`
- **Do**: Hardcoded array of 7 affirmations. `useEffect` with 8s interval. Fade out → update index → fade in using `opacity-0`/`opacity-100` Tailwind classes with 500ms CSS transition. No props — fully self-contained.
- **Styling**: `text-xl text-slate-200 text-center italic font-light`. Wrapper: `transition-opacity duration-500`.
- **Verify**: `npx eslint` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T002] feat: add AffirmationCarousel component`

### T003: Create CalmTimer component
- **File**: `components/CrisisCalm/CalmTimer.tsx`
- **Do**: `useEffect` with 1s interval incrementing `seconds` state. Format as MM:SS using `padStart`. Render label "Time in calm mode" above the counter. No props — fully self-contained.
- **Styling**: `text-sm text-slate-500 tabular-nums` for counter, `text-xs text-slate-600` for label.
- **Verify**: `npx eslint` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T003] feat: add CalmTimer component`

### T004: Create CalmControls component
- **File**: `components/CrisisCalm/CalmControls.tsx`
- **Do**: Exit button (fixed top-right, calls `router.back()`, close icon, "Exit" label). No props — fully self-contained.
- **Styling**: `fixed top-4 right-4` for exit. `text-slate-300 hover:text-white transition-colors`. Prefer `lucide-react` because it is already in the repo.
- **Verify**: `npx eslint` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T004] feat: add CalmControls component`

### T005: Create /calm page
- **File**: `pages/calm.tsx`
- **Do**: Fullscreen page, NO AppLayout. `<Head>` with title "Crisis Calm — Qimi AI". Root div: `min-h-screen bg-slate-900 flex flex-col items-center justify-center relative`. Heading: "Take a moment". Compose BreathingCircle, AffirmationCarousel, CalmTimer, CalmControls. Medical disclaimer fixed at bottom. No auth check.
- **Reference**: Do NOT import AppLayout. Do NOT import useSession. This page intentionally bypasses layout and auth.
- **Verify**: `npx eslint` passes, `npx tsc --noEmit` passes, `npm run build` passes. Open `/calm` in browser — fullscreen dark page, animation plays, exit button works.
- **Commit**: `[T005] feat: add /calm fullscreen crisis calm page`
