# Module Spec: Report Analysis

> Status: PLANNED — first P1/Post-MVP feature after launch readiness as of 2026-05-20 | Self-reviewed: 2026-03-14 | Second-pass reviewed: 2026-03-14 | Implementation status: Requires fresh SOP v2.4 refresh before implementation
> Module: report-analysis
> Routes: `/reports`, `/reports/upload`, `/reports/[id]`
> Branch: `feature/report-analysis`
> SOP v2.4 status: Requires refresh before implementation; current-code facts and external storage claims must use line/source evidence.
> Planning note — 2026-05-20: Report Analysis is desired immediately after MVP readiness, but it is not part of the current MVP acceptance baseline. Do not implement from this historical spec directly; reopen with fresh external evidence, privacy/upload/security review, provider-neutral public copy, and a dedicated branch.

---

## 0. Planning Baseline

This spec was re-checked against:

- The current repo structure and scripts in `/Users/jamesguu/qimi-ai-website/qimi-ai-website`
- The canonical Layer 1 architecture in `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/system-architecture.md`
- The cross-platform blueprint in `/Users/jamesguu/WeChatProjects/adhdhelper-cursor/docs/项目技术蓝图.md`
- Membership and billing are not implemented yet; there is no current `pages/api/user/subscription.ts` route and no `users.subscription_tier` column in the local initial schema.
- Existing review notes in `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/technical-decisions-for-review.md`
- Official Supabase Storage guidance for private buckets and signed URLs

### Current Implementation Snapshot

- Route `/reports` is not implemented yet
- No `pages/api/reports/*` endpoints exist yet
- No `components/Reports/*` directory exists yet
- There is a report-analysis test file, but the module itself is not present in the current branch

### Historical MVP Boundary

- Historical plan: this module covered single-image report upload, analysis, history, and deletion
- It does not include multi-page batches in this pass
- It does not include PDF uploads in this pass
- It does not include report-to-chat follow-up or plan extraction in this pass

Current decision: this boundary must be revalidated before implementation. In particular, image upload, report storage, AI processor disclosure, retention, user demand, and privacy disclosure all need a fresh review. Do not name specific AI model vendors in user-visible product copy, legal pages, API responses, or public documentation.

### 0.1 Post-MVP Reopen Requirements

Before implementation starts, create a fresh P1 plan that answers:

- Upload boundary: authenticated users only; no guest upload; strict server-side file size limit; explicit allowed extensions; MIME check plus file signature sniffing; reject ambiguous or executable content.
- Storage boundary: private Supabase Storage bucket only; store `storage_path`, never a public URL; generate short-lived signed URLs only after ownership checks; delete both storage object and DB row on user delete/report delete.
- Privacy boundary: reports are sensitive child/family records; analytics must not store report titles, file names, OCR text, analysis text, diagnosis, medication, or uploaded file metadata.
- AI boundary: disclose third-party AI processing generically in privacy copy; do not expose model/vendor names in frontend, public docs, user-visible errors, or API responses.
- Safety boundary: report interpretation can summarize visible findings, explain terms, and suggest questions to ask clinicians; it must not diagnose, prescribe, change medication dosage, or replace a professional evaluation.
- Abuse/cost boundary: enforce auth, quota, rate limit, payload limit, provider timeout, retry cap, and safe failure behavior before any external AI call.

### Execution Baseline

- This repo currently has `build`, but does not define `lint` or `test` npm scripts
- Validation commands in the task list therefore use `npx eslint`, `npx tsc --noEmit`, and `npm run build`

## 1. Feature Requirements

### 1.1 Report Upload (`/reports/upload`)

Users can upload a JPG or PNG image of a medical or psychological report.

- Drag-and-drop or click-to-upload image input
- Preview of selected image before submission
- Client-side file size validation (free: 5MB max, pro: 20MB max)
- File type validation (JPG/PNG only — no PDF for MVP)
- Optional report title field (defaults to "Report — {date}" if left blank)
- On submit: upload image to Supabase Storage, create report record with status `uploading`, then immediately trigger analysis
- Show `AnalysisStatus` component to communicate progress to user
- One image per report (no multi-page support for MVP)
- Medical disclaimer displayed below the upload form

