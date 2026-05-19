# Module Spec: Compliance — MVP Launch Gate

> Status: PARTIALLY IMPLEMENTED — 2026-05-08 gate refresh. Original approval was 2026-03-17. MVP launch posture is adult-directed and conditional on keeping children from independently creating accounts or using Qimi as the intended user.
> Module: compliance (cross-cutting)
> Routes: `/privacy`, `/terms`, `/settings`, `/consent`
> API routes: `pages/api/user/delete-account.ts`, `pages/api/compliance/consent.ts`, `pages/api/compliance/consent-status.ts`
> Components: `components/Settings/DeleteAccountSection.tsx`
> Branch: `feature/compliance` or current working branch
> Scope: Six minimum-viable compliance items required before public launch. No over-engineering.

---

## 0. Planning Baseline

This spec was written against:

- The compliance gap analysis performed 2026-03-17 (conversation record)
- The canonical Layer 1 architecture in `docs/system-architecture.md`
- `docs/project-control.md` for execution order
- Real code audit of: `lib/system-prompt-lite.ts`, `supabase/schema.sql`, `public/privacy.html`, `public/terms.html`, `public/data-deletion.html`, auth flow, data collection patterns

### SOP v2.4 Refresh Status (2026-05-08)

This is a high-risk compliance spec. Before any public launch decision, create or update an ADR-lite/Search Ledger using official sources and counsel-reviewed product copy.

- FTC COPPA FAQ states operators generally must obtain verifiable parental consent before collecting personal information online from children under 13 when the rule applies, unless an exception applies: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
- FTC verifiable parental consent guidance says the selected method must be reasonably designed, in light of available technology, to ensure the person giving consent is the child's parent: https://www.ftc.gov/business-guidance/privacy-security/verifiable-parental-consent-childrens-online-privacy-rule
- FTC 2026 COPPA age-verification policy statement supports limited age-verification collection for the sole purpose of determining age when stated conditions are met; it does not decide Qimi's adult-directed MVP scope: https://www.ftc.gov/news-events/news/press-releases/2026/02/ftc-issues-coppa-policy-statement-incentivize-use-age-verification-technologies-protect-children
- CPPA's CCPA FAQ defines current applicability by business status plus statutory thresholds, including 100,000 California residents/households and revenue/selling-or-sharing tests; a simple "first 5,000 users" threshold is not the legal test: https://cppa.ca.gov/faq
- HHS states HIPAA applies to covered entities and business associates; health-adjacent consumer apps are not automatically covered unless they meet those definitions: https://www.hhs.gov/hipaa/for-professionals/covered-entities/index.html
- FTC Health Breach Notification Rule can apply to health apps and similar technologies outside HIPAA and needs a Qimi-specific scope decision: https://www.ftc.gov/legal-library/browse/rules/health-breach-notification-rule
- FDA device/software status turns on intended use and software function; Qimi's non-device posture depends on avoiding diagnosis, treatment, prevention, cure, or substitute-clinician claims: https://www.fda.gov/medical-devices/classify-your-medical-device/how-determine-if-your-product-medical-device
- EDPB GDPR territorial-scope guidance requires revisit if Qimi offers goods/services to people in the EU or monitors their behavior there: https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-32018-territorial-scope-gdpr-article-3-version_en
- Standardized launch gate and Search Ledger are recorded in `docs/reviews/compliance-mvp-launch-gate-2026-05-08.md`.
- Current code evidence after the 2026-05-08 implementation pass: shared modal signup includes adult account-holder confirmation; global `AppLayout` checks consent status for logged-in app pages; account deletion API exists in `pages/api/user/delete-account.ts`; `/privacy`, `/terms`, `/consent`, `pages/api/compliance/consent.ts`, and `pages/api/compliance/consent-status.ts` exist; `supabase/migrations/20260508000100_compliance_consent_and_rls.sql` adds `parental_consents` and replaces active broad RLS policies with `auth.uid()` ownership checks.
- Current remaining launch requirements: preserve adult-directed scope, complete human acceptance, add final business contact details if needed, and revisit COPPA/FTC Health Breach if child accounts, child-directed AI, health-record imports, device imports, or provider integrations are added.

