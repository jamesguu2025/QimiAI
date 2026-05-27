# Module Spec: Analytics MVP

> Status: IMPLEMENTED, PENDING TECHNICAL ACCEPTANCE — 2026-05-19
> Module: analytics-mvp
> Routes: no user-facing route
> API routes: `pages/api/analytics/event.ts`, `pages/api/analytics/summary.ts` (optional internal read endpoint)
> Scope: Privacy-friendly MVP product analytics for landing → onboarding → chat → memory → growth plan funnel, activation, retention, and chat error observability.

---

## 0. Planning Baseline

This spec was written against:

- `docs/project-control.md` — current execution order, module status, local Supabase rule.
- `docs/local-test-environment.md` — database-backed work must use local Supabase first.
- `docs/system-architecture.md` — single Next.js deployment, Pages Router, Supabase as primary DB, API routes for server-side writes.
- `docs/specs/compliance.md` — adult-directed MVP, privacy/terms/consent launch gate, no unnecessary non-essential tracking-cookie program.
- Cross-platform blueprint `/Users/jamesguu/WeChatProjects/adhdhelper-cursor/docs/项目技术蓝图.md` sections `5.10`, `8.4`, `8.5`, `8.6` — mini-program keeps frontend analytics to retention-critical events and relies on structured server events for other operational statistics.

### Current Code Evidence

| Fact | Evidence |
|---|---|
| Landing CTA opens signup modal or routes logged-in users to dashboard. | `pages/index.tsx:104-116`, `pages/index.tsx:218-235`, `pages/index.tsx:274-284` |
| Signup/login success happens inside the shared auth modal. | `components/Auth/LoginModal.tsx:59-130` |
| Guest onboarding has a 3-step flow and completes with child profile/challenge/first question payload. | `components/Chat/GuestOnboarding.tsx:324-360`, `components/Chat/GuestOnboarding.tsx:376-430` |
| Chat send is centralized through `services/chat.ts` and `stores/chatStore.ts`. | `services/chat.ts:41-67`, `stores/chatStore.ts:136-164`, `stores/chatStore.ts:268-292` |
| Chat stream triggers memory extraction after saved logged-in chat completion. | `pages/api/chat/stream.ts:346-375` |
| Memory extraction writes `memory_items` and returns added/updated/deleted counts. | `pages/api/memory/extract.ts:420-489` |
| Growth Plan CRUD and check-in are implemented on `/plan`. | `pages/plan/index.tsx:46-131`, `pages/plan/index.tsx:133-215` |
| Growth Plan table has user-owned RLS. | `supabase/migrations/20260509000100_growth_plan_tables.sql:3-57` |
| Contact form posts to `/api/contact`, which sends an internal feedback email and emits sanitized operational metadata only. | `components/Landing/ContactModal.tsx:35-64`, `pages/api/contact.ts` |

### Implementation Pass Notes — 2026-05-19

- Added internal Supabase `analytics_events` migration.
- Added analytics event allowlist, server helper, client helper, and `POST /api/analytics/event`.
- Instrumented landing CTA, credentials auth success, guest onboarding step/dropoff, guest chat milestones, authenticated chat milestones/errors, memory extraction counts, growth-plan save prompt show/click, plan item save, and contact form submission.
- Updated `/privacy` with the MVP analytics disclosure.
- Added QQ SMTP internal weekly email report endpoint at `pages/api/analytics/cron/weekly-report.ts`, protected by `CRON_SECRET`, plus Vercel cron schedule `10 0 * * 1` (Monday 08:10 Asia/Shanghai).
- Analytics deletion posture is now decided for MVP: account deletion removes account-owned content and child/family data, while privacy-safe analytics rows remain with `user_id` nulled via `ON DELETE SET NULL`.

### New Document Justification

MVD result: new spec is justified because analytics is a cross-cutting module with its own event contract, schema, API, privacy posture, and acceptance gates. Adding this to `compliance.md`, `growth-plan.md`, or `memory-profile-summary.md` would blur module ownership and make event taxonomy harder to audit.