### 1.2 Report History (`/reports`)

Users can see all previously uploaded reports.

- List of `ReportCard` components ordered by `created_at DESC`
- Each card shows: report title, upload date, status badge
- Click a card to navigate to `/reports/[id]`
- Upload button in page header links to `/reports/upload`
- Empty state when no reports exist yet
- Free tier usage indicator (e.g., "1 of 1 reports used this month")
- Medical disclaimer in page footer

### 1.3 Report View (`/reports/[id]`)

Users can view the original image and the AI-generated analysis side by side.

- Left panel: `ReportImage` component (click to enlarge)
- Right panel: `ReportAnalysis` component (structured text with sections and bullet points)
- `AnalysisStatus` badge in the header (shows current status)
- Delete button with confirmation prompt
- Back link to `/reports`
- Medical disclaimer prominently displayed above the analysis
- If status is `analyzing`, poll `GET /api/reports/[id]` every 3 seconds until status changes

### 1.4 Auth & Access

- All three pages require login
- Open the shared login modal if no session
- Guest users cannot access report analysis

### 1.5 Quota Rules

| Tier | Max reports/month | Max image size |
|------|-------------------|----------------|
| Registered MVP/P1 | TBD in fresh P1 plan | TBD in fresh P1 plan |
| Future paid tier | Future billing decision | Future billing decision |

Quota enforcement must happen server-side in `POST /api/reports/upload`. Do not rely on client-side counters.

### 1.6 Storage And Privacy Rule

- Report files are treated as sensitive user medical or educational records
- Files must be stored in a private Supabase Storage bucket
- The database stores `storage_path`, not a public asset URL
- API routes generate short-lived signed URLs when the UI needs to display an image
- Upload API must validate size, extension, MIME type, and file signature server-side before storage
- Delete paths must remove both DB rows and storage objects

### 1.7 Out of Scope for MVP

- No PDF upload (images only)
- No multi-page reports (one image per report)
- No report sharing or export
- No automated follow-up action plan recommendations (Growth Plan module responsibility)

---

## 2. Database Schema

Migration source of truth: create a new versioned migration under `supabase/migrations/`.

Legacy draft name from older planning: `supabase/report-analysis_tables.sql` (do not use as the deployment source of truth).