### Regulatory Scope (MVP only)

| Regulation | Applicability | MVP Action Required |
|-----------|--------------|-------------------|
| **COPPA** | MVP-CONDITIONAL — Qimi is scoped as an adult/parent-directed service, not child-directed independent use | Adult user attestation plus no child accounts/child-directed marketing. Revisit before child-accessible AI, school/clinic child-user deployments, or materially broader child data collection |
| **FTC Act § 5** | YES — deceptive practices if privacy policy doesn't match actual data collection | Accurate privacy policy + medical disclaimer in AI responses |
| **FTC Health Breach Notification Rule** | MVP-CONDITIONAL — Qimi stores health-adjacent child/family information but does not import health records, connected-device data, provider data, or operate as a PHR aggregator | Keep breach notification reserve language. Revisit before health-record/device/provider integrations or any security incident |
| **CCPA/CPRA** | DEFER WITH ADR — not a blocker while Qimi remains below statutory thresholds and does not sell/share personal information | Record threshold watch and revisit triggers; do not rely on a generic 5,000-user statement |
| **HIPAA** | DEFER WITH ADR — not automatically applicable unless Qimi is or serves a covered entity/business associate | Record non-covered-entity assumption and partnership triggers |
| **GDPR** | DEFER WITH ADR — not targeting EU users | Record no-EU-targeting policy and revisit before EU launch or monitoring |
| **FDA/SaMD** | DEFER WITH ADR — support/education positioning can stay outside device posture only if product copy and features avoid diagnosis/treatment/prevention claims | Medical disclaimer plus product-copy and prompt audit required |

Internal design choice: CCPA/CPRA, HIPAA, GDPR, and FDA/SaMD are not implemented as full compliance programs for MVP. They are tracked as ADR-scoped launch decisions with explicit revisit triggers. Cookie consent remains deferred while no non-essential tracking-cookie program is introduced.

### MVP Boundary

- Six items only — no cookie banners, no data export API, no GDPR machinery
- Privacy Policy and Terms of Service are static Next.js pages (not dynamic)
- Account deletion uses existing CASCADE infrastructure — no soft-delete, no retention period
- Adult account-holder confirmation + timestamp is the MVP control while Qimi remains adult-directed and does not allow independent child use
- RLS fix is a SQL migration — no application-level changes needed

### Evidence Layering

| Claim | Basis |
|-------|-------|
| COPPA requires verifiable parental consent when the rule applies | Official FTC evidence; see SOP v2.4 refresh status above |
| Adult-directed MVP uses attestation rather than heavy verification | Internal MVP design choice tied to product scope: adult users only, no child accounts, no child-directed AI, no child-directed marketing |
| CCPA/CPRA is not a blocker while statutory thresholds are not met and personal information is not sold/shared | External research supported by CPPA/OAG official guidance; must be tracked by threshold/revisit triggers, not a generic 5,000-user rule |
| RLS `USING(true)` is a security gap | Internal design choice — current API routes use service_role key which bypasses RLS, so the gap is not currently exploitable. Fix anyway as defense-in-depth |
| HIPAA is not assumed for the current consumer-app posture | External research supported by HHS covered-entity/business-associate guidance; revisit if Qimi partners with covered entities |
| FDA/SaMD is not assumed for the current support/education posture | External research supported by FDA intended-use guidance; revisit if product claims or functions become diagnostic/treatment-oriented |
| FTC Health Breach Notification Rule needs scope guardrails | External research supported by FTC rule summary; current MVP avoids PHR-style imports/integrations and keeps breach-notification reserve language |

---

## 1. The Six Items

### Item 1: System Prompt — Add Medical Disclaimer + Remove TCM