---

## 1. Search Evidence And Source Links

### Search Ledger

| Decision ID | Query | Result | Source URL | Supported Claim | Unsupported Gap |
|---|---|---|---|---|---|
| ADR-1 | MVP product analytics funnel activation retention events privacy friendly analytics SaaS official guide | Found(partial) | https://amplitude.com/docs/analytics | Mature product analytics commonly centers on funnels, retention, cohorts, and dashboards. | Does not decide Qimi's vendor or exact event list. |
| ADR-1 | Amplitude retention analysis official | Found | https://amplitude.com/docs/analytics/charts/retention-analysis/retention-analysis-build | Retention analysis compares a starting event with a later return event. | Qimi must define its own activation/return events. |
| ADR-1 | Amplitude funnel analysis official | Found | https://amplitude.com/docs/analytics/charts/funnel-analysis/funnel-analysis-build | Funnel analysis measures ordered conversion through product steps and dropoff. | Qimi should avoid overbuilding a dashboard. |
| ADR-2 | PostHog product analytics event naming best practices official | Found | https://posthog.com/docs/product-analytics/best-practices | Track growth events explicitly; use naming conventions; keep event/property names static; prefer backend tracking where accurate data matters; filter internal users. | PostHog is vendor guidance, not a compliance rule. |
| ADR-2 | PostHog capture events event properties official | Found | https://posthog.com/docs/product-analytics/capture-events | Events have names and properties; custom events are appropriate for product-critical actions. | Does not require using PostHog. |
| ADR-3 | Plausible privacy-friendly analytics no cookies no personal data official | Found | https://plausible.io/privacy-focused-web-analytics | Privacy-friendly analytics can minimize data, avoid cookies/persistent identifiers, and focus on aggregate trends. | Plausible is mainly web analytics; it does not cover Qimi's authenticated product funnel deeply enough. |
| ADR-3 | Plausible data policy no personal data cookies official | Found | https://plausible.io/data-policy | No-cookie, no-personal-data analytics can reduce cookie-banner and consent burden. | Vendor claims still need Qimi privacy review if adopted. |
| ADR-4 | Sentry Next.js sensitive data default PII docs | Found | https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/environments/ | `beforeSend` can strip or drop error events before sending; sampling is configurable. | Third-party error telemetry still adds privacy policy/vendor review work. |
| ADR-4 | Sentry JavaScript data collected PII default official | Found | https://docs.sentry.io/platforms/javascript/guides/react/data-management/data-collected | Sentry JavaScript SDK defaults avoid cookies, logged-in user info, and IP unless PII options are enabled, but URLs/headers can still contain sensitive data. | Not sufficient for MVP health-adjacent privacy without configuration and policy update. |

### Evidence Interpretation

- External research supports a small set of explicit product-critical events, ordered funnel analysis, activation events, retention based on a starting event plus return event, static event names, static properties, backend capture for authoritative outcomes, and internal-user filtering.
- External research also supports minimizing tracking technology: no session replay, no autocapture, no cookies or persistent cross-site identifiers, no raw message/profile/medical content in analytics events.
- Internal Qimi evidence supports using the same lightweight philosophy as the mini-program: only retention-critical frontend events plus server-side structured events for reliable outcomes.

---

## 2. MVP Analytics Boundary

### Goals

The MVP must answer these questions without a heavy admin dashboard:

1. Landing: Which CTAs move users toward signup/chat?
2. Signup/login: Do users successfully enter authenticated use?
3. Onboarding: Where do guest/onboarding users drop off?
4. Activation: How many users send the first chat and reach meaningful chat milestones?
5. Memory: Is conversation-derived memory actually being extracted?
6. Growth Plan: Are users seeing, clicking, and saving plan prompts/items?
7. Retention: Do activated users come back on D1/D7 and send another chat or save/check in a plan?
8. Reliability: Which chat errors block activation or retention?

### In Scope

