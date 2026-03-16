# Module Spec: Follow-Up Reminder (Email Retention Hook)

> Status: APPROVED — 2026-02-25 | Implemented in current branch: 2026-03-14 review snapshot
> Module: followup-reminder
> Routes: `/followup/[id]`
> API Namespace: `pages/api/followup/`
> Branch: `feature/followup-reminder`
> Scale Anchor: MVP, 3-5K users, <1K paid, team 1-3, US market
> Level: L (external API — Mailchimp + DeepSeek LLM, PII — email + child info)

---

## 0. Product Context & Email Marketing Strategy

### Problem
"Ask and leave" — users chat with Qimi AI, get advice, and never return. There is no mechanism to close the loop: "suggestion → try it → come back and report → AI adjusts."

### Solution
Automated follow-up reminder emails via Mailchimp that bring users back to continue the conversation. This is the **first building block** of a broader email marketing retention system.

### Architecture Decision Record (ADR)

| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Email provider | Mailchimp Marketing API (existing) | Resend, SendGrid, Mandrill | Already configured, audience management built-in, no new service |
| Email trigger mechanism | Vercel Cron + Mailchimp audience sync + Mailchimp tag automation | Pure transactional API, manual send | Current implementation uses Vercel Cron for extraction and notification orchestration, then Mailchimp tag automation for delivery. This is more explicit and easier to observe than a hidden provider-only flow. |
| Follow-up extraction | Vercel Cron (daily) + DeepSeek LLM | Real-time in chat SSE flow, user-initiated | Can't modify chat code (concurrency rules). Cron is fully decoupled. |
| Extraction granularity | 2 cron/day, batch process | Hourly cron, webhook-based | Current `vercel.json` config runs one extract cron and one notify cron daily. Daily cadence is sufficient for the current reminder loop. |
| User return path | `/followup/[id]` dedicated page | Deep link to `/chat`, in-app notification | Implemented. Dedicated page gives full context before chatting. |
| State management | Supabase (PostgreSQL) | Redis (like WeChat version) | Web version uses Supabase for everything. Consistent with project. |
| Timezone handling | Provider-managed delay only in current implementation | Per-user local send hour, fixed UTC | Current code does not store user timezone or preferred send hour. Mailchimp automation delay handles timing at the provider layer for now. |

### Future Email Marketing Hooks (NOT in this MVP — infrastructure only)

The Mailchimp audience sync and tagging system built here enables future campaigns with **zero additional backend code** — just new Mailchimp automations:

| Hook | Trigger | Mailchimp Tag | When to Build |
|------|---------|---------------|---------------|
| Welcome drip (3 emails over 7 days) | User registration | `new_user` | 5K users |
| Re-engagement nudge (3-day inactivity) | No login for 3 days | `inactive_3d` | 5K users |
| Weekly digest (plan summary) | Every Monday | `digest_enabled` | 10K users |
| Milestone celebration | First plan item, 7-day streak | `milestone_{type}` | 10K users |

### Implementation Snapshot (2026-03-14)

The following are already present in the repo:

- Supabase migration: `supabase/followup-reminder_tables.sql`
- API routes:
  - `pages/api/followup/pending.ts`
  - `pages/api/followup/[id].ts`
  - `pages/api/followup/complete.ts`
  - `pages/api/followup/dismiss.ts`
  - `pages/api/followup/unsubscribe.ts`
- Mailchimp helper: `pages/api/followup/_mailchimp.ts`
- Vercel Cron routes:
  - `pages/api/followup/cron/extract.ts`
  - `pages/api/followup/cron/notify.ts`
- Landing page route: `pages/followup/[id].tsx`
- UI components:
  - `components/FollowupReminder/FollowupCard.tsx`
  - `components/FollowupReminder/FollowupLanding.tsx`

This module should now be treated as an implemented module whose spec must stay aligned with the code, not as a purely planned module.

---

## 1. Feature Requirements

### 1.1 Automated Follow-Up Extraction (Background)

A daily Vercel Cron job scans recent conversations and uses DeepSeek LLM to extract follow-up items.