**Problem**: CLAUDE.md line 141 requires "Every AI response must include 'Not a substitute for professional medical advice'". The system prompt has no such instruction. Additionally, `RULE_TCM` contradicts CLAUDE.md "No TCM references" localization rule.

**Fix**: Modify `lib/system-prompt-lite.ts`:
1. Append to `# Output Format` section: `Always end your response with: "*Qimi AI is not a substitute for professional medical advice.*"`
2. Delete the entire `## RULE_TCM` section: from `## RULE_TCM (Traditional Chinese Medicine - Permission-Based)` through the end of that section, up to but not including `## RULE_PLAN_GENERATION`

**File**: `lib/system-prompt-lite.ts` (not in NEVER-modify list)

### Item 2: Adult Authorization Checkbox

**Problem**: Qimi stores child/family support context in an adult-directed account. The registration flow needs an auditable adult confirmation record and clear user responsibility boundaries.

**Fix**: Add a required confirmation gate to the registration flow. This is the MVP control while Qimi remains adult-directed:
- Text: "By continuing, I confirm that I am 18 or older, that I will only provide child or family information I am authorized to share, and that I agree to the Privacy Policy and Terms of Service."
- Links to `/privacy` and `/terms`
- Store `consent_at` (ISO timestamp) and `consent_text` (the exact text agreed to) in a new `parental_consents` table
- Block registration if checkbox is not checked

