# Module Spec: AI Usage Quota and Cost Control

> Status: PROPOSED, planning only
> Created: 2026-07-26
> Scope: Chat and Growth Plan AI allowances, burst protection, cost-bearing endpoint coverage, quota visibility, reset semantics, accessibility, and acceptance.
> Implementation status: Partially implemented, not accepted under this spec
> Human approval required before implementation

## 0. Why this is a separate spec

AI usage control crosses chat, Growth Plan, guest identity, database functions, analytics, provider calls, and three user interfaces. Adding this design to only the chat or Growth Plan spec would leave the other cost surfaces without one source of truth. This cross-module boundary satisfies the project Minimum Viable Documentation exception for a separate spec.

## 1. Confirmed product policy

These limits come from the product owner. External sources do not determine the numeric allowances.

| User action | Allowance | Reset | Source axis | Maturity |
|---|---:|---|---|---|
| Guest chat | 10 messages | Never | Internal product choice | Provisional |
| Registered free chat | 30 messages | Daily at 00:00 Asia/Shanghai | Internal product choice | Provisional |
| Authenticated AI plan actions | 10 actions | Weekly on Monday at 00:00 Asia/Shanghai | Internal product choice | Provisional |
| Non-AI plan storage and tracking | No AI allowance | Not applicable | Internal product choice | Stable |
| Technical burst protection | 5 accepted attempts per minute per actor and scope | Fixed 60 second window | Internal security threshold | Provisional |

Generate, Regenerate, and AI-assisted Save from Chat share the weekly AI plan allowance. Viewing, saving an already generated draft, editing, starring, checking in, and deleting do not call the model and must not consume it.

## 2. Current implementation evidence

### 2.1 What is already correct

- The current constants are guest 10 lifetime, registered chat 30 daily, plan AI 10 weekly, and persistent burst protection 5 per minute in `lib/ai-usage.ts:L4-L9`.
- Shanghai day and week keys are calculated on the server in `lib/ai-usage.ts:L13-L31`.
- Quota increments use a database function and return allowed, used, and remaining in `lib/ai-usage.ts:L39-L60`.
- The database function locks the counter row before incrementing it in `supabase/migrations/20260725000100_ai_usage_quotas.sql:L31-L76`.
- Counter and burst tables have no browser policies. Function execution is revoked from public, anon, and authenticated roles in `supabase/migrations/20260725000100_ai_usage_quotas.sql:L133-L139`.
- The chat route resolves the server-side actor, applies persistent burst protection, consumes the product quota, and only then builds the model request in `pages/api/chat/stream.ts:L688-L740`.
- AI plan generation consumes the shared plan allowance in `pages/api/plan/generate.ts:L144-L154`.
- AI Save from Chat paths consume the shared plan allowance in `pages/api/plan/extract-from-chat.ts:L466-L476` and `pages/api/plan/save-from-chat.ts:L480-L490`.
- The guest identifier is a server-issued, HttpOnly, SameSite cookie with a one-year lifetime in `lib/guest-session.ts:L4-L23`.

### 2.2 Confirmed gaps

#### P0: not every direct cost-bearing route is covered by the product allowance

- The plan decision route invokes the model from a browser-triggered request. It has persistent burst protection but does not consume chat or plan product allowance in `pages/api/plan/decision.ts:L122-L152`. The browser calls it for each assistant response in `components/GrowthPlan/SaveFromChatButton.tsx:L64-L101`.
- Conversation title generation can call the model twice. It has a process-local minute limiter and ownership check, but no persistent product allowance or server-side one-use binding in `pages/api/conversations/generate-title.ts:L160-L217`.
- Memory extraction is callable as an authenticated API route and can run a model gate, extraction, and summary rewrite for an owned conversation. It has ownership checks but no persistent allowance, no durable idempotency key, and no persistent burst limiter in `pages/api/memory/extract.ts:L405-L465` and `pages/api/memory/extract.ts:L570-L586`.
- One accepted chat action can call the module router, RAG router, relevance gate, answer model, optional synthesis model, title model, and memory extraction models. The action quota limits user actions, but there is no explicit provider-call ceiling or token telemetry for the full cascade. The module router is reached through `lib/prompts.ts:L59-L72`; the chat route starts the RAG path in `pages/api/chat/stream.ts:L841-L850`; memory extraction is triggered after a saved chat in `pages/api/chat/stream.ts:L904-L917`.