- Runs once daily (configured in `vercel.json`)
- Processes conversations updated in the **last 26 hours** (overlap buffer to avoid missing conversations near the cron boundary)
- Only processes conversations with >= 4 messages (substantive conversations)
- Only processes conversations where the last message is from `assistant` (ended with AI advice)
- Skips users who already have an active follow-up (`status` is `pending` or `scheduled`)
- Skips users who have opted out of follow-up reminders
- Max 1 active follow-up per user at any time
- LLM extraction uses DeepSeek Chat (same model as main chat) via Function Calling
- Extraction timeout: 10 seconds per conversation
- On extraction failure: skip silently, log error, do not block other conversations
- Rate limit: process max **5 conversations per cron run** (each LLM call can take up to 10s; 5 × 10s = 50s fits within Vercel's 60s function timeout on Hobby plan)
- Route config: `export const config = { maxDuration: 60 };` (request Vercel 60s timeout)
- If more throughput is needed at scale, either increase Vercel plan or split into multiple cron schedules

### 1.2 Follow-Up Email via Mailchimp

When a follow-up item is created, the system syncs the user to Mailchimp and triggers an email automation.

- Ensure user exists in Mailchimp audience (add if not present, using existing API pattern from `subscribe.ts`)
- Update Mailchimp merge fields with follow-up content:
  - `FOLLOWUP_METHOD` — short name of the suggested method (e.g., "Pomodoro Timer")
  - `FOLLOWUP_Q` — the follow-up question
  - `FOLLOWUP_URL` — deep link back to `/followup/{id}`
- Add tag `followup_pending` to trigger Mailchimp Classic Automation
- Mailchimp automation (configured in dashboard, not in code):
  - Trigger: tag `followup_pending` added
  - Delay: 1 day
  - Action: Send email from template → remove tag
- Email template (designed in Mailchimp dashboard):
  - Subject: "How did *|FOLLOWUP_METHOD|* go? 🌟"
  - Body: warm, personalized message with `*|FOLLOWUP_Q|*` and CTA button linking to `*|FOLLOWUP_URL|*`
  - Footer: unsubscribe link (Mailchimp handles this automatically) + medical disclaimer
- Fallback: If Mailchimp API is unavailable, log error and set followup status to `pending` (will be retried on next cron run)

### 1.3 Follow-Up Landing Page (`/followup/[id]`)

When a user clicks the email link, they land on a dedicated follow-up page with full context.

- Auth required — redirect to `/login?callbackUrl=/followup/{id}` if not logged in
- Shows: method suggested, the original problem discussed, the follow-up question
- "Chat with Qimi" button: navigates to `/chat` (user starts a new conversation naturally)
- "Dismiss" button: marks follow-up as dismissed, redirects to `/chat`
- If follow-up belongs to a different user: show 404
- If follow-up is already completed/dismissed: show "already handled" state with link to `/chat`
- Current code does not apply a universal 7-day expiry check on this route
- Medical disclaimer at bottom of page

### 1.3.1 Current Expiry Semantics

- `GET /api/followup/pending` currently applies a 7-day window when looking up the active reminder
- `GET /api/followup/[id]` currently does not apply the same 7-day filter
- `cron/notify` currently looks at `pending` status, not age
- Treat a global follow-up expiry rule as future work until all read and notify paths enforce the same contract

### 1.4 Unsubscribe (CAN-SPAM Compliance)

- Every follow-up email includes Mailchimp's automatic unsubscribe link
- Additionally, a one-click unsubscribe endpoint (no auth required, token-based):
  - `GET /api/followup/unsubscribe?uid={user_id}&token={hash}` → renders confirmation page
  - `POST /api/followup/unsubscribe` with `{ uid, token }` → disables follow-ups for user
- Unsubscribe token: `SHA-256(user_id + FOLLOWUP_UNSUBSCRIBE_SECRET)` — deterministic, no DB lookup needed for generation
- After unsubscribe: user can re-enable via profile settings (future, out of scope for MVP)

### 1.5 Auth & Access

- Cron endpoints: protected by `CRON_SECRET` env var (Vercel Cron sends this automatically)
- Follow-up page: requires login (standard `useSession` pattern)
- Unsubscribe: no auth required (token-based, CAN-SPAM compliance)
- Guest users: no follow-ups (extraction only processes conversations from registered users)

### 1.6 Constraints (from Blueprint)

- Max 1 active follow-up per user at any time
- Max 1 follow-up created per user per day
- `method_short_name` ≤ 50 characters
- A global 7-day expiry rule is not yet fully implemented across all routes; current canonical behavior is the narrower contract documented in `1.3.1 Current Expiry Semantics`
- Status lifecycle: `pending` → `scheduled` → `completed` or `dismissed` (no `sent` status — Mailchimp handles delivery without callback)

---

## 2. Out of Scope (MVP)

- In-app notification card (requires modifying AppLayout or Chat — shared code)
- User manually creating follow-up reminders
- Multiple active follow-ups per user
- Follow-up email preferences page (re-enable after unsubscribe)
- Custom send time selection
- A/B testing email templates
- Push notifications (web push)
- SMS reminders
- Re-engagement emails (future Mailchimp automation, no code needed)
- Weekly digest emails (future Mailchimp automation, no code needed)

---

## 3. Database Schema

File: `supabase/followup-reminder_tables.sql`

```sql
-- ===========================================
-- Follow-Up Items Table
-- ===========================================
CREATE TABLE IF NOT EXISTS followup_items (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status              TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'scheduled', 'completed', 'dismissed')),
  parent_problem      TEXT        NOT NULL,
  suggested_method    TEXT        NOT NULL,
  method_short_name   VARCHAR(50) NOT NULL,
  follow_up_question  TEXT        NOT NULL,
  source_conversation_id UUID    REFERENCES conversations(id) ON DELETE SET NULL,
  scheduled_at        TIMESTAMPTZ,
  sent_at             TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_followup_items_user_id
  ON followup_items(user_id);

CREATE INDEX IF NOT EXISTS idx_followup_items_user_status
  ON followup_items(user_id, status);

CREATE INDEX IF NOT EXISTS idx_followup_items_status_created
  ON followup_items(status, created_at DESC);

-- Prevent duplicate active follow-ups per user (race condition guard)
CREATE UNIQUE INDEX IF NOT EXISTS idx_followup_items_one_active_per_user
  ON followup_items(user_id)
  WHERE status IN ('pending', 'scheduled');

-- Enable RLS
ALTER TABLE followup_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "followup_items_select" ON followup_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "followup_items_insert" ON followup_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "followup_items_update" ON followup_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "followup_items_delete" ON followup_items
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-update trigger
DROP TRIGGER IF EXISTS followup_items_updated_at ON followup_items;
CREATE TRIGGER followup_items_updated_at
  BEFORE UPDATE ON followup_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- Follow-Up Preferences Table
-- ===========================================
CREATE TABLE IF NOT EXISTS followup_preferences (
  user_id     UUID    PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE followup_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "followup_prefs_select" ON followup_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "followup_prefs_insert" ON followup_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "followup_prefs_update" ON followup_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Auto-update trigger
DROP TRIGGER IF EXISTS followup_preferences_updated_at ON followup_preferences;
CREATE TRIGGER followup_preferences_updated_at
  BEFORE UPDATE ON followup_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

---

## 4. API Routes

All routes under `pages/api/followup/`.

Auth pattern for authenticated routes (same as all other modules):
```ts
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '@/lib/supabase';

const session = await getServerSession(req, res, authOptions);
if (!session?.user?.email) {
  return res.status(401).json({ error: 'Unauthorized' });
}
const supabase = getSupabaseAdmin();
// Get-or-create user by email (PGRST116 handling — see conversations/index.ts for full pattern)
```

> **Note**: CLAUDE.md references `@/lib/auth`, but no `lib/auth.ts` file exists in the project. All existing API routes import `authOptions` from `'../auth/[...nextauth]'` (relative path). Follow the actual codebase pattern.

---

### 4.1 `GET /api/followup/pending` — Get active follow-up for current user

**Response (200):**
```json
{
  "followup": {
    "id": "uuid",
    "status": "scheduled",
    "parentProblem": "My child refuses to start homework",
    "suggestedMethod": "Break tasks into 5-minute micro-steps with a visual timer",
    "methodShortName": "Micro-Step Timer",
    "followUpQuestion": "How did the 5-minute timer approach work for homework yesterday?",
    "sourceConversationId": "uuid",
    "scheduledAt": "2026-02-26T01:00:00Z",
    "createdAt": "2026-02-25T14:00:00Z"
  }
}
```

**Response (200, no active follow-up):**
```json
{
  "followup": null
}
```

**Logic:**
1. Auth check + get-or-create user
2. Query `followup_items` for this user where `status IN ('pending', 'scheduled')` and `created_at > NOW() - INTERVAL '7 days'`
3. Order by `created_at DESC`, limit 1
4. Return mapped camelCase item, or `null` if none

---

### 4.2 `GET /api/followup/[id]` — Get specific follow-up (for landing page)

**Response (200):**
```json
{
  "followup": {
    "id": "uuid",
    "status": "scheduled",
    "parentProblem": "My child refuses to start homework",
    "suggestedMethod": "Break tasks into 5-minute micro-steps with a visual timer",
    "methodShortName": "Micro-Step Timer",
    "followUpQuestion": "How did the 5-minute timer approach work for homework yesterday?",
    "sourceConversationId": "uuid",
    "createdAt": "2026-02-25T14:00:00Z"
  }
}
```

**Response (404):**
```json
{ "error": "Follow-up not found" }
```

**Logic:**
1. Auth check + get-or-create user
2. Query `followup_items` by `id`, confirm `user_id` matches (404 if not found or not owned)
3. Return mapped camelCase item

---

### 4.3 `POST /api/followup/complete` — Mark follow-up as completed

**File**: `pages/api/followup/complete.ts` (separate file — NOT under `[id].ts` to avoid dynamic route conflict)

**Request body:**
```json
{ "id": "uuid" }
```

**Response (200):**
```json
{ "followup": { ...updatedItem } }
```

**Logic:**
1. Auth check + get-or-create user
2. Validate `id` in body (return 400 if missing)
3. Update `followup_items` set `status = 'completed'`, `completed_at = NOW()` where `id = {id}` and `user_id = {user.id}`
4. If no row updated: return 404
5. Return updated item

---

### 4.4 `POST /api/followup/dismiss` — Dismiss follow-up

**File**: `pages/api/followup/dismiss.ts` (separate file)

**Request body:**
```json
{ "id": "uuid" }
```

**Response (200):**
```json
{ "followup": { ...updatedItem } }
```

**Logic:**
1. Auth check + get-or-create user
2. Validate `id` in body (return 400 if missing)
3. Update `followup_items` set `status = 'dismissed'` where `id = {id}` and `user_id = {user.id}`
4. If no row updated: return 404
5. Return updated item

---

### 4.5 `POST /api/followup/unsubscribe` — One-click unsubscribe (NO auth required)

**Request body:**
```json
{ "uid": "user-uuid", "token": "sha256-hash-string" }
```

**Response (200):**
```json
{ "message": "You have been unsubscribed from follow-up reminders." }
```

**Response (400):**
```json
{ "error": "Invalid or expired token" }
```

**Logic:**
1. **No auth check** — this must work from email links without login
2. Receive `uid` (user ID) and `token` from request params (GET) or body (POST)
3. Verify token: compute `SHA-256(uid + FOLLOWUP_UNSUBSCRIBE_SECRET)` and compare to `token`
4. If no match: return 400
5. Confirm user exists by querying `users` table with `uid`
6. Upsert `followup_preferences`: set `enabled = false` for this user
7. Dismiss any active follow-ups for this user (set status to `dismissed`)
8. Return success message

**URL format:** `GET /api/followup/unsubscribe?uid={user_id}&token={hash}` renders a simple HTML confirmation page. The page contains a form that POSTs `{ uid, token }` to the same endpoint to confirm.

> **Known tradeoff**: The `uid` is visible in the unsubscribe URL. If a user forwards the email, the recipient could unsubscribe the original user. Risk is low (worst case = unwanted unsubscribe, not data exposure). At 10K+ users, consider replacing `uid` in the URL with an opaque token stored in DB.

---

### 4.6 `POST /api/followup/cron/extract` — Vercel Cron: Extract follow-ups

**Auth:** Verify `Authorization: Bearer {CRON_SECRET}` header (Vercel sends this automatically for cron jobs).

**Response (200):**
```json
{
  "processed": 12,
  "extracted": 3,
  "skipped": 9,
  "errors": 0
}
```

**Logic:**
1. Verify `CRON_SECRET` header
2. Query conversations updated in the last 26 hours with `message_count >= 4`
3. Join with users to get user info, exclude:
   - Users with active follow-ups (`status IN ('pending', 'scheduled')` in last 7 days)
   - Users who have opted out: use LEFT JOIN on `followup_preferences` and filter `WHERE (fp.enabled IS NULL OR fp.enabled = true)` — most users will NOT have a preferences row (no row = opted in)
   - Users who already received a follow-up today
4. For each eligible conversation (max 5 per run — see Section 1.1 for timeout rationale):
   a. Fetch last 6 messages from `messages` table
   b. Check if last message is from `assistant`
   c. Call DeepSeek LLM with Function Calling to evaluate and extract follow-up item (see Section 5)
   d. If LLM returns a follow-up: insert into `followup_items` with `status = 'pending'`
   e. On LLM error: log and continue to next conversation
5. Return processing stats

**Vercel Cron config** (in `vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/followup/cron/extract",
      "schedule": "0 14 * * *"
    }
  ]
}
```

Schedule: 14:00 UTC daily (9 AM ET / 6 AM PT — processes yesterday's conversations well before evening email sends).

---

### 4.7 `POST /api/followup/cron/notify` — Vercel Cron: Trigger Mailchimp emails

**Auth:** Verify `CRON_SECRET` header.

**Response (200):**
```json
{
  "processed": 3,
  "synced": 2,
  "tagged": 3,
  "errors": 0
}
```

**Logic:**
1. Verify `CRON_SECRET` header
2. Query `followup_items` where `status = 'pending'`
3. For each pending follow-up:
   a. Get user email from `users` table
   b. Compute subscriber hash: `MD5(email.toLowerCase())`
   c. Upsert user in Mailchimp audience with merge fields in ONE call:
      - `PUT /3.0/lists/{AUDIENCE_ID}/members/{hash}` with body including `merge_fields`:
        - `FOLLOWUP_METHOD`: `followup.method_short_name`
        - `FOLLOWUP_Q`: `followup.follow_up_question`
        - `FOLLOWUP_URL`: `{APP_URL}/followup/{followup.id}`
        - `UNSUB_URL`: `{APP_URL}/api/followup/unsubscribe?uid={user_id}&token={hash}`
   d. Add tag `followup_pending` via `POST /3.0/lists/{AUDIENCE_ID}/members/{hash}/tags`
   e. Update follow-up status to `scheduled`, set `scheduled_at = NOW()`
   f. On unique constraint violation (23505 from Supabase) during insert: skip silently (concurrent cron guard)
4. On Mailchimp API error for a specific user: log error, skip that user, continue processing others
5. Return processing stats

**Vercel Cron config:**
```json
{
  "crons": [
    {
      "path": "/api/followup/cron/extract",
      "schedule": "0 14 * * *"
    },
    {
      "path": "/api/followup/cron/notify",
      "schedule": "0 15 * * *"
    }
  ]
}
```

Schedule: 15:00 UTC daily (1 hour after extraction). Mailchimp automation handles the actual send timing (1-day delay with timezone optimization).

> **Note on Vercel Cron free tier limits**: Vercel Hobby plan allows 2 cron jobs. If more crons are needed in the future, combine extract + notify into a single endpoint.

---

## 5. DeepSeek LLM Integration (Follow-Up Extraction)

### Function Calling Schema

```ts
const FOLLOWUP_EXTRACTION_TOOL = {
  type: 'function',
  function: {
    name: 'create_followup_reminder',
    description: 'Extract a follow-up reminder from an AI conversation where specific advice was given. Only call this if the AI provided a concrete, actionable method that the parent can try.',
    parameters: {
      type: 'object',
      properties: {
        should_create: {
          type: 'boolean',
          description: 'Whether this conversation warrants a follow-up. True only if: (1) a specific actionable method was suggested, (2) the parent seemed receptive, (3) the method can be tried within 1-2 days.'
        },
        parent_problem: {
          type: 'string',
          description: 'The specific challenge the parent described, in 1-2 sentences. Write in English.'
        },
        suggested_method: {
          type: 'string',
          description: 'The concrete method or strategy the AI suggested, in 1-2 sentences. Write in English.'
        },
        method_short_name: {
          type: 'string',
          maxLength: 50,
          description: 'A short label for the method (max 50 chars). E.g., "Pomodoro Timer", "5-Minute Breathing", "Token Reward Chart".'
        },
        follow_up_question: {
          type: 'string',
          description: 'A warm, natural follow-up question to ask the next day. Should reference the specific method and invite the parent to share results. Write in English.'
        }
      },
      required: ['should_create']
    }
  }
};
```

### System Prompt for Extraction

```
You are analyzing an AI counseling conversation between a parent and Qimi (an ADHD family AI assistant). Your job is to determine if the AI gave specific, actionable advice that warrants a follow-up check-in tomorrow.