```sql
-- ===========================================
-- Reports Table
-- ===========================================
CREATE TABLE IF NOT EXISTS reports (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT    NOT NULL,
  storage_path  TEXT    NOT NULL,
  mime_type     TEXT    NOT NULL,
  file_size     INTEGER NOT NULL,
  analysis      TEXT,
  status        TEXT    NOT NULL DEFAULT 'uploading'
                  CHECK (status IN ('uploading', 'analyzing', 'completed', 'failed')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_user_id
  ON reports(user_id);

CREATE INDEX IF NOT EXISTS idx_reports_user_created
  ON reports(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies (auth enforced server-side via service_role key)
CREATE POLICY "reports_select" ON reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reports_update" ON reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reports_delete" ON reports FOR DELETE USING (auth.uid() = user_id);

-- Auto-update trigger
DROP TRIGGER IF EXISTS reports_updated_at ON reports;
CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

---

## 3. Image Storage

- Supabase Storage bucket: `reports-private`
- Path pattern: `{user_id}/{report_id}.{ext}` (ext = `jpg` or `png`)
- All uploads go server-side via `getSupabaseAdmin()` — never direct from browser
- Store `storage_path` in the `reports` table, not a public URL
- The read API generates a short-lived signed URL for the current user when needed
- On delete: remove the file from storage AND the database row

---

## 4. API Routes

All routes under `pages/api/reports/`.

### 4.1 `GET /api/reports` — List reports

**Response (200):**
```json
{
  "reports": [
    {
      "id": "uuid",
      "title": "Neuropsych Evaluation — 2026-02-22",
      "status": "completed",
      "createdAt": "2026-02-22T10:30:00Z"
    }
  ]
}
```

**Logic:**
1. Auth check (`getServerSession` → 401 if no email)
2. Get-or-create user by email (follow `conversations/index.ts` pattern — PGRST116 handling)
3. Query `reports` for this user ordered by `created_at DESC`
4. Return array with `id`, `title`, `status`, `createdAt` (no image_url or analysis in list response)

---

### 4.2 `POST /api/reports/upload` — Upload image and create report record

**Request:** `multipart/form-data`
- `file` — image file (JPG or PNG)
- `title` — optional string (default: `"Report — {YYYY-MM-DD}"`)

**Response (201):**
```json
{
  "report": {
    "id": "uuid",
    "title": "Neuropsych Evaluation — 2026-02-22",
    "status": "uploading",
    "createdAt": "2026-02-22T10:30:00Z"
  }
}
```

**Response (400):**
```json
{ "error": "File too large. Free plan limit is 5MB." }
```

```json
{ "error": "Report limit reached. Free plan allows 1 report per month." }
```

**Config (disable Next.js body parser):**
```ts
export const config = { api: { bodyParser: false } };
```

**Logic:**
1. Auth check
2. Parse multipart form with `formidable` [NEEDS_DEPENDENCY: formidable]
3. Validate file type: check MIME header AND magic bytes (first 4 bytes: JPEG = `FF D8 FF`, PNG = `89 50 4E 47`). Reject if either check fails.
4. Get-or-create user by email
5. Quota check: count reports in current calendar month for this user. Until membership-billing exists, all registered users are Free; reject if count >= 1.
6. Validate file size against current entitlement (Free default: 5MB = 5,242,880 bytes; future Pro: 20MB = 20,971,520 bytes)
7. Generate a new UUID for the report ID
8. Upload image buffer to the private Supabase Storage bucket at `{user_id}/{report_id}.{ext}` using `supabaseAdmin.storage`
9. Insert row into `reports` with `storage_path`, `mime_type`, `file_size`, and `status = 'uploading'`
10. **Resource cleanup**: If DB insert fails after storage upload succeeded, delete the uploaded file from storage before returning error
11. Return the report record (status 201)

Note: The route does NOT trigger analysis automatically. The page calls `/api/reports/analyze` separately after receiving the 201 response. This keeps the upload fast and lets the UI show progress.

---

### 4.3 `POST /api/reports/analyze?id=uuid` — Trigger AI analysis

**Response (200):**
```json
{
  "report": {
    "id": "uuid",
    "status": "completed",
    "analysis": "**Report Type:** Neuropsychological Evaluation\n\n**Key Findings:** ..."
  }
}
```

**Response (404):**
```json
{ "error": "Report not found" }
```

**Logic:**
1. Auth check
2. Get-or-create user by email
3. Fetch the report by `id`, confirm it belongs to this user (return 404 if not found or not owned)
4. Update status to `analyzing`
5. Create a short-lived signed URL for the private image object
6. Check if `VISION_AI_API_URL` and `VISION_AI_API_KEY` env vars are set
   - If NOT set: set `analysis` to the placeholder string below, set `status = 'completed'`, save, return
   - If set: call the configured vision AI provider (see section 5 below)
7. On provider success: save `analysis` text, set `status = 'completed'`
8. On provider error: set `status = 'failed'`, save, return the error response with status 200 (not 500) so the UI can display the failed state gracefully

**Placeholder analysis (used when `VISION_AI_API_URL` is not configured):**
```
AI analysis is not yet configured. Please check back later.
```

---

### 4.4 `GET /api/reports/[id]` — Get single report

**Response (200):**
```json
{
  "report": {
    "id": "uuid",
    "title": "Neuropsych Evaluation — 2026-02-22",
    "imageUrl": "https://signed-url.example/...",
    "analysis": "**Report Type:** ...",
    "status": "completed",
    "createdAt": "2026-02-22T10:30:00Z"
  }
}
```

**Response (404):**
```json
{ "error": "Report not found" }
```

**Logic:**
1. Auth check
2. Get-or-create user by email
3. Query `reports` by `id`, confirm `user_id` matches (return 404 if not)
4. Generate a short-lived signed URL from `storage_path`
5. Return full report including signed `imageUrl` and `analysis`

---

### 4.5 `DELETE /api/reports/[id]` — Delete report and image

**Response (204):** No body

**Response (404):**
```json
{ "error": "Report not found" }
```

**Logic:**
1. Auth check
2. Get-or-create user by email
3. Fetch report, confirm ownership (return 404 if not found or not owned)
4. Delete image from Supabase Storage using the stored `storage_path`
5. Delete row from `reports`
6. Return 204

---

## 5. Vision AI Integration

### Environment Variables

```
VISION_AI_API_URL=https://provider.example/v1/chat/completions
VISION_AI_API_KEY=your_key_here
```

### Request Format

Send the image using a short-lived signed URL generated server-side from the private bucket.

```ts
const response = await fetch(process.env.VISION_AI_API_URL!, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.VISION_AI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  signal: AbortSignal.timeout(30000), // 30s timeout for vision model
  body: JSON.stringify({
    model: process.env.VISION_AI_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: signedImageUrl },
          },
          {
            type: 'text',
            text: REPORT_ANALYSIS_PROMPT,
          },
        ],
      },
    ],
    max_tokens: 1500,
  }),
});
```

### Analysis Prompt

```
Analyze this medical or psychological report. Provide a structured summary with these four sections:

1. Report Type — What kind of report is this (e.g., neuropsychological evaluation, blood panel, behavioral assessment)?
2. Key Findings — What are the main results or scores noted in the report?
3. Areas of Concern — Are there any results outside normal ranges or flagged items?
4. Recommendations — What follow-up actions or next steps does the report suggest?

Write in plain, friendly language that a parent can understand. Avoid medical jargon where possible, and briefly explain any terms you must use. End your response with this exact sentence: "This summary is not a substitute for professional medical advice. Please discuss these results with your child's healthcare provider."
```

Store the full text response from the model as the `analysis` field.

---

## 6. Frontend Components

All under `components/Reports/`.

### 6.1 `ReportUploader.tsx`

Drag-and-drop or click-to-upload file input. Props: `onUpload(file: File, title: string) => void`, `isLoading: boolean`, `userTier: 'free' | 'pro'`.

- Dashed border drop zone with upload icon and "Drop image here or click to browse" text
- Shows file preview (thumbnail) after file is selected, before submit
- File type check: accept only `.jpg`, `.jpeg`, `.png`
- Client-side size validation before submit (free: 5MB, pro: 20MB) — display error inline
- Title input field above the drop zone (placeholder: "Report title (optional)")
- Submit button disabled while `isLoading` is true
- Tailwind only. Teal (#00D4AA) primary, dashed border on drop zone

### 6.2 `ReportCard.tsx`

Card for the report list. Props: `id: string`, `title: string`, `status: string`, `createdAt: string`.

- Displays report title, formatted date (`toLocaleDateString()`), and `AnalysisStatus` badge
- Entire card is clickable, navigates to `/reports/{id}`
- Hover state: slight shadow elevation
- Tailwind card styling consistent with existing landing/chat cards

### 6.3 `ReportAnalysis.tsx`

Displays the AI-generated analysis text. Props: `analysis: string | null`, `status: string`.

- If `status` is `analyzing`: show a pulsing "Analyzing your report..." placeholder with a spinner
- If `status` is `failed`: show "Analysis failed. Please try again." with a retry button (calls `/api/reports/analyze`)
- If `analysis` is populated: render the text with the existing `react-markdown` dependency
- Medical disclaimer line at the bottom styled in muted text (`text-gray-500 text-sm italic`)

### 6.4 `ReportImage.tsx`

Displays the report image. Props: `imageUrl: string`, `title: string`.

- `<img>` tag with `object-contain` styling, max height `400px` in default view
- Click to enlarge: clicking image opens a full-screen overlay (fixed position, dark backdrop)
- Overlay has a close button (X) and shows the image at up to `90vw` / `90vh`
- No external lightbox library — implement overlay with Tailwind + React state

### 6.5 `AnalysisStatus.tsx`

Status badge. Props: `status: string`.

| Status | Color | Label |
|--------|-------|-------|
| `uploading` | yellow | Uploading |
| `analyzing` | blue (pulse animation) | Analyzing |
| `completed` | green | Complete |
| `failed` | red | Failed |

- Small pill badge with dot indicator
- Pulse animation on `analyzing` using Tailwind `animate-pulse`

---

## 7. Pages

### 7.1 `pages/reports/index.tsx` — Report list

```
AppLayout
├── Head: "My Reports - Qimi AI"
├── Page header: "My Reports" + Upload button (→ /reports/upload)
├── Free tier usage notice (if free user): "1 of 1 reports used this month"
├── Report list: map over reports → ReportCard
├── Empty state (if no reports): "No reports yet. Upload your first report."
└── Medical disclaimer (footer)
```

Auth pattern: `useSession()` → loading skeleton → redirect if no session → render content.
Fetch `GET /api/reports` on mount.

### 7.2 `pages/reports/upload.tsx` — Upload page

```
AppLayout
├── Head: "Upload Report - Qimi AI"
├── Page header: "Upload a Report" + back link (← My Reports)
├── Medical disclaimer (above the form, prominent)
├── ReportUploader
└── AnalysisStatus (shown after upload begins, while analyzing)
```

Auth pattern: same as above.

**Upload flow:**
1. User selects file and (optional) title, clicks submit
2. POST to `/api/reports/upload` — on success, store `report.id` in local state, set status to `uploading`
3. POST to `/api/reports/analyze?id={report.id}` — show `analyzing` status
4. On analysis complete: `router.push('/reports/{report.id}')`
5. On any error: show inline error message, allow retry

### 7.3 `pages/reports/[id].tsx` — Single report view

```
AppLayout
├── Head: "{report.title} - Qimi AI"
├── Page header: report title + AnalysisStatus badge + Delete button
├── Back link: ← My Reports
├── Medical disclaimer (above analysis panel, prominent)
├── Two-column layout (stacks on mobile):
│   ├── Left: ReportImage
│   └── Right: ReportAnalysis
└── (no footer needed — disclaimer is inline)
```

Auth pattern: same as above.

Fetch `GET /api/reports/[id]` on mount. If status is `analyzing`, poll every 3 seconds until status changes (clear interval on component unmount). On delete: call `DELETE /api/reports/[id]`, then `router.push('/reports')`.

---

## 7.4 Error Boundary & Accessibility

- **Error Boundary**: Use AppLayout's built-in error handling. Analysis polling should gracefully handle network errors without crashing the page.
- **Accessibility**: `ReportImage` must have `alt={title}` on the `<img>` tag. Upload drop zone must be keyboard-accessible with `role="button"` and `aria-label="Upload report image"`. Status badges should use `aria-label` to convey status to screen readers.

---

## 8. Acceptance Criteria

- [ ] Authenticated user can upload a JPG or PNG image
- [ ] Image is stored in Supabase Storage under `{user_id}/{report_id}.{ext}`
- [ ] Report record is created in `reports` table with correct status progression
- [ ] Analysis endpoint works with placeholder response when `VISION_AI_API_KEY` is not set
- [ ] Analysis endpoint calls the configured vision AI provider and stores result when API key is configured
- [ ] Report list displays all user reports ordered by date
- [ ] Single report view shows image + formatted analysis side by side
- [ ] Delete removes both the DB row and the image from Supabase Storage
- [ ] Free tier quota (1 report/month) is enforced server-side
- [ ] File size limits enforced both client-side and server-side
- [ ] Medical disclaimer appears on every page and at the end of every analysis
- [ ] `AnalysisStatus` badge reflects correct state at all times
- [ ] Polling stops when status reaches `completed` or `failed`
- [ ] Unauthenticated users are blocked from protected report pages and prompted via the shared login modal
- [ ] Mobile responsive (two-column view collapses to single column on small screens)
- [ ] `npx eslint` passes for touched files
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes

---

## 9. Execution Task List

### Task Execution Metadata

- Implementation mode: `linear`
- Acceptance mode: `single-item gate`
- Machine gate:
  - required checks: `npx eslint`, `npx tsc --noEmit`, `npm run build`
  - smoke test: upload, analyze, view, and delete flows must work manually for the affected slice
  - contract consistency check: route, storage model, quota logic, and response shape must remain aligned with `/docs/system-architecture.md` and this spec
- Human gate: allowed only after machine gate passes and P0/P1 review findings are zero

Each task is one file (or closely related pair of files). Execute in order.

### T001: Create database migration
- **File**: new `supabase/migrations/{timestamp}_report_analysis_tables.sql`
- **Do**: Copy the SQL from section 2 above. Save the file.
- **Verify**: File exists with correct SQL including RLS policies and indexes.
- **Commit**: `[T001] feat: add reports table migration`

### T002: Create GET /api/reports (list)
- **File**: `pages/api/reports/index.ts`
- **Do**: Handle `GET` only. Auth check, get-or-create user, query `reports` ordered by `created_at DESC`, return `{ reports: [...] }` with `id`, `title`, `status`, `createdAt` fields.
- **Reference**: Follow `pages/api/conversations/index.ts` pattern exactly (auth, get-or-create user with PGRST116 handling, camelCase response, error logging with `[reports]` prefix).
- **Verify**: `npx eslint pages/api/reports/index.ts` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T002] feat: add GET /api/reports list endpoint`