- One internal `analytics_events` Supabase table.
- One write API: `POST /api/analytics/event`.
- Server-side helper for authoritative events.
- Thin client helper for CTA/onboarding UI events.
- Event taxonomy documented in this spec.
- SQL queries or a minimal internal JSON summary endpoint for weekly review.
- Structured `chat:error` and memory/plan outcome events without raw user content.

### Out Of Scope

- No complex admin dashboard.
- No session replay.
- No heatmaps.
- No autocapture.
- No ad pixels.
- No cross-site tracking.
- No storing chat text, child name, email, contact message, plan strategy text, memory fact value, diagnosis, medication, or uploaded file metadata in analytics event payloads.
- No third-party product analytics SDK in MVP.
- No cookie banner solely for analytics, because the MVP design should avoid analytics cookies/localStorage identifiers.

---

## 3. Storage Decision

### Decision: Use Internal Supabase Event Table For MVP

Use Supabase as the analytics source of truth for product events. Do not add PostHog, Amplitude, Mixpanel, GA, or Plausible for the authenticated product funnel in MVP.

Reasons:

- Qimi is health-adjacent and stores family/child support context. Avoiding a third-party analytics processor lowers privacy review and consent burden.
- Existing architecture already uses Supabase as primary DB and API routes as server-side mutation boundaries.
- Product questions are limited and can be answered with SQL/counts, not a BI dashboard.
- Backend tracking is more reliable for signup, chat success, memory extraction, and plan save outcomes.
- A future migration to PostHog/Amplitude remains possible because events are structured with static names and properties.

### Explicit Non-Decision

Do not add Sentry in the analytics MVP. Error observability is covered by `chat:error` events and structured server logs for now. Sentry can be a later reliability task if Qimi accepts third-party telemetry, configures `beforeSend` scrubbing, disables PII, avoids replay, and updates privacy policy accordingly.

---

## 4. Event Naming Convention

Format:

```text
{area}:{object}_{verb}
```

Rules:

- Lowercase only.
- Snake case for object/action.
- Static event names only. Variable detail goes into properties.
- Verb/action tokens are fixed by the allowlist. Prefer infinitive actions for UI signals (`click`, `show`) and completed-outcome tokens for server-confirmed results (`success`, `saved`, `extracted`, `submitted`).
- Allowed initial tokens: `view`, `click`, `submit`, `submitted`, `success`, `fail`, `complete`, `dropoff`, `send`, `reach`, `extracted`, `show`, `save`, `saved`, `error`.
- Use completed outcomes only when the event represents a confirmed result: `auth:signup_success`, `memory:fact_extracted`, `contact:form_submitted`, `plan:item_saved`.
- Do not encode route, step number, milestone, or category into the event name.

Examples:

- Good: `onboarding:step_complete` with `step_number=2`
- Bad: `onboarding_step_2_completed`

---

## 5. Shared Event Fields

Every event row must include:

| Field | Type | Required | Source | Notes |
|---|---:|---:|---|---|
| `event_name` | text | yes | client/server | Must be from allowlist. |
| `event_version` | int | yes | helper | Start at `1`. Increment only for breaking property changes. |
| `occurred_at` | timestamptz | yes | server | Server timestamp by default; client timestamp optional in properties. |
| `user_id` | uuid nullable | no | server session | Set for logged-in users. Never accept client-supplied user_id. |
| `anonymous_id` | text nullable | no | client | Ephemeral per browser session only. No persistent localStorage cookie. |
| `session_id` | text nullable | no | client | `crypto.randomUUID()` held in memory for page session. |
| `page_path` | text | yes | client/server | Strip query except allowed UTM keys. |
| `referrer_host` | text nullable | no | client | Host only, not full URL. |
| `utm_source` | text nullable | no | client | Landing attribution. |
| `utm_medium` | text nullable | no | client | Landing attribution. |
| `utm_campaign` | text nullable | no | client | Landing attribution. |
| `device_type` | text nullable | no | client | `desktop`, `mobile`, `tablet`, `unknown`. |
| `environment` | text | yes | server | `local`, `staging`, `production`. |
| `is_internal` | boolean | yes | server/helper | True for localhost, staging, configured internal emails, configured internal domains, `ADMIN_EMAIL`, or `FEEDBACK_TO`. |
| `properties` | jsonb | yes | client/server | Event-specific allowlisted properties only. |