Rules:
- Only create a follow-up if the AI suggested a CONCRETE method the parent can try (not general reassurance).
- The follow-up question should be warm and natural, like a caring friend checking in.
- method_short_name must be ≤ 50 characters.
- Write everything in English.
- If unsure, set should_create to false.
```

### Request Format

Follow the existing DeepSeek call pattern from `pages/api/chat/stream.ts`:

```ts
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

const response = await fetch(`${DEEPSEEK_API_BASE}/v1/chat/completions`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    'Content-Type': 'application/json',
  },
  signal: AbortSignal.timeout(10000),
  body: JSON.stringify({
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      ...last6Messages, // conversation context
    ],
    tools: [FOLLOWUP_EXTRACTION_TOOL],
    tool_choice: { type: 'function', function: { name: 'create_followup_reminder' } },
    temperature: 0.1,
    max_tokens: 500,
  }),
});
```

### Environment Variables (new — only vars not already in `.env.local`)

```
CRON_SECRET=xxx              # Vercel generates this automatically
FOLLOWUP_UNSUBSCRIBE_SECRET=xxx  # Random secret for unsubscribe token hashing
APP_URL=https://qimiai.to    # Base URL for deep links in emails
```

> `DEEPSEEK_API_BASE`, `DEEPSEEK_API_KEY`, and `DEEPSEEK_MODEL` already exist in `.env.local`. `MAILCHIMP_*` vars also already exist. Reuse them — do NOT create separate keys.

---

## 6. Mailchimp Integration Details

### Reuse Existing Pattern

The Mailchimp API call pattern is already established in `pages/api/subscribe.ts`. Follow the same authentication and error handling:

```ts
const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
const MAILCHIMP_AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;
const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX;