### T003: Create POST /api/reports/upload (file upload)
- **File**: `pages/api/reports/upload.ts`
- **Do**: Handle `POST` with `multipart/form-data`. Parse with `formidable`. Validate file type and size. Enforce quota. Upload to Supabase Storage. Insert report row. Return 201 with report record.
- **Config**: Export `export const config = { api: { bodyParser: false } };` at top of file.
- **Dependency check**: Check `package.json` for `formidable`. If missing, add `[NEEDS_DEPENDENCY: npm install formidable @types/formidable]` to commit message and install it before coding.
- **Quota logic**: Count rows in `reports` where `user_id = {user_id}` and `created_at >= start of current month`. Until membership-billing exists, treat all registered users as Free and reject at >= 1.
- **Storage rule**: Upload to the private `reports-private` bucket and save `storage_path` instead of a public URL.
- **Verify**: `npx eslint pages/api/reports/upload.ts` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T003] feat: add POST /api/reports/upload endpoint [NEEDS_DEPENDENCY: formidable]`

### T004: Create POST /api/reports/analyze (vision AI or placeholder)
- **File**: `pages/api/reports/analyze.ts`
- **Do**: Handle `POST`. Accept `?id=uuid`. Auth check, fetch report, verify ownership, update status to `analyzing`, create a short-lived signed URL from the private bucket, call the configured vision AI provider if env vars are set (else use placeholder), save result, return updated report.
- **Prompt**: Use the exact prompt string from section 5 above.
- **Error handling**: On vision AI provider failure, set `status = 'failed'` and return gracefully with status 200 (not 500).
- **Verify**: `npx eslint pages/api/reports/analyze.ts` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T004] feat: add POST /api/reports/analyze with vision AI and placeholder fallback`

