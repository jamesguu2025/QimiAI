# Module Spec: Membership And Billing

> Status: APPROVED — 2026-03-17 | Self-reviewed: 2026-03-17 | Second-pass reviewed: 2026-03-17 | Implementation status: Planned (post-MVP)
> Module: membership-billing
> Routes: `/settings`, `/settings/billing`
> API routes: `pages/api/billing/*`, `pages/api/user/subscription.ts`, `pages/api/stripe/webhook.ts`
> Scope: Stripe-backed subscription purchase, billing portal, and subscription-state sync for Free/Pro gating after MVP launch.

---

## 0. Planning Baseline

This spec was written against:

- The canonical Layer 1 architecture in `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/system-architecture.md`
- The canonical project control document in `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/project-control.md`
- Existing quota assumptions in `growth-plan.md` and `report-analysis.md`
- Existing product language in Settings and Landing FAQ referring to subscriptions
- Mature industry practice for Stripe Checkout, Stripe Billing Portal, webhook-driven subscription sync, and server-owned billing mutations

### Current Implementation Snapshot

- `users.subscription_tier` is already assumed by multiple specs as the quota source of truth
- The architecture already distinguishes Free User vs Pro User
- The current web app does not implement Stripe checkout, billing portal, webhook processing, or a canonical subscription API route
- Current reality remains: all registered users behave as Free users until the billing module exists

### Design Goal

Create one explicit module to own:

1. Paid upgrade purchase flow
2. Subscription lifecycle state sync
3. Billing management UI
4. The single source of truth for Free vs Pro entitlement

This removes the current planning gap where other modules reference subscriptions, but no dedicated billing module exists.

### Module Position

- This is a **post-MVP monetization module**
- It is intentionally placed at the bottom of the forward module order
- It must not block MVP feature completion or public launch of the free experience

---

## 1. Feature Requirements

### 1.1 Billing Entry Point

Users access billing from Settings.

- Settings page keeps account basics and account deletion
- Add a "Membership" or "Billing" section inside Settings
- Free users see current tier, plan benefits, and an "Upgrade to Pro" CTA
- Pro users see current tier, renewal state, and a "Manage Billing" CTA

### 1.2 Upgrade Flow

Free users can upgrade to Pro using Stripe Checkout.

- CTA triggers server-owned checkout session creation
- Browser redirects to Stripe Checkout
- Success URL returns user to app with confirmation state
- Cancel URL returns user to billing settings with no plan change

### 1.3 Billing Management

Pro users can manage billing via Stripe Billing Portal.

- Change card
- Cancel subscription
- Resume if Stripe allows it
- View renewal state

### 1.4 Subscription State Sync

Stripe webhooks are the source of truth for subscription lifecycle events.

- checkout completed
- subscription updated
- subscription cancelled
- invoice payment failed

Webhook handler updates local subscription fields in the `users` table.

### 1.5 Entitlement Source Of Truth

All product quota gates continue to read from one field:

- `users.subscription_tier`

Allowed values for the first implementation:

- `free`
- `pro`

Do not introduce a second entitlement system.

### 1.6 Settings UI Scope

Settings becomes the permanent home for:

- current plan display
- upgrade CTA
- manage billing CTA
- account deletion section

### 1.7 Out Of Scope

- One-time purchases
- Team plans
- Coupons, gift codes, referrals
- Usage-based metering
- Multi-tier catalog beyond Free / Pro
- In-app invoice history UI
- Tax localization beyond Stripe defaults

---

## 2. Architecture Rules

### 2.1 Provider Decision

- Stripe Subscriptions is the approved billing provider
- No custom payment orchestration layer
- No second provider in MVP or post-MVP v1

### 2.2 Server Ownership

- Checkout session creation is server-side only
- Billing portal session creation is server-side only
- Webhook processing is server-side only
- Browser never writes billing state directly

### 2.3 Local User State

The app may read subscription state through one server endpoint, but the database remains canonical.

- Read path: `GET /api/user/subscription`
- Write path: Stripe webhooks + billing APIs only

### 2.4 Failure Model

- If billing APIs fail, user remains on current entitlement
- Never grant Pro access optimistically before webhook-confirmed state lands
- Temporary Stripe outage must not corrupt local subscription state

---

## 3. Data Model

Billing may start with minimal fields on `users`, or use a dedicated migration if they do not yet exist.

Minimum required fields:

- `subscription_tier` (`free` | `pro`)
- `stripe_customer_id`
- `stripe_subscription_id`
- `subscription_status`
- `subscription_renewal_at`

If these columns do not exist in the live schema, the module must create a dedicated billing migration before implementation.

---

## 4. API Surface

### 4.1 `GET /api/user/subscription`

Returns the current entitlement state:

```json
{
  "tier": "free",
  "status": "active",
  "renewalAt": null
}
```

### 4.2 `POST /api/billing/checkout`

Creates a Stripe Checkout session for Free → Pro upgrade.

### 4.3 `POST /api/billing/portal`

Creates a Stripe Billing Portal session for existing Pro users.

### 4.4 `POST /api/stripe/webhook`

Processes Stripe lifecycle events and updates local subscription state.

---

## 5. UI Surface

### 5.1 `pages/settings.tsx`

Settings remains the account hub.

- Account basics
- Membership / billing section
- Account deletion section

### 5.2 Optional `pages/settings/billing.tsx`

If Settings grows too large, a dedicated billing subpage is allowed.

---

## 6. Acceptance Criteria

- [ ] Free user can start Stripe Checkout from Settings
- [ ] Successful Stripe Checkout upgrades local user to `subscription_tier = 'pro'`
- [ ] Pro user can open Stripe Billing Portal from Settings
- [ ] Subscription cancellation or failure updates local user state through webhooks
- [ ] `GET /api/user/subscription` returns current tier and lifecycle status
- [ ] Growth plan and report-analysis modules continue reading the same entitlement source of truth
- [ ] `npx eslint` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes

---

## 7. Forward Placement Decision

This module belongs **after** the current MVP feature sequence:

1. settings
2. growth-plan
3. report-analysis
4. crisis-calm
5. memory-profile-summary
6. membership-billing

Reason:

- MVP can launch as a free product first
- Current free/pro assumptions should not block core feature completion
- Billing should be added only after the free product loop is stable and quota-bearing modules exist in real code