**Database**:
```sql
CREATE TABLE IF NOT EXISTS parental_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_text TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT parental_consents_user_id_unique UNIQUE (user_id)
);

ALTER TABLE parental_consents ENABLE ROW LEVEL SECURITY;

-- SELECT only — users can read their own consent record.
-- No INSERT/UPDATE/DELETE policy: consent writes go through server-side admin client only.
CREATE POLICY "parental_consents_select" ON parental_consents
  FOR SELECT USING (auth.uid() = user_id);

-- Apply standard updated_at trigger
DROP TRIGGER IF EXISTS parental_consents_updated_at ON parental_consents;
CREATE TRIGGER parental_consents_updated_at
  BEFORE UPDATE ON parental_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

Note: The `UNIQUE(user_id)` constraint implicitly creates an index on `user_id`, so no separate index is needed.

**Consent capture flow** (does NOT modify `pages/api/auth/signup.ts`):

Two registration paths exist. Both must capture consent:

**Path A — Email signup** (`components/Auth/LoginModal.tsx`):
1. Add a consent control to the signup tab. Block signup if unchecked.
2. After successful signup + auto-login, call `POST /api/compliance/consent` with `{ consentText }`.

**Path B — OAuth login (Google/Facebook)** — first-time users:
OAuth users never see the signup form, so they skip the checkbox. Fix:
1. Create `/consent` page (`pages/consent.tsx`) — standalone page showing the same consent checkbox + submit.
2. After OAuth callback, user lands on `/chat` or `/dashboard`. These pages check consent status via `GET /api/compliance/consent-status`.
3. If no consent record exists → redirect to `/consent`. After consent submitted → redirect back to original destination.
4. `GET /api/compliance/consent-status` (new) — returns `{ hasConsent: boolean }`. Lightweight check, no sensitive data.

Do not rely on unsourced competitor claims as SOP evidence. Use official FTC sources plus counsel-reviewed product requirements for the final gate.

**Files**:
- `supabase/migrations/{timestamp}_compliance_tables.sql` (new; legacy draft names such as `supabase/compliance_tables.sql` are reference snippets only)
- `components/Auth/LoginModal.tsx` — add signup consent control to the current modal auth flow
- `pages/consent.tsx` (new) — standalone consent page for OAuth users
- `pages/api/compliance/consent.ts` (new) — POST: store consent record
- `pages/api/compliance/consent-status.ts` (new) — GET: check if consent exists

### Item 3: Privacy Policy Page

**Problem**: Current `public/privacy.html` is a static HTML file from waitlist era (2025-01-17). It does not mention: child profiles, chat history, memory items, AI processing via DeepSeek API, data retention, or user rights beyond a generic sentence.

**Fix**: Create `/pages/privacy.tsx` as a Next.js page using LandingLayout. Content must accurately describe:
- What data is collected (user account, child profile, chat messages, AI-extracted memory items)
- How data is processed (DeepSeek API for text, GLM for vision)
- Data sharing (no selling; third-party AI API processing)
- **Third-party data retention disclosure**: "Chat messages are processed by third-party AI services to generate responses. While we delete all data from our servers upon account deletion, we cannot guarantee deletion of data already processed by third-party AI providers. These providers have their own data retention policies."
- User rights (access via settings, deletion via settings)
- Children's privacy (adult-directed service, no independent child accounts, adult authorization)
- Contact information
- Effective date

Remove or redirect `public/privacy.html` → `/privacy`.

**File**: `pages/privacy.tsx` (new)

### Item 4: Terms of Service Page

**Problem**: Current `public/terms.html` is minimal (6 sections, ~10 sentences). Missing: AI use terms, children's data terms, detailed liability, dispute resolution.

**Fix**: Create `/pages/terms.tsx` as a Next.js page using LandingLayout. Content must include:
- Service description (AI-powered ADHD family support)
- AI limitations and medical disclaimer (detailed)
- Account registration and adult authorization requirement
- Acceptable use policy
- Intellectual property
- Limitation of liability
- Termination and account deletion
- General governing-law and forum wording suitable for a global MVP, without overriding non-waivable consumer protections
- Contact information

Remove or redirect `public/terms.html` → `/terms`.

**File**: `pages/terms.tsx` (new)

### Item 5: Account Deletion

**Problem**: COPPA requires parents to be able to delete their child's data. Current process is manual email to `qimi.ai2025@hotmail.com` with 30-day SLA. No automated mechanism exists.

**Fix**: Create self-service account deletion:

**Data deletion scope** (verified via full codebase audit 2026-03-17):

| Data | Storage | Deleted by CASCADE | Notes |
|------|---------|-------------------|-------|
| User account | `users` table | PRIMARY | Email, name, avatar, password_hash |
| Conversations | `conversations` table | YES | Titles, folders, metadata |
| Messages | `messages` table | YES | Chat content, RAG sources, attachment metadata |
| Child profiles | `child_profiles` table | YES | Birthday, gender, challenges |
| Memory items | `memory_items` table | YES | AI-extracted facts (10 categories incl. medical) |
| Profile summaries | `profile_summaries` table | YES | AI-generated family summary |
| Parental consent | `parental_consents` table | YES | Consent timestamp, text, IP |
| Session cookie | Browser | Client `signOut()` | NextAuth JWT |
| Chat cache | Browser localStorage | Auto-expires (5min TTL) | `qimi_conversations_cache` |
| DeepSeek API logs | External | NO — cannot delete | Disclosed in Privacy Policy |

No file storage exists (no Supabase Storage buckets, no uploaded images). `messages.attachments` is metadata-only JSONB.

**Research content guardrail**:

- Web MVP may display aggregate RAG source counts and limited bibliographic citations inside AI answers.
- Web MVP must not expose a public Paper Topics / Research Browser, browsable paper lists, abstracts, full text, or cached third-party paper content.
- If future work revisits paper browsing, it must pass a separate copyright/licensing review covering metadata, abstracts, full text, source attribution, caching, and redistribution terms.

**API**: `POST /api/user/delete-account`
- Auth: requires valid session
- Input: `{ confirmation: "DELETE" }` (user must type "DELETE" to confirm)
- Action: Delete the user's row from `users` table → CASCADE deletes all related data
- Response: `{ message: "Account deleted successfully" }`
- Error: 401 if not authenticated, 400 if confirmation string doesn't match
- Note: Session destruction is handled client-side via `signOut({ callbackUrl: '/' })` after API success. The API only deletes DB data.

**UI**: Create a minimal `/settings` page with a "Delete Account" section:
- Red "Delete My Account" button
- Click → confirmation modal: "This will permanently delete your account and all data including your child's profile, conversations, and AI-learned insights. This cannot be undone."
- User must type "DELETE" in a text input to enable the confirm button
- On confirm → call API → redirect to `/` landing page
- The `/settings` page uses the implemented `AppLayout` + SmartDrawer pattern, matching the current `pages/dashboard.tsx`.

**Files**:
- `pages/api/user/delete-account.ts` (new)
- `pages/settings.tsx` (new — minimal, only delete section for now)
- `components/Settings/DeleteAccountSection.tsx` (new)

### Item 6: RLS Policy Fix

**Problem**: Current versioned migrations still include broad `USING (true)` / `WITH CHECK (true)` policies for user-owned data in the initial, family, and memory migrations. Current API routes use `getSupabaseAdmin()` (service_role key, bypasses RLS), so this is not the current server-route authorization layer. But if any future code uses the anon client for user-owned queries or mutations, this becomes a data leak.

**Fix**: Update RLS policies to enforce `auth.uid() = user_id` (or `auth.uid() = id` for the users table). This is a defense-in-depth measure.

**Migration SQL** (`supabase/migrations/{timestamp}_fix_rls_policies.sql`):
```sql
-- Users table
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Service can insert users" ON users;

