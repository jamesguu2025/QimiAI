# Technical Decisions for Review

Decisions made during Sprint 2 module development. Each entry documents a non-obvious choice that the maintainer should be aware of.

---

## ~~From Mood Tracking Module (Sprint 2.1)~~ — ARCHIVED (feature cancelled 2026-02-27)

### Decision 10: RLS Policies Scoped to auth.uid()
- **What**: All new tables use `USING(auth.uid() = user_id)` instead of `USING(true)`.
- **Why**: Defense-in-depth. Even though server-side uses `service_role` which bypasses RLS, scoped policies protect against accidental anon-key access.
- **Risk**: None. Service role bypasses RLS regardless.

### Decision 11: 500 Errors Do Not Leak error.message
- **What**: All catch blocks return generic `{ error: 'Internal server error' }` instead of `error.message`.
- **Why**: Prevents leaking database schema details or stack traces to the client.

### Decision 12: UUID Validation on DELETE/PUT Endpoints
- **What**: All endpoints that accept `?id=uuid` validate the format with `/^[0-9a-f]{8}-...$/i` regex before querying the database.
- **Why**: Prevents unnecessary database roundtrips and potential injection vectors.

---

## From Crisis Calm Module (Sprint 2.2)

### Decision 13: CSS transform:scale() Instead of SVG r Attribute Animation
- **What**: Breathing circle uses `transform: scale()` with CSS transition instead of animating the SVG `r` attribute directly.
- **Why**: CSS transitions on the `r` attribute are unreliable cross-browser (some browsers don't support it). `transform: scale()` works everywhere.

### Decision 14: No Auth on /calm Page
- **What**: The `/calm` page has zero auth checks — no `useSession`, no redirect.
- **Why**: This is an emergency crisis tool. A user in distress should not be blocked by a login screen. No data is persisted, so there's no security concern.

### Decision 15: Inline SVG Icons (No Icon Library)
- **What**: CalmControls should prefer the existing `lucide-react` dependency for the exit icon instead of adding hand-rolled icon markup.
- **Why**: The dependency is already in the repo, so reuse is cleaner and more maintainable than bespoke SVG for a simple control.

---

## From User Profile Module (Sprint 2.3)

### Decision 16: Local ChildProfileRow Type (Not Modifying Shared Types)
- **What**: A local `ChildProfileData` interface extends the shared `ChildProfile` type with `id`, `userId`, `createdAt`, `updatedAt` fields.
- **Why**: The shared `ChildProfile` type in `types/user.ts` is a client-facing type without DB row metadata. Per CLAUDE.md concurrency rules, we don't modify shared types. Tagged with `[NEEDS_SHARED_TYPE]` for maintainer to merge.

### Decision 17: Supabase Upsert with onConflict for Child Profile
- **What**: Child profile POST uses Supabase `upsert` with `onConflict: 'user_id'` for idempotent create-or-update.
- **Why**: Simpler than checking existence first, then branching to insert or update. The `UNIQUE(user_id)` constraint on `child_profiles` guarantees one child per user (MVP constraint).

---

## From Growth Plan Module (Sprint 2.4)

### Decision 18: Free-Tier Quota Check Without Subscription Column
- **What**: Growth plan quota should read from `users.subscription_tier` via the existing subscription scaffolding and matching API route.
- **Why**: The repo already contains the subscription column migration path and `/api/user/subscription`, so reusing the real source of truth is more mature than hardcoding all users to free tier.

### Decision 19: Client-Side Category Filtering (No API Round-Trip)
- **What**: Category filter on `/plan` page is client-side only — all items are fetched on mount, filter is applied in-memory.
- **Why**: MVP users will have at most 5 items (free tier). An API round-trip for filtering 5 items is wasteful. If item limits increase later, server-side filtering can be added.

### Decision 20: check_in_days Column Added to Match ActionPlanItem Type
- **What**: Added `check_in_days TEXT[]` column to `plan_items` table.
- **Why**: The shared `ActionPlanItem` type in `types/plan.ts` includes `checkInDays: WeekDay[]`. Without this column, the DB schema wouldn't match the type contract. Original spec missed this column (caught in cross-review).

---

## From Report Analysis Module (Sprint 2.5)

### Decision 21: formidable for Multipart Parsing
- **What**: Uses `formidable` npm package for parsing multipart/form-data uploads. `export const config = { api: { bodyParser: false } }` disables Next.js default body parser.
- **Why**: Next.js doesn't natively parse multipart forms. `formidable` is a well-maintained, lightweight choice. Tagged `[NEEDS_DEPENDENCY]` in commit.

### Decision 22: Placeholder Analysis When GLM API Not Configured
- **What**: When `GLM_API_URL` or `GLM_API_KEY` env vars are missing, the analyze endpoint returns a placeholder string instead of failing.
- **Why**: Allows the full upload → analyze → view flow to work in development without an API key. Makes testing and demo possible.

### Decision 23: Upload and Analyze as Separate API Calls
- **What**: Upload (POST /api/reports/upload) returns immediately with status 'uploading'. The client then calls POST /api/reports/analyze separately.
- **Why**: Keeps upload fast. Analysis can take 10-30 seconds with GLM. Separating them lets the UI show progress states (uploading → analyzing → completed).

### Decision 24: Storage Path Extraction via URL Split for Delete
- **What**: Report records should store `storage_path` directly and use signed URLs only at read time.
- **Why**: Storing the path as first-class data is safer than parsing it back out of a URL, and it aligns with private-bucket usage for sensitive report files.