#### P0: guest client state can disagree with server authority

- The browser blocks a guest before the request when local storage reaches its own count in `pages/chat.tsx:L229-L248`.
- The local check is implemented separately from the server counter in `utils/guest-storage.ts:L153-L180`.
- This can produce an incorrect block after local database replacement, browser migration, or counter drift. Server quota must be the only enforcement source. Client storage may display history but must not decide access.

#### P1: quota status is incomplete and not consistently visible

- The status API returns limit, used, remaining, and period, but no exact reset timestamp in `pages/api/quota/status.ts:L8-L30`.
- Chat hides the allowance when usage is zero, so a new user cannot see the full allowance in `pages/chat.tsx:L413-L423`.
- Growth Plan displays the allowance only inside the open generator in `pages/plan/index.tsx:L393-L406` and `components/GrowthPlan/PlanGenerator.tsx:L186-L189`.
- Dashboard has no compact AI usage summary.

#### P1: focused regression tests are missing

No focused automated test currently covers the 10th and 11th guest messages, the 30th and 31st registered messages, the 10th and 11th plan actions, concurrent consumption, Shanghai reset boundaries, non-AI actions, or direct cost-bearing endpoint abuse.

## 3. External evidence and applicability

### 3.1 Verified sources

| Source | Type | Supported claim | Unsupported gap | Retrieval log |
|---|---|---|---|---|
| [OWASP API4:2023](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/) | Mainstream maintained standard guidance | Cost-bearing integrations need server-side interaction limits, payload limits, provider spending limits or billing alerts | Does not define Qimi's numeric limits or quota UI | `turn20view2`; curl trace returned 200 |
| [IETF RFC 6585, section 4](https://www.ietf.org/rfc/rfc6585.txt.pdf) | Official standard | Rate-limited requests use HTTP 429, should explain the condition, and may include Retry-After | Does not define product allowance display | `turn21search13`; curl trace returned 200 |
| [GitHub REST API rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2022-11-28) | Official vendor documentation | A mature API exposes limit, used, remaining, reset, and resource, and tells clients when to retry | Developer API behavior is indirect evidence for consumer UI placement | `turn20view3`; curl trace returned 200 |
| [Google Cloud quota management](https://docs.cloud.google.com/docs/quotas/view-manage?hl=en) | Official vendor documentation | Quota management surfaces limits and usage, and supports usage charts by quota | Administrative console design is indirect evidence for Qimi's parent-facing UI | `turn21search3`; curl trace returned 200 |
| [WCAG 2.2, status messages](https://www.w3.org/TR/WCAG22/#status-messages) | Official web standard | Dynamic status changes must be programmatically determinable without moving focus | Does not specify quota colors or copy | `turn20view4`; curl trace returned 200 |
| [Supabase database functions](https://supabase.com/docs/guides/database/functions) | Official vendor documentation | Security-definer functions need a fixed search path, and function execution privileges must be restricted | Does not define quota algorithms | `turn23search5`; curl trace returned 200 |
| [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) | Official vendor documentation | Exposed tables need RLS; service credentials bypass RLS and must stay server-side | Does not define UI or numeric limits | `turn23search0`; curl trace returned 200 |
| [DeepSeek chat completion API](https://api-docs.deepseek.com/api/create-chat-completion/) | Official provider documentation | Responses can include prompt, completion, and total token usage; streaming can request a final usage chunk | Does not define Qimi's product allowance | `turn24search0`; curl trace returned 200 |
| [DeepSeek rate limit and isolation](https://api-docs.deepseek.com/quick_start/rate_limit/) | Official provider documentation | Provider concurrency limits are account-level; a non-PII user_id supports user isolation; provider overload returns 429 | Provider concurrency limits do not replace Qimi's cost controls | `turn24search3`; curl trace returned 200 |

The links above were opened in this planning session. A separate curl verification followed redirects and returned HTTP 200 for every final URL.

### 3.2 Search Ledger

| Decision ID | Query | Result | Source URL |
|---|---|---|---|
| ADR-1 | OWASP API Security unrestricted resource consumption rate limiting spending limits | Found | OWASP API4:2023 |
| ADR-2 | RFC 6585 429 Too Many Requests Retry-After official | Found | IETF RFC 6585 |
| ADR-3 | REST API quota limit remaining used reset headers | Found | GitHub REST API limits |
| ADR-3 | quota dashboard current usage limits charts | Found(partial) | Google Cloud quota management |
| ADR-4 | WCAG dynamic status messages role status | Found | WCAG 2.2 |
| ADR-5 | Supabase security definer function revoke execute RLS | Found | Supabase functions and RLS documentation |
| ADR-6 | DeepSeek chat completion usage tokens stream include_usage | Found | DeepSeek chat completion API |

## 4. ADR-lite decisions

| ID | Decision | Risk | External evidence | Local evidence | Supported claim | Unsupported gap | Status | Confirmation |
|---|---|---|---|---|---|---|---|---|
| ADR-1 | Every route that can cross a paid AI provider boundary must be covered by an authenticated or durable guest action allowance plus burst protection | High, cost and availability | OWASP API4 | Section 2.2 route inventory | Bound cost-bearing interactions server-side | Exact allowances remain internal | Proposed | Endpoint inventory test, abuse test, token telemetry |
| ADR-2 | Product allowance is enforced only by an atomic server-side database operation | High, authorization and cost | Supabase functions and RLS | Existing locked function in migration lines 31 to 76 | Server-only function and restricted privileges provide defense in depth | Exact counter algorithm is project-specific | Accepted, already implemented | Concurrency test and privilege audit |
| ADR-3 | Show product allowances in context and in one compact Dashboard usage card | Normal, usability | GitHub fields; Google quota view is partial | Current UI gaps in section 2.2 | Users benefit from visible limit, usage, remaining, and reset information | Exact placement and visual treatment are internal | Proposed | Mobile human test and analytics |
| ADR-4 | Return exact `resetsAt` for renewable allowances, use HTTP 429 and Retry-After for temporary burst limits, and expose accessible live status | Normal, usability and accessibility | RFC 6585, GitHub, WCAG 2.2 | Current status response lacks reset timestamp | Clear retry and reset information reduces blind retrying; dynamic status needs accessibility semantics | Exact copy and warning threshold are internal | Proposed | Contract tests and screen reader smoke test |
| ADR-5 | Count one user action once, even if that action has bounded internal model calls; make retries idempotent | High, cost and fairness | OWASP supports bounding operations, but not this exact accounting model | Current plan generation can retry internally within one action | User action and provider-call controls must both be bounded | One-action accounting and idempotency key design are internal | Proposed | Concurrent retry tests and event audit |
| ADR-6 | Record provider-call count and token usage without prompts, responses, child data, plan content, or raw IP | High, privacy and cost | DeepSeek exposes usage fields; OWASP supports cost monitoring | Current implementation does not retain provider usage | Token telemetry supports cost monitoring without content logging | Retention period is internal and needs approval | Proposed | Privacy review and zero-content log test |

## 5. Proposed target behavior

### 5.1 Enforcement order

Every cost-bearing action follows this order:

1. Resolve authenticated user or durable guest actor on the server.
2. Validate method, payload size, types, lengths, and required fields.
3. Validate ownership for referenced conversations, messages, and plans.
4. Apply the persistent burst limiter.
5. Consume or reuse one idempotent product action immediately before the first provider request.
6. Run only the bounded internal provider calls allowed for that action type.
7. Record provider-call count, token usage, outcome, and latency without user content.
8. Return updated allowance fields on success and on quota failure.

Validation, authentication, and ownership failures do not consume an allowance. Once the first provider request is transmitted, the action counts even if the provider times out or returns an error, because it may have incurred cost. Internal retries for the same action do not consume another product action.

### 5.2 Cost surface rules

| Surface | Product action | Target rule |
|---|---|---|
| Main chat response | One chat action | One action allowance, bounded internal model-call ceiling, provider usage telemetry |
| Module router, RAG router, relevance gate, optional synthesis | Part of the chat action | Never directly callable by browser; count provider calls, not extra product actions |
| Conversation title | Part of the first successful registered chat action | One durable title job per conversation; direct repeated browser calls cannot create more jobs |
| Memory extraction and summary | Part of the completed registered chat action | Durable idempotency by conversation plus last processed message; no repeated extraction for unchanged messages |
| Save prompt decision | No paid model call | Replace the LLM classifier with deterministic local logic, or produce the decision inside the already paid chat action |
| Generate and Regenerate plan | One plan AI action | Shared weekly plan allowance; bounded draft and audit attempts |
| AI-assisted Save from Chat | One plan AI action | Shared weekly plan allowance; consolidate duplicate extraction paths where possible |
| Save, view, edit, star, check in, delete | No product action | No AI allowance consumption |

### 5.3 Idempotency and audit record

Add a server-only action ledger with no user content:

```text
ai_usage_actions
  id uuid primary key
  actor_key text not null
  feature text not null
  action_kind text not null
  idempotency_key text not null
  window_key text not null
  status text not null
  provider_calls integer not null default 0
  prompt_tokens integer not null default 0
  completion_tokens integer not null default 0
  created_at timestamptz not null
  completed_at timestamptz null
  unique(actor_key, feature, idempotency_key)
```

No prompt, response, conversation title, child information, plan text, email, or raw IP is stored in this table. Browser roles receive no table or function privileges.

The quota consume function must atomically reuse an existing action or create one action and increment the window counter. A browser-provided idempotency key is treated only as an opaque request identifier and is always bound to the server-resolved actor and feature.

### 5.4 Status API contract

`GET /api/quota/status` returns:

```json
{
  "authState": "guest",
  "chat": {
    "limit": 10,
    "used": 0,
    "remaining": 10,
    "period": "lifetime",
    "resetsAt": null
  },
  "planAi": null
}
```

Registered users receive exact ISO timestamps for daily and weekly resets. Every successful cost-bearing response also returns the updated allowance in its response body or terminal stream event. Temporary burst responses use HTTP 429 and `Retry-After`.

### 5.5 User interface

Product allowances are always visible. Technical burst limits are not shown as a permanent allowance because they are an abuse-control fuse, not something users should try to consume.

1. Chat shows a compact line above the composer with remaining, limit, and next reset. Guest copy states that the 10-message trial does not reset.
2. Growth Plan shows a compact weekly AI allowance beside Generate Plan, even before the generator opens.
3. Dashboard shows one collapsed AI Usage card with Chat and AI Plan rows. It is a shortcut to the relevant page, not a third full quota management screen.
4. Normal state uses neutral styling. Low remaining state adds an icon and text. Zero state explains the next reset or registration path.
5. Updated remaining counts use `role="status"` or an equivalent polite live region. Color is never the only status cue.
6. A burst-limit response shows a temporary countdown based on `Retry-After`. The button stays disabled until that time.

The exact low-remaining threshold is an internal UI parameter. Proposed MVP value is 20 percent remaining, marked Provisional and subject to human testing.

### 5.6 Guest limitation

The server-issued guest cookie survives ordinary browser and computer restarts. Clearing site data, private browsing, or changing devices can create a new guest trial. MVP must not add covert fingerprinting. This residual bypass is accepted provisionally, with `quota:guest_trial_created` and aggregate abuse monitoring. A later upgrade may use Supabase anonymous authentication or an explicit sign-in requirement if measured abuse becomes material.

## 6. Considered alternatives

| Option | Decision | Reason |
|---|---|---|
| Do nothing | Rejected | Cost-bearing direct routes and invisible fresh quotas remain unresolved |
| Dashboard-only quota display | Rejected | Users would leave the action page to learn why an action is blocked |
| Context-only quota display | Rejected | It does not give one account-level overview and leaves hidden plan usage before opening the generator |
| Context display plus compact Dashboard card | Proposed | Keeps decisions visible at the action point and provides one concise overview |
| Count every internal provider call as one user allowance | Rejected | One visible chat could consume several allowances because the current pipeline uses internal routing and memory calls |
| Count user actions only with no internal ceiling | Rejected | One accepted action could still create unbounded provider cost through retries or ancillary endpoints |
| One action allowance plus bounded provider-call budget | Proposed | Separates user entitlement from internal cost containment |

## 7. Implementation task plan

Implementation mode: linear.

Acceptance mode: single-item Gate for database and API tasks, then one batch Gate for UI and analytics.

Machine Gate: focused tests, TypeScript check, build, migration privilege audit, endpoint inventory check, local database integration tests, and mobile smoke test.

Human Gate: allowed only after all P0 and P1 findings are closed and the functional acceptance plan is written.

### T001: Reconcile canonical policy text

- Update stale 50-message and five-item statements that are not already marked historical.
- Preserve the current product-owner limits in one canonical table.
- Verify with repository search.

### T002: Close unmetered AI routes

- Remove the model call from plan decision or move the decision into the paid chat action.
- Bind title generation to one durable first-chat job per conversation.
- Make memory extraction idempotent for the latest completed message set and non-repeatable when nothing changed.
- Inventory all provider calls and fail the Gate if a browser-reachable paid call has neither action binding nor persistent protection.

### T003: Add idempotent action accounting

- Add a forward-only migration for the server-only action ledger.
- Update the quota database function to consume once per actor, feature, and idempotency key.
- Revoke public, anon, and authenticated access explicitly.
- Apply with `npx supabase migration up --local`. Never use a reset command.

### T004: Add reset timestamps and provider telemetry

- Return `resetsAt` from the status API.
- Request DeepSeek streaming usage where supported.
- Record provider calls and token totals without content or raw IP.
- Define a short retention period after privacy review.

### T005: Make server quota the only enforcement source

- Remove the guest local-storage pre-block.
- Keep local guest counts only for migration compatibility until safely retired.
- Use server 429 and status response for all blocking and display behavior.

### T006: Add shared quota UI

- Build one compact accessible quota component.
- Render it in Chat, Growth Plan, and a collapsed Dashboard card.
- Keep the burst countdown transient.
- Verify 320px, 375px, tablet, and desktop layouts.

### T007: Add focused automated coverage

- Test guest attempts 10 and 11.
- Test registered chat attempts 30 and 31.
- Test plan attempts 10 and 11 across Generate, Regenerate, and Save from Chat.
- Test parallel requests at the last remaining unit.
- Test daily and Monday weekly reset boundaries in Asia/Shanghai.
- Test ordinary browser restart with the same guest cookie.
- Test non-AI plan actions do not decrement allowance.
- Test repeated title, memory, and plan-decision requests cannot create repeated paid calls.
- Test 429, Retry-After, `resetsAt`, and accessible live status.
- Test no content or raw IP enters usage telemetry.

### T008: Technical acceptance

- Apply all migrations non-destructively to local Supabase.
- Run focused quota tests.
- Run TypeScript check and production build.
- Run function and table privilege audit.
- Run an outbound-provider-call inventory and compare it to the action map in section 5.2.

### T009: Functional acceptance plan

- Write exact guest, registered chat, Growth Plan, refresh, browser restart, limit reached, and reset-time scenarios.
- Record expected allowance before and after every action.
- Record expected provider-call ceiling for each scenario.

### T010: Human acceptance

- Product owner tests the agreed scenarios on local Supabase.
- Record accepted, partial, or blocked.
- Only an explicit accepted result permits merge or deployment consideration.

## 8. AQS self-review

| Area | Result | Notes |
|---|---|---|
| Authentication | PASS in design | Server resolves user or durable guest actor |
| Authorization | PASS in design | Browser roles receive no quota tables or function access |
| Input validation | PASS in design | Validation and ownership precede consumption |
| Rate limiting | PASS in design | Product allowance and technical burst protection are separate |
| Secret management | PASS in design | Provider and Supabase secret keys remain server-only |
| Error handling | PASS in design | 429 and Retry-After are explicit; internal errors remain generic |
| Architecture layering | PASS in design | Shared service owns counting; pages render status only |
| Single source of truth | PASS in design | Server-side atomic quota is authoritative |
| Observability | PASS in design | Counts and tokens only, no user content |
| Accessibility | PASS in design | Dynamic updates use programmatic status semantics |
| Reversibility | PASS in design | Forward-only additive schema; UI can be removed without deleting counters |
| MVP fit | PASS | One table, one shared component, and existing Supabase stack |
| Independent review | PENDING | Required before implementation approval |

## 9. Open product decisions

1. Approve a compact Dashboard AI Usage card in addition to context display.
2. Approve the rule that an action counts after the first provider request is transmitted, including provider timeout or failure.
3. Approve a short usage-action retention period. Proposed starting value is 90 days, marked Provisional.
4. Confirm whether registered users with an empty Family Profile should continue to see the editable empty state, or enter a reused onboarding flow. This is a separate onboarding decision and must not be bundled silently into quota implementation.

## 10. Pre-flight self-detection

1. External research was performed before this spec was written.
2. Every source URL above was opened in this planning session and verified by curl with a final HTTP 200 response.
3. Existing-code claims were rechecked against current files and include line references.
4. Numeric product allowances and the proposed 20 percent warning threshold are labeled as internal choices, not external standards.
5. This document remains Proposed. No quota implementation is authorized by this planning pass.