### T005: Create GET and DELETE /api/reports/[id]
- **File**: `pages/api/reports/[id].ts`
- **Do**: Handle `GET` (return full report plus short-lived signed image URL) and `DELETE` (remove image from storage + delete row). Return 204 on delete. Return 404 if report not found or not owned by session user.
- **Storage delete**: Use the stored `storage_path` directly instead of reconstructing it from a public URL.
- **Verify**: `npx eslint pages/api/reports/[id].ts` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T005] feat: add GET and DELETE /api/reports/[id] endpoints`

### T006: Create AnalysisStatus and ReportUploader components
- **Files**: `components/Reports/AnalysisStatus.tsx`, `components/Reports/ReportUploader.tsx`
- **Do**: `AnalysisStatus` — colored pill badge with dot + label per status table in section 6.5. `ReportUploader` — drag-and-drop zone, file preview, title input, client-side validation, submit button.
- **Styling**: Tailwind only. Teal (#00D4AA) primary.
- **Verify**: `npx eslint components/Reports/AnalysisStatus.tsx components/Reports/ReportUploader.tsx` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T006] feat: add AnalysisStatus and ReportUploader components`

### T007: Create ReportCard and ReportImage components
- **Files**: `components/Reports/ReportCard.tsx`, `components/Reports/ReportImage.tsx`
- **Do**: `ReportCard` — clickable card with title, formatted date, status badge. `ReportImage` — image display with click-to-enlarge full-screen overlay (React state, no external library).
- **Verify**: `npx eslint components/Reports/ReportCard.tsx components/Reports/ReportImage.tsx` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T007] feat: add ReportCard and ReportImage components`

### T008: Create ReportAnalysis component
- **File**: `components/Reports/ReportAnalysis.tsx`
- **Do**: Render analysis text with the existing `react-markdown` dependency. Handle `analyzing` spinner state, `failed` state with retry button, and `completed` state with formatted text. Medical disclaimer at bottom.
- **Verify**: `npx eslint components/Reports/ReportAnalysis.tsx` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T008] feat: add ReportAnalysis component`