Forbidden fields anywhere in analytics:

- `email`, `name`, `child_name`, `contact`, `message`, `prompt`, `response`, `chat_text`, `memory_value`, `plan_strategy`, `plan_pain_point`, raw `user_agent`, raw IP address, full referrer URL, OAuth provider account id.

---

## 6. Event Catalog

### 6.1 Funnel And Activation Events

| Event | Required Properties | Optional Properties | Capture Location | Source |
|---|---|---|---|---|
| `landing:cta_click` | `cta_id`, `cta_location`, `destination`, `auth_state` | `experiment_key` | `pages/index.tsx`, `components/Landing/LandingLayout.tsx`, `components/Landing/Hero.tsx` | Client |
| `auth:signup_success` | `method` | `consent_captured` | after successful `/api/auth/signup` + login/consent flow | Server preferred; client fallback |
| `auth:login_success` | `method` | none | NextAuth credentials/OAuth callback success path | Server preferred |
| `onboarding:step_complete` | `step_number`, `step_key` | `selected_count` | `components/Chat/GuestOnboarding.tsx` when moving steps | Client |
| `onboarding:step_dropoff` | `step_number`, `step_key`, `time_on_step_ms` | `last_valid_state` | unload/route-change or timeout heuristic | Client best-effort |
| `chat:first_message_sent` | `conversation_type`, `auth_state`, `has_attachment`, `folder_key` | none | first successful user send request | Server preferred |
| `chat:message_count_milestone_reach` | `milestone`, `auth_state` | `conversation_id_hash` | after successful persisted or guest message count reaches threshold | Server for logged-in; client for guest |
| `memory:fact_extracted` | `added_count`, `updated_count`, `deleted_count`, `source` | `conversation_id_hash` | `pages/api/memory/extract.ts` after extraction result | Server |
| `plan:save_prompt_show` | `prompt_source`, `category` | `conversation_id_hash` | DSML save-plan prompt render point | Client |
| `plan:save_prompt_click` | `prompt_source`, `category` | `conversation_id_hash` | save-plan CTA click | Client |
| `plan:item_saved` | `save_source`, `category` | none | successful `POST /api/plan` | Server |
| `contact:form_submitted` | `source`, `has_session` | none | successful `/api/contact` | Server |
| `chat:error` | `error_stage`, `error_code`, `http_status`, `auth_state` | `retryable`, `conversation_id_hash` | chat API/service error path | Server plus client fallback |

### 6.2 Milestones

Track only these message milestones:

```text
1, 3, 5, 10, 20
```

Rationale: enough to see activation depth without high-volume message analytics.

### 6.3 Activation Definitions

Primary activation:

- `chat:first_message_sent` by a new user or guest.

Strong activation:

- reaches `chat:message_count_milestone_reach` with `milestone=3`, or
- `memory:fact_extracted` with `added_count + updated_count > 0`, or
- `plan:item_saved`.

### 6.4 Retention Definitions

Use event-based retention, not pageview-only retention.

- Start event: `chat:first_message_sent` or `auth:signup_success`.
- D1 return event: any of `chat:first_message_sent`, `chat:message_count_milestone_reach`, `plan:item_saved`, plan check-in event if later added.
- D7 return event: same return event set over a 7-day window.
- MVP review cadence: weekly SQL export or internal summary JSON, not dashboard.

---

## 7. API And Storage Design

### 7.1 Migration

Create a versioned migration under `supabase/migrations/`.

```sql
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_version INTEGER NOT NULL DEFAULT 1,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  session_id TEXT,
  page_path TEXT NOT NULL,
  referrer_host TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT,
  environment TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_time
  ON analytics_events(event_name, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_time
  ON analytics_events(user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_time
  ON analytics_events(session_id, occurred_at DESC);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- No browser SELECT access. All writes go through API route using service role.
-- No INSERT/UPDATE/DELETE RLS policies are needed for anon clients.
```