CREATE POLICY "users_select" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);

-- Conversations table
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;

CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "conversations_insert" ON conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversations_update" ON conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "conversations_delete" ON conversations FOR DELETE USING (auth.uid() = user_id);

-- Messages table (access via conversation ownership)
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;

CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));
CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));
```

**File**: `supabase/migrations/{timestamp}_fix_rls_policies.sql` (new)

**Important note**: Since all current API routes use `getSupabaseAdmin()` (service_role key), these RLS changes should have zero impact on existing server-route functionality. The admin client bypasses RLS entirely. This fix matters for defense-in-depth and for any future client-side Supabase queries.

**Scope note**: The concrete SQL block above covers users, conversations, and messages. The implementation pass must also add ownership-scoped policies for `child_profiles`, `profile_summaries`, and `memory_items`, because the current family and memory migrations contain the same broad-policy pattern.

---

## 2. Acceptance Criteria

- [ ] AI chat responses end with medical disclaimer text
- [ ] System prompt contains no TCM references
- [ ] Email signup requires the selected parental-consent control before account creation
- [ ] OAuth (Google/Facebook) first-time login redirects to `/consent` page before accessing app
- [ ] Consent record (timestamp, text, IP/user agent, method/version) is stored in `parental_consents` table
- [ ] Public-launch ADR-lite/Search Ledger documents why the selected COPPA consent method is reasonably designed to verify parent status, or documents a counsel-approved scope reduction
- [ ] `/privacy` page loads with accurate, current content
- [ ] `/terms` page loads with accurate, current content
- [ ] User can delete their account from `/settings` page
- [ ] Account deletion cascades to all related data (verify in Supabase)
- [ ] After deletion, user is logged out and redirected to landing page
- [ ] RLS policies use `auth.uid()` checks (not `USING(true)`)
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes

---

## 3. Execution Task List

### Task Execution Metadata

- Implementation mode: `linear`
- Acceptance mode: `single-item gate`
- Machine gate: `npx tsc --noEmit`, `npm run build`
- Human gate: allowed only after machine gate passes

### T001: Fix system prompt — add disclaimer, remove TCM

- **File**: `lib/system-prompt-lite.ts`
- **Do**:
  1. In the `# Output Format` section (end of prompt), add: `Always end your response with: "*Qimi AI is not a substitute for professional medical advice.*"`
  2. Delete the entire `## RULE_TCM` section: from the line `## RULE_TCM (Traditional Chinese Medicine - Permission-Based)` through the end of that section, up to but not including `## RULE_PLAN_GENERATION`
- **Verify**: `npx tsc --noEmit` passes
- **Commit**: `[T001] fix: add medical disclaimer to system prompt, remove TCM rule`

### T002: Create compliance database tables