### T009: Create /reports page (list)
- **File**: `pages/reports/index.tsx`
- **Do**: Auth check with `useSession()`. Fetch `GET /api/reports` on mount. Render list of `ReportCard`. Show empty state and free tier usage notice. Medical disclaimer in footer.
- **Reference**: Auth pattern from CLAUDE.md. `AppLayout` from `components/Layout/AppLayout`.
- **Verify**: `npx eslint pages/reports/index.tsx` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T009] feat: add /reports list page`

### T010: Create /reports/upload page
- **File**: `pages/reports/upload.tsx`
- **Do**: Auth check. Render `ReportUploader`. On submit: call upload API, then analyze API, then redirect to `/reports/{id}` on success. Show `AnalysisStatus` while in progress. Show inline error on failure. Medical disclaimer above form.
- **Verify**: `npx eslint pages/reports/upload.tsx` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T010] feat: add /reports/upload page`

### T011: Create /reports/[id] page (report view)
- **File**: `pages/reports/[id].tsx`
- **Do**: Auth check. Fetch `GET /api/reports/[id]` on mount. If status is `analyzing`, poll every 3 seconds (clear interval on unmount). Render two-column layout: `ReportImage` (left) + `ReportAnalysis` (right), stacked on mobile. Delete button with confirmation. Medical disclaimer above analysis panel.
- **Verify**: `npx eslint pages/reports/[id].tsx` passes, `npx tsc --noEmit` passes, `npm run build` passes.
- **Commit**: `[T011] feat: add /reports/[id] report view page`

### T012: Add unit tests
- **File**: `__tests__/report-analysis.test.ts`
- **Do**: Test quota enforcement logic, file type validation, file signature validation, ownership checks, and placeholder analysis when `VISION_AI_API_KEY` is undefined.
- **Verify**: add the test file together with the chosen test runner setup for this repo, then ensure `npx eslint`, `npx tsc --noEmit`, and `npm run build` still pass.
- **Commit**: `[T012] test: add report analysis unit tests`