Retention:

- Raw analytics rows: keep 180 days for MVP.
- Aggregated weekly metrics: keep indefinitely if a later aggregation table is added.
- Account deletion: `user_id` becomes null via `ON DELETE SET NULL`; event payload must not contain PII, so aggregate event history can remain after account-owned content and child/family data are deleted.
- Launch gate: verify the implemented privacy copy, deletion API, and analytics event allowlist all match this decision before production rollout.

### 7.2 Write API

`POST /api/analytics/event`

Input:

```ts
{
  eventName: string;
  eventVersion?: 1;
  anonymousId?: string;
  sessionId?: string;
  pagePath: string;
  referrerHost?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  properties?: Record<string, unknown>;
}
```

Rules:

- Validate `eventName` against the event allowlist.
- Validate each event's property allowlist.
- Derive `user_id` from session, never request body.
- Derive `environment` server-side.
- Derive `is_internal` from host, env, optional internal exact-email allowlist, existing operational email env vars, and optional internal email domain allowlist.
- Reject payloads over 8 KB.
- Return `{ success: true }` or `{ error: "..." }`.
- Rate-limit public client writes by IP/session if a project-wide limiter exists by implementation time. If none exists, add minimal in-memory per-process limiter for this endpoint only.

### 7.3 Server Helper

Add `lib/analytics.ts`:

- `trackServerEvent(req, res, eventName, properties, options)`
- `trackClientEvent(eventName, properties)` helper in `lib/client-analytics.ts`
- Shared event allowlist in `lib/analytics-events.ts`

No new Zustand store is required.

### 7.4 Summary Read

MVP can use SQL directly in Supabase Studio/local psql. If a lightweight endpoint is useful, add:

`GET /api/analytics/summary?days=7`

Access:

- Only enabled outside production, or protected by existing admin mechanism if one exists by then.
- If no admin auth exists, do not ship this endpoint to production. Use SQL manually.

### 7.5 Weekly Email Report

Implementation endpoint:

`GET|POST /api/analytics/cron/weekly-report`

Rules:

- Requires `Authorization: Bearer ${CRON_SECRET}`.
- Runs weekly through Vercel Cron at `10 0 * * 1`, which is Monday 08:10 in Asia/Shanghai.
- Sends to `ADMIN_EMAIL` through QQ SMTP using `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `MAIL_FROM`.
- Supports `?dryRun=1` for local validation without sending email.
- Report contains aggregate event counts only. It must not include user identifiers, chat text, contact content, memory values, plan text, or raw request metadata.

---

## 8. Capture Locations

| Area | Files | Implementation Notes |
|---|---|---|
| Landing CTA | `pages/index.tsx`, `components/Landing/LandingLayout.tsx`, `components/Landing/Hero.tsx` | Track named CTA clicks before modal open or route push. |
| Auth success | `components/Auth/LoginModal.tsx`, auth API/callback code | Prefer server-side success events. Client event acceptable only after confirmed success. |
| Onboarding | `components/Chat/GuestOnboarding.tsx` | Track step completion on `goToStep2`, `goToStep3`, `handleFinish`. Track best-effort dropoff with current step and elapsed ms. |
| Chat first sent/milestones | `stores/chatStore.ts`, `services/chat.ts`, `pages/api/chat/stream.ts` | Server knows persisted logged-in messages; client handles guest-only milestones. |
| Chat error | `pages/api/chat/stream.ts`, `services/chat.ts`, `stores/chatStore.ts` | Server event includes stage and code; client fallback only when request fails before server can record. |
| Memory extracted | `pages/api/memory/extract.ts` | Emit when extraction returns counts; no fact values. |
| Growth plan prompt | DSML save-plan render/click component when implemented | Show/click events are client-side UI signals. |
| Growth plan save | `pages/api/plan/index.ts` | Emit after successful insert. |
| Contact form | `pages/api/contact.ts` | Emit after accepted submission; do not include title/message/contact. |

---

## 9. Privacy And Compliance Impact

### Privacy Policy

Update before launch if analytics MVP ships.

Required additions:

- Qimi collects limited product usage events such as CTA clicks, onboarding step completion, chat send milestones, plan save actions, contact form submission status, and chat error metadata.
- Analytics events are used to understand onboarding, activation, retention, feature reliability, abuse prevention, and product improvement.
- Analytics events do not include chat message text, child names, contact message contents, plan text, memory fact values, emails, or raw IP addresses.
- Analytics is stored in Qimi's Supabase database for MVP and is not sold or used for advertising.
- Raw analytics retention target is 180 days unless changed by final policy.
- Account deletion keeps de-identified operational analytics rows only if they do not contain personal or sensitive content; account-owned content and child/family data must be deleted.

### Consent

No separate analytics consent banner is required for the proposed MVP design because:

- no analytics cookies,
- no persistent cross-site identifiers,
- no third-party analytics SDK,
- no advertising or profiling,
- no session replay.

However, the existing adult authorization flow should remain unchanged. If Qimi later adds third-party analytics, session replay, persistent identifiers, EU targeting, ad pixels, or behavioral profiling, this decision must be revisited and privacy/consent updated before release.

### Compliance Guardrails

- Keep analytics adult-directed and parent-account scoped.
- Never track raw child/family/medical content.
- Treat `medical`, `diagnosis`, medication names, school names, teacher names, and child names as forbidden analytics payloads.
- Do not use analytics to make automated health, education, diagnosis, treatment, or eligibility decisions.

---

## 10. Acceptance Standards

Execution order follows project control:

1. Technical acceptance
2. Functional acceptance plan
3. Human acceptance
4. Merge or carry-forward decision

### Technical Acceptance

- Branch and environment are confirmed.
- `.env.local` points to local Supabase before DB-backed testing.
- Migration creates `analytics_events` locally via `npm run supabase:reset`.
- `npm run build` passes.
- `POST /api/analytics/event` rejects unknown event names and forbidden properties.
- Logged-in server events store `user_id`; guest/client events do not accept spoofed `user_id`.
- Public write endpoint does not expose table errors, stack traces, or raw validation internals.
- No analytics event includes forbidden fields in local test payloads.

### Functional Acceptance Plan

Verify locally:

1. Landing signup CTA emits `landing:cta_click`.
2. Signup success emits `auth:signup_success`.
3. Login success emits `auth:login_success`.
4. Guest onboarding step 1/2/3 completion emits `onboarding:step_complete`.
5. Leaving onboarding mid-flow emits best-effort `onboarding:step_dropoff`.
6. First chat send emits `chat:first_message_sent`.
7. Chat message milestones emit only at 1/3/5/10/20.
8. Chat API failure emits `chat:error` with sanitized stage/code.
9. Memory extraction emits `memory:fact_extracted` with counts only.
10. Growth plan prompt show/click/save emit the three plan events when that UI path exists.
11. Manual `/plan` save emits `plan:item_saved`.
12. Contact form success emits `contact:form_submitted` without contact text.
13. Internal/local events are marked `is_internal=true`.

### Human Acceptance

Human reviewer receives:

- local SQL query showing each required event appeared once in the expected flow,
- one negative test showing forbidden payload rejected or stripped,
- one weekly funnel SQL sample,
- privacy policy diff showing analytics disclosure added.

---

## 11. Task Split

| Task | Mode | Gate | Machine Gate | Scope |
|---|---|---|---|---|
| T1 Schema + event contract | Linear | Single-item Gate | `npm run supabase:reset` | Add migration and `lib/analytics-events.ts` allowlist. |
| T2 Analytics API + server helper | Linear | Single-item Gate | API smoke tests via curl/local server | Add write endpoint, validation, server helper. |
| T3 Client helper + landing/onboarding events | Controlled parallel after T2 | Batch Gate | build + manual local event SQL | Add client helper, session-only IDs, CTA/onboarding/dropoff tracking. |
| T4 Auth/chat/memory/plan/contact server events | Controlled parallel after T2 | Batch Gate | build + API flow smoke | Add authoritative server-side events. |
| T5 Privacy policy update | Linear after event payload final | Single-item Gate | manual content review | Update `/privacy` analytics disclosure. |
| T6 Acceptance SQL snippets | Linear after T3/T4 | Batch Gate | local psql/Supabase Studio queries | Add doc section or comments in spec with weekly funnel query examples if needed. |

Implementation note: if T3 and T4 are parallelized, assign disjoint files and avoid both workers editing the same analytics helper.

---

## 12. AQS Self-Review

### 一、安全

- [PASS] 认证方案：server events derive user identity from NextAuth session; client cannot set `user_id`.
- [PASS] 授权方案：analytics table has no anon SELECT access; writes go through API route with allowlist validation.
- [PASS] 纵深防御：event payload forbids PII/health-adjacent content; RLS prevents browser reads.
- [PASS] 输入校验：event names and properties are allowlisted; payload size limit required.
- [PASS] 速率限制：public analytics endpoint requires minimal limiter if no shared limiter exists.
- [PASS] 密钥管理：no new third-party keys in MVP.
- [PASS] 错误信息：API returns generic `{ error: "..." }`.
- [PASS] 资源回收：single insert operation; no durable external resource.

### 二、架构

- [PASS] 分层清晰：client helper → analytics API/server helper → Supabase table.
- [PASS] 单一职责：one write endpoint, one event table, no dashboard.
- [PASS] 依赖倒置：environment is server-derived; no hardcoded production Supabase.
- [PASS] 导航统一：no user-facing route.
- [PASS] 路由规划：only `pages/api/analytics/*`, no page route.
- [PASS] 外部调用：no third-party analytics call in MVP.
- [PASS] 错误格式：uses existing `{ error: "..." }` convention.
- [PASS] 错误边界：not UI-facing; client helper must fail silently.
- [PASS] 幂等性：analytics writes are append-only; duplicate best-effort client events are acceptable and filtered in analysis by session/user/time.
- [PASS] 正式依据入口：this spec is the module contract.
- [PASS] 线性/并行规则：task table marks mode and gates.
- [PASS] 机器 Gate 先于人工 Gate：technical acceptance precedes human acceptance.

### 三、工程质量

- [PASS] 测试策略：API validation and privacy-negative tests are required.
- [PASS] 日志策略：`chat:error` is structured; server logs should use event codes, not raw content.
- [PASS] 共享代码：central allowlist prevents duplicate event definitions.
- [PASS] 函数规模：helpers should stay small and single-purpose.
- [PASS] 依赖安全：no new npm dependency.
- [PASS] 可访问性：no new UI controls except existing click handlers.
- [PASS] 证据分层：external evidence and internal code evidence are separated above.
- [PASS] 交付语言：internal spec English; user-facing privacy copy remains English per current site.
- [PASS] 正式交付物：module spec plus migration/API/helper implementation tasks.

### 四、技术栈合规

- [PASS] 官方推荐用法：Supabase remains primary DB; API route handles server-side write boundary.
- [PASS] 反模式检查：no third-party autocapture/session replay; no `USING(true)` policy.
- [PASS] 版本兼容：uses existing Next.js API route and Supabase JS patterns.
- [PASS] 依赖锁定：no dependency changes.

### 五、反向检查

- [PASS] 无过度设计：no dashboard, no BI stack, no event bus, no vendor SDK.
- [PASS] MVP 适配：answers first 5,000-user funnel/activation/retention/reliability questions.
- [PASS] 无冗余：single event table and allowlist.
- [PASS] 无遗留：implementation tasks must not leave TODO/debug logs.
- [PASS] 可逆性检查：migration is additive; no destructive data operation.
- [PASS] MVD：new spec justified by independent cross-cutting module scope.

### Summary

- PASS: all reviewed AQS areas.
- FAIL: 0.
- EXCEPTION: 0.
- Status: ready for human planning review before implementation.