- **File**: `supabase/migrations/{timestamp}_compliance_tables.sql`
- **Do**: Create `parental_consents` table as specified in Item 2. Include RLS policies with `auth.uid() = user_id`.
- **Verify**: SQL syntax is valid
- **Commit**: `[T002] feat: add parental_consents table`

### T003: Fix RLS policies on existing tables

- **File**: `supabase/migrations/{timestamp}_fix_rls_policies.sql`
- **Do**: Replace all broad user-owned `USING (true)` / `WITH CHECK (true)` policies on users, conversations, messages, child_profiles, profile_summaries, and memory_items with proper `auth.uid()` ownership checks as specified in Item 6.
- **Verify**: SQL syntax is valid
- **Commit**: `[T003] fix: replace USING(true) RLS policies with auth.uid() checks`

### T004: Create account deletion API

- **File**: `pages/api/user/delete-account.ts`
- **Do**:
  1. Accept POST only
  2. Validate session via `getServerSession()`
  3. Require `{ confirmation: "DELETE" }` in request body
  4. Look up user by email in `users` table
  5. Delete user row (CASCADE handles all related data)
  6. Return `{ message: "Account deleted successfully" }`
  7. Follow existing auth pattern from `pages/api/user/migrate-guest-data.ts`
- **Verify**: `npx tsc --noEmit`, `npm run build` pass
- **Commit**: `[T004] feat: add POST /api/user/delete-account endpoint`

### T005: Create DeleteAccountSection component

- **File**: `components/Settings/DeleteAccountSection.tsx`
- **Do**:
  1. Red "Delete My Account" button
  2. Click opens inline confirmation (not a modal — keep it simple): warning text + text input where user types "DELETE" + confirm button
  3. Confirm button disabled until input matches "DELETE"
  4. On confirm: POST `/api/user/delete-account` → `signOut()` from NextAuth → redirect to `/`
  5. Show loading state during deletion
  6. Show error message if API fails
- **Verify**: `npx tsc --noEmit`, `npm run build` pass
- **Commit**: `[T005] feat: add DeleteAccountSection component`

### T006: Create /settings page (minimal — delete account only)

- **File**: `pages/settings.tsx`
- **Do**:
  1. Auth check: `useSession()` → open the shared login modal if not authenticated; there is no current standalone `pages/login.tsx`
  2. Page title: "Settings - Qimi AI"
  3. Layout: same pattern as `pages/dashboard.tsx` (SmartDrawer + content area)
  4. Content: heading "Account Settings" + `DeleteAccountSection` component
  5. No medical disclaimer on this page — it's an account management page, not an AI/health content page
  6. Future sections (profile editing, notifications, subscription) will be added later
- **Verify**: `npx tsc --noEmit`, `npm run build` pass
- **Commit**: `[T006] feat: create minimal /settings page with account deletion`

### T007a: Add adult authorization control to signup modal

- **File**: `components/Auth/LoginModal.tsx` (signup tab)
- **Do**:
  1. Add consent control below password field in signup form: "By continuing, I confirm that I am 18 or older, that I will only provide child or family information I am authorized to share, and that I agree to the [Privacy Policy](/privacy) and [Terms of Service](/terms)."
  2. Disable "Sign Up" button unless checkbox is checked
  3. After successful signup + auto-login, call `POST /api/compliance/consent` with `{ consentText }` (the exact checkbox text)
  4. Do NOT modify `pages/api/auth/signup.ts` — consent is stored via a separate API route
- **Verify**: `npx tsc --noEmit`, `npm run build` pass
- **Commit**: `[T007a] feat: add adult authorization control to signup modal`

### T007b: Create consent API route