const baseUrl = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0`;
const authHeader = `Basic ${Buffer.from(`anystring:${MAILCHIMP_API_KEY}`).toString('base64')}`;
```

### Required Mailchimp Dashboard Configuration (Manual Setup)

The following must be configured in the Mailchimp dashboard BEFORE the feature goes live:

1. **Merge Fields** — Add to the existing audience:
   - `FOLLOWUP_METHOD` (text, max 50 chars)
   - `FOLLOWUP_Q` (text, max 200 chars)
   - `FOLLOWUP_URL` (text/URL)
   - `UNSUB_URL` (text/URL)

2. **Classic Automation** — Create new automation:
   - **Trigger**: Tag `followup_pending` added to contact
   - **Delay**: 1 day (Mailchimp's "optimal time" send optimization recommended)
   - **Action**: Send email from template (see below)
   - **Post-send**: Remove tag `followup_pending`

3. **Email Template** — Design in Mailchimp:
   - From: "Qimi AI" <hello@qimiai.to>
   - Subject: "How did *|FOLLOWUP_METHOD|* go?"
   - Body:
     ```
     Hi *|FNAME|*,

     Yesterday we talked about trying *|FOLLOWUP_METHOD|* with your child.

     *|FOLLOWUP_Q|*

     [Tell Qimi how it went →] (link to *|FOLLOWUP_URL|*)

     Every small step counts. Whether it worked perfectly or not,
     sharing your experience helps us give better advice next time.

     — Qimi AI

     This is not a substitute for professional medical advice.
     Please discuss any concerns with your child's healthcare provider.
     ```
   - Unsubscribe: Mailchimp auto-includes this in footer. Additionally include `*|UNSUB_URL|*` as a secondary opt-out link.

### Mailchimp API Calls Used

| Operation | Method | Endpoint | When |
|-----------|--------|----------|------|
| Add/update user + merge fields | PUT | `/3.0/lists/{id}/members/{hash}` | Upsert with `merge_fields` in body (combines sync + field update in one call) |
| Add tag | POST | `/3.0/lists/{id}/members/{hash}/tags` | To trigger automation |

> **Note**: The `PUT` (upsert) endpoint accepts `merge_fields` in the body, so there is no need for a separate `PATCH` call. This reduces Mailchimp API calls from 3 to 2 per user.

### Subscriber Hash

Mailchimp uses MD5 hash of lowercase email as the subscriber identifier:

```ts
import { createHash } from 'crypto';
const subscriberHash = createHash('md5')
  .update(email.toLowerCase())
  .digest('hex');
```

---

## 7. Frontend Components

All under `components/FollowupReminder/`.

### 7.1 `FollowupLanding.tsx`

Main component for the `/followup/[id]` page. Shows follow-up context and actions.

**Props:**
```ts
interface FollowupLandingProps {
  followup: {
    id: string;
    status: string;
    parentProblem: string;
    suggestedMethod: string;
    methodShortName: string;
    followUpQuestion: string;
    createdAt: string;
  };
  onComplete: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
}
```

**Layout:**
```
[Qimi logo / icon]
[Greeting: "Welcome back! Let's check in."]

[Card: Follow-Up Context]
  [methodShortName badge]
  [parentProblem — "What we discussed:"]
  [suggestedMethod — "What was suggested:"]

[followUpQuestion — prominently displayed, larger text]

[Chat with Qimi →] (teal button, primary CTA → navigates to /chat)
[Not now] (text link → calls onDismiss)

[Medical disclaimer — small text, gray]
```

**Behavior:**
- "Chat with Qimi" button: calls `onComplete(id)` then navigates to `/chat`
- "Not now" link: calls `onDismiss(id)` then navigates to `/chat`
- Already completed/dismissed state: show "You've already addressed this follow-up" with "Go to Chat" link

### 7.2 `FollowupCard.tsx` (Reusable summary card)

A compact card for displaying follow-up info. Used within `FollowupLanding` and potentially reusable in future notification UI.

**Props:**
```ts
interface FollowupCardProps {
  methodShortName: string;
  parentProblem: string;
  suggestedMethod: string;
}
```

**Layout:**
- Purple accent border (left border, `border-l-4 border-purple-500`)
- Method badge: purple pill with `methodShortName`
- Two text sections: "Challenge" + "Suggested approach"
- Compact design, fits within larger layouts

---

## 8. Pages

### 8.1 `pages/followup/[id].tsx` — Follow-up landing page

```
AppLayout
├── <Head> title="Follow Up - Qimi AI"
├── FollowupLanding (main content, centered, max-w-lg)
└── Medical disclaimer (footer)
```

**Auth:** `useSession()` → loading skeleton → redirect to `/login?callbackUrl=/followup/{id}` if no session → render content.

**Data fetching:**
1. On mount: fetch `GET /api/followup/{id}`
2. If 404: show "Follow-up not found" with link to `/chat`
3. If follow-up is completed/dismissed: show "already handled" state

**Handlers:**

`handleComplete(id)`:
1. POST to `/api/followup/complete` with `{ id }`
2. On success: `router.push('/chat')`

`handleDismiss(id)`:
1. POST to `/api/followup/dismiss` with `{ id }`
2. On success: `router.push('/chat')`

---

## 9. Degradation & Error Handling

| Failure | User Impact | Behavior |
|---------|-------------|----------|
| DeepSeek extraction fails | None (silent) | Log error, skip conversation, continue to next |
| Mailchimp API unavailable | Email delayed | Keep follow-up as `pending`, retry on next cron run |
| Mailchimp user sync fails | Email not sent | Log error, skip user, follow-up stays `pending` |
| User clicks expired link (>7 days) | Sees "expired" state | Show friendly message + "Go to Chat" link |
| Cron job exceeds timeout (10s/Vercel) | Partial processing | Process conversations in order; partial results are fine, rest caught next run |
| `DEEPSEEK_API_KEY` not set | No extraction | Cron returns immediately with `{ processed: 0 }`, logs warning |
| `MAILCHIMP_API_KEY` not set | No emails sent | Cron returns immediately with `{ processed: 0 }`, logs warning |

---

## 10. Cost & Latency Estimate

| Resource | Per-Call Cost | Daily Volume (3K users) | Daily Cost |
|----------|-------------|------------------------|-----------|
| DeepSeek extraction | ~$0.001 (500 tokens) | ~50 conversations | ~$0.05 |
| Mailchimp emails | $13/mo Essentials (500 contacts) | ~10-30 emails | Included in plan |
| Vercel Cron | Free (Hobby: 2 jobs) | 2 runs/day | $0 |
| Supabase queries | Free tier | ~200 queries/day | $0 |

**Total estimated cost**: ~$1.50/month (DeepSeek) + $0-13/month (Mailchimp, depends on plan)

---

## 11. Acceptance Criteria

- [ ] Vercel Cron extraction job runs daily and processes eligible conversations
- [ ] DeepSeek LLM correctly evaluates conversations and extracts follow-up items via Function Calling
- [ ] Follow-up items are stored in `followup_items` table with correct status progression (`pending` → `scheduled` → `completed`/`dismissed`)
- [ ] Mailchimp audience sync adds/updates users correctly
- [ ] Mailchimp tag `followup_pending` is added to trigger automation
- [ ] `/followup/[id]` page displays follow-up context with correct data
- [ ] "Chat with Qimi" marks follow-up as completed and navigates to `/chat`
- [ ] "Not now" marks follow-up as dismissed and navigates to `/chat`
- [ ] Unsubscribe endpoint works without authentication (token-based)
- [ ] Unsubscribed users do not receive new follow-up extractions
- [ ] Max 1 active follow-up per user enforced
- [ ] Follow-ups older than 7 days are excluded from active queries
- [ ] All API errors are handled gracefully (no user-visible crashes)
- [ ] Medical disclaimer appears on the follow-up page
- [ ] Unauthenticated users are redirected to `/login` with callback URL
- [ ] Cron endpoints reject requests without valid `CRON_SECRET`
- [ ] `npm run lint` passes with 0 errors
- [ ] `npm run build` passes (next build)

---

## 12. Execution Task List

### Task Execution Metadata

- Implementation mode: `linear`
- Acceptance mode: `single-item gate`
- Machine gate:
  - required checks: `npx eslint`, `npx tsc --noEmit`, `npm run build`
  - smoke test: extract, notify, landing-page read, dismiss, complete, and unsubscribe flows must work manually for the affected slice
  - contract consistency check: status lifecycle, Mailchimp integration contract, and route behavior must remain aligned with `/docs/system-architecture.md` and this spec
- Human gate: allowed only after machine gate passes and P0/P1 review findings are zero

Each task is one file (or closely related pair). Execute in order. Run `npx eslint`, `npx tsc --noEmit`, and `npm run build` after each task.

### T001: Database migration
- **File**: `supabase/followup-reminder_tables.sql`
- **Do**: Copy the SQL from Section 3. Create the file with both tables, indexes, RLS policies, and triggers.
- **Verify**: File exists with correct SQL.
- **Commit**: `[T001] feat: add followup_items and followup_preferences table migrations`

### T002: Mailchimp helper utility
- **File**: `pages/api/followup/_mailchimp.ts` (internal helper, prefixed with `_` — not a route)
- **Do**: Create shared Mailchimp utility functions:
  - `getMailchimpAuth()` — returns base URL + auth header (reads env vars)
  - `getSubscriberHash(email)` — MD5 hash of lowercase email
  - `ensureMailchimpMember(email, name?)` — check if exists, add if not (PUT upsert)
  - `updateMergeFields(email, fields)` — PATCH member with merge field data
  - `addTag(email, tag)` — POST tag to member
- **Pattern**: Follow `pages/api/subscribe.ts` for Mailchimp API call style.
- **Verify**: `npm run lint && npm run build` pass.
- **Commit**: `[T002] feat: add Mailchimp helper utility for followup module`

### T003: GET /api/followup/pending — get active follow-up
- **File**: `pages/api/followup/pending.ts`
- **Do**: Handle GET only. Auth + get-or-create user. Query for active follow-up (status IN pending/scheduled, last 7 days). Return `{ followup }` or `{ followup: null }`.
- **Verify**: `npm run lint && npm run build` pass.
- **Commit**: `[T003] feat: add GET /api/followup/pending endpoint`

### T004: GET /api/followup/[id] — get specific follow-up
- **File**: `pages/api/followup/[id].ts`
- **Do**: Handle GET only. Auth + get-or-create user. Fetch by id, verify ownership. Return camelCase follow-up or 404.
- **Verify**: `npm run lint && npm run build` pass.
- **Commit**: `[T004] feat: add GET /api/followup/[id] endpoint`

### T005: POST /api/followup/complete + dismiss (separate files)
- **Files**: `pages/api/followup/complete.ts`, `pages/api/followup/dismiss.ts`
- **Do**: Two separate route files (NOT under `[id].ts` — Next.js dynamic routes would match `/complete` and `/dismiss` as IDs). Each handles POST only. Auth + get-or-create user. Validate `id` in body. Update status accordingly. Return updated item or 404.
- **Verify**: `npm run lint && npm run build` pass.
- **Commit**: `[T005] feat: add POST /api/followup/complete and dismiss endpoints`

### T006: POST /api/followup/unsubscribe — one-click unsubscribe
- **File**: `pages/api/followup/unsubscribe.ts`
- **Do**: Handle GET (render HTML confirmation page) and POST (process unsubscribe). Token-based, no auth. Compute SHA-256(uid + secret) to verify. Upsert `followup_preferences` with `enabled = false`. Dismiss active follow-ups. For GET handler, return HTML (not JSON): `res.setHeader('Content-Type', 'text/html'); res.status(200).send('<html>...<form method="POST">...</form></html>');`
- **Verify**: `npm run lint && npm run build` pass.
- **Commit**: `[T006] feat: add one-click unsubscribe endpoint for followup emails`

### T007: POST /api/followup/cron/extract — daily extraction cron
- **File**: `pages/api/followup/cron/extract.ts`
- **Do**: Verify CRON_SECRET. Export `config = { maxDuration: 60 }`. Query eligible conversations (last 26h, >=4 messages, no active followup for user, user not opted out). For each (max 5): fetch last 6 messages, call DeepSeek LLM with Function Calling schema from Section 5, insert followup_item if `should_create=true`. Return stats.
- **Dependencies**: DeepSeek API must be configured (DEEPSEEK_API_URL, DEEPSEEK_API_KEY).
- **Verify**: `npm run lint && npm run build` pass.
- **Commit**: `[T007] feat: add daily followup extraction cron with DeepSeek LLM`

### T008: POST /api/followup/cron/notify — daily Mailchimp notification cron
- **File**: `pages/api/followup/cron/notify.ts`
- **Do**: Verify CRON_SECRET. Query pending follow-ups. For each: ensure user in Mailchimp audience, update merge fields, add `followup_pending` tag. Update status to `scheduled`. Return stats.
- **Dependencies**: T002 (Mailchimp helper).
- **Verify**: `npm run lint && npm run build` pass.
- **Commit**: `[T008] feat: add daily Mailchimp notification cron for followup emails`

### T009: Vercel Cron configuration
- **File**: `vercel.json` (already exists — ADD `crons` array to the existing file, do NOT overwrite other fields)
- **Do**: Add cron configuration for both extract (14:00 UTC) and notify (15:00 UTC) endpoints.
- **Verify**: `vercel.json` is valid JSON.
- **Commit**: `[T009] feat: add Vercel Cron configuration for followup jobs`

### T010: FollowupCard + FollowupLanding components
- **Files**: `components/FollowupReminder/FollowupCard.tsx`, `components/FollowupReminder/FollowupLanding.tsx`
- **Do**: Implement both components per Section 7. Tailwind only. Teal primary, purple accent for follow-up cards. Medical disclaimer. Responsive layout.
- **Verify**: `npm run lint && npm run build` pass.
- **Commit**: `[T010] feat: add FollowupCard and FollowupLanding components`

### T011: /followup/[id] page
- **File**: `pages/followup/[id].tsx`
- **Do**: Auth check with useSession + callback URL. Fetch follow-up on mount. Handle complete/dismiss actions. Handle 404 and already-handled states. Render FollowupLanding within AppLayout. Medical disclaimer.
- **Verify**: `npm run lint && npm run build` pass.
- **Commit**: `[T011] feat: add /followup/[id] landing page`

### T012: Unit tests
- **File**: `__tests__/followup-reminder.test.ts`
- **Do**: Test extraction eligibility logic (skip opted-out users, skip users with active followups, skip conversations with < 4 messages). Test unsubscribe token verification. Test cron auth (reject without CRON_SECRET). Test follow-up status transitions (pending → scheduled → completed/dismissed). Test ownership check (user can't access another user's followup).
- **Verify**: `npm run test` passes.
- **Commit**: `[T012] test: add followup reminder unit tests`

### T013: Update .env.example
- **File**: `.env.example`
- **Do**: Add new env vars section for follow-up reminder:
  ```
  # Follow-Up Reminder
  FOLLOWUP_UNSUBSCRIBE_SECRET=
  APP_URL=https://qimiai.to
  # CRON_SECRET is auto-generated by Vercel
  ```
- **Verify**: File is valid.
- **Commit**: `[T013] chore: add followup reminder env vars to .env.example`