- **File**: `pages/api/compliance/consent.ts` (new)
- **Do**:
  1. Accept POST only
  2. Validate session via `getServerSession()`
  3. Accept `{ consentText: string }` from request body (do NOT accept `consentedAt` — generate server-side)
  4. Insert into `parental_consents` table via `getSupabaseAdmin()`: `user_id`, `consent_text`, `ip_address` (from `req.headers['x-forwarded-for'] || req.socket.remoteAddress`), `user_agent` (from `req.headers['user-agent']`), `consented_at` = `new Date().toISOString()`
  5. Return `{ message: "Consent recorded" }`
  6. If consent already exists for this user (unique constraint violation), return 200 with `{ message: "Consent already recorded" }`
- **Verify**: `npx tsc --noEmit`, `npm run build` pass
- **Commit**: `[T007b] feat: add POST /api/compliance/consent endpoint`

### T007c: Create consent-status API

- **File**: `pages/api/compliance/consent-status.ts` (new)
- **Do**:
  1. Accept GET only
  2. Validate session via `getServerSession()`
  3. Query `parental_consents` table for current user
  4. Return `{ hasConsent: true }` or `{ hasConsent: false }`
- **Verify**: `npx tsc --noEmit`, `npm run build` pass
- **Commit**: `[T007c] feat: add GET /api/compliance/consent-status endpoint`

### T007d: Create /consent page (OAuth consent gate)

- **File**: `pages/consent.tsx` (new)
- **Do**:
  1. Auth check: `useSession()` → open the shared login modal if not authenticated; there is no current standalone `pages/login.tsx`
  2. On mount: call `GET /api/compliance/consent-status` — if already consented, redirect to `/dashboard`
  3. Show consent checkbox (same text as T007a): "By continuing, I confirm that I am 18 or older..."
  4. On submit: call `POST /api/compliance/consent` → redirect to `/dashboard`
  5. Layout: centered page, no SmartDrawer
- **Verify**: `npx tsc --noEmit`, `npm run build` pass
- **Commit**: `[T007d] feat: create /consent page for OAuth users`

### T007e: Add consent check to /chat and /dashboard

- **Files**: `pages/chat.tsx`, `pages/dashboard.tsx`
- **Do**:
  1. After session check passes, call `GET /api/compliance/consent-status`
  2. If `hasConsent: false` → `router.push('/consent')`
  3. Keep it lightweight — one fetch on mount, no blocking UI
  4. Note: `pages/chat.tsx` is NOT in the NEVER-modify list (only `components/Chat/*` is)
- **Verify**: `npx tsc --noEmit`, `npm run build` pass
- **Commit**: `[T007e] feat: add consent gate to chat and dashboard pages`

### T008: Create /privacy page

- **File**: `pages/privacy.tsx`
- **Do**: Create Next.js page with LandingLayout. Import: `import LandingLayout from '../components/Landing/LandingLayout';` (same pattern as `pages/about.tsx`). Content covers all items listed in Item 3. Use Tailwind prose styling. Last Updated date: 2026-03-17.
- **Verify**: `npx tsc --noEmit`, `npm run build` pass
- **Commit**: `[T008] feat: create /privacy page with comprehensive policy`

### T009: Create /terms page

- **File**: `pages/terms.tsx`
- **Do**: Create Next.js page with LandingLayout. Import: `import LandingLayout from '../components/Landing/LandingLayout';` (same pattern as `pages/about.tsx`). Content covers all items listed in Item 4. Same styling as `/privacy`. Last Updated date: 2026-03-17.
- **Verify**: `npx tsc --noEmit`, `npm run build` pass
- **Commit**: `[T009] feat: create /terms page with comprehensive terms of service`

### T010: Cleanup old HTML files

- **Do**:
  1. Delete `public/privacy.html`, `public/terms.html`, `public/data-deletion.html` (superseded by new pages and account deletion feature)
  2. Do NOT modify Footer component — it is in `components/Layout/` (NEVER-modify list). Adding legal links to Footer is a pending task for the maintainer: `[NEEDS_SHARED_CHANGE] Add /privacy and /terms links to Footer component`.
- **Verify**: `npx tsc --noEmit`, `npm run build` pass
- **Commit**: `[T010] chore: remove legacy legal HTML files [NEEDS_SHARED_CHANGE]`
