# Compliance MVP Launch Gate

> Date: 2026-05-08
> Scope: Standardized launch gate for Qimi web compliance work before public release.
> Status: MVP-CONDITIONAL accepted for adult-directed MVP launch.
> Evidence level: EBG-required high-risk gate because the product handles child, family, behavioral, health-adjacent, and AI-memory data.

---

## 1. Gate Purpose

This gate is the minimum compliance closure required before public launch. It is not legal advice and does not replace counsel review. Its purpose is to keep engineering, product copy, and launch decisions tied to current official sources and real repo behavior.

Gate outcomes use only:

- `PASS`: implemented, machine-verified, and human-accepted.
- `BLOCKED`: required for launch and not yet accepted.
- `DEFERRED WITH ADR`: not implemented now, but has a documented reason, scope limit, trigger for revisit, and evidence basis.

Public launch requires zero `BLOCKED` rows for required launch items.

---

## 2. External Search Ledger

| Decision / Claim | Source Type | Source URL | Supported Claim | Unsupported Gap | Status |
|---|---|---|---|---|---|
| COPPA-covered child-directed services generally need verifiable parental consent before collecting personal information from children under 13. | official | https://www.ftc.gov/node/60394 | FTC COPPA FAQ states operators generally must obtain verifiable parental consent before collecting personal information online from children under 13, unless an exception applies. | Does not decide Qimi's exact product scope by itself. | Accepted |
| A COPPA parental-consent method must be reasonably designed to ensure the person giving consent is the child's parent when COPPA verifiable consent is required. | official | https://www.ftc.gov/business-guidance/privacy-security/verifiable-parental-consent-childrens-online-privacy-rule | FTC guidance states the Rule does not mandate one method, but the chosen method must be reasonably designed in light of available technology. | Does not decide whether an adult-directed MVP with no child accounts needs a heavier method. | Accepted |
| Age verification collection may be allowed without prior COPPA consent if used only to determine age and meets FTC conditions. | official | https://www.ftc.gov/news-events/news/press-releases/2026/02/ftc-issues-coppa-policy-statement-incentivize-use-age-verification-technologies-protect-children | FTC 2026 policy statement supports limited age-verification collection for age determination under stated conditions. | Does not approve a full Qimi onboarding or parental-consent flow. | Accepted |
| CCPA/CPRA applicability depends on current thresholds, not a simple MVP user-count assumption. | official | https://cppa.ca.gov/faq | CPPA FAQ lists thresholds: for-profit business doing business in California plus revenue, 100,000 California residents/households, or 50% revenue from selling/sharing personal information. | Does not determine whether Qimi currently "does business in California" or future threshold status. | Accepted |
| HIPAA does not automatically apply to every health-related consumer app. | official | https://www.hhs.gov/hipaa/for-professionals/covered-entities/index.html | HHS states HIPAA applies to covered entities and business associates; entities outside those definitions do not have to comply with HIPAA Rules. | Does not decide future status if Qimi partners with covered entities. | Accepted |
| FTC Health Breach Notification Rule can apply to health apps and similar technologies outside HIPAA. | official | https://www.ftc.gov/legal-library/browse/rules/health-breach-notification-rule | FTC rule summary covers vendors of personal health records, related entities, and service providers for unsecured health-information breaches. | Does not decide whether Qimi is a vendor of personal health records without a product-specific analysis. | Accepted |
| FDA device/software status turns on intended use and software function. | official | https://www.fda.gov/medical-devices/classify-your-medical-device/how-determine-if-your-product-medical-device | FDA says device determination starts with intended use and indications for use; software can be a device when used for medical purposes. | Does not approve Qimi as non-device if future copy or features imply diagnosis, treatment, prevention, or disease mitigation. | Accepted |
| Some wellness/support software functions are not the focus of FDA oversight when low-risk and not making device-level medical claims. | official | https://www.fda.gov/medical-devices/digital-health-center-excellence/device-software-functions-including-mobile-medical-applications | FDA describes a risk-based approach and enforcement discretion for some low-risk self-management/wellness functions. | Does not cover personalized diagnosis/treatment recommendations. | Accepted |
| GDPR can apply to non-EU controllers if offering goods/services to people in the EU or monitoring their behavior there. | official | https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-32018-territorial-scope-gdpr-article-3-version_en | EDPB final territorial-scope guidelines explain Article 3 targeting/monitoring criteria. | Does not determine current Qimi targeting; product policy must avoid EU targeting or add GDPR gate. | Accepted |

---

## 3. Standard Gate Checklist

| Gate | Required Before Public Launch | Current Status | Acceptance Evidence Required |
|---|---:|---|---|
| COPPA / child-data scope decision | Yes | MVP-CONDITIONAL | Qimi is scoped as an adult/parent-directed service, not an app for independent child use. Revisit before child accounts, child-directed marketing, or child-accessible AI features. |
| Adult consent record | Yes | IMPLEMENTED | Signup and OAuth paths store exact consent text, timestamp, method/version, user id, user agent, and IP where available. |
| Privacy Policy | Yes | IMPLEMENTED | `/privacy` accurately describes account data, child/family profile, chat messages, AI-extracted memory, AI vendors, retention, deletion, parent rights, and contact. Final business contact details remain a launch checklist item. |
| Terms of Service | Yes | IMPLEMENTED | `/terms` states service scope, AI limitations, medical disclaimer, adult responsibility, acceptable use, deletion, availability, and general dispute wording. |
| Medical disclaimer and safety positioning | Yes | BLOCKED | AI/product copy avoids diagnosis/treatment claims, includes not-medical-advice disclaimer, and crisis/emergency copy does not overpromise. |
| Account deletion | Yes | PARTIAL | `/settings` and `POST /api/user/delete-account` delete user-owned data through cascade and sign the user out; local Supabase verification recorded. |
| RLS / data isolation | Yes | BLOCKED | Versioned migration removes broad `USING (true)` policies for user-owned tables and uses `auth.uid()` ownership checks where client-side access can occur. |
| FTC Health Breach analysis | Yes | MVP-CONDITIONAL | Current Qimi has health-adjacent family support data but no health-record imports, connected-device imports, provider integrations, or PHR aggregation. Revisit if those features are added or if a security incident occurs. |
| CCPA/CPRA threshold watch | Deferred with ADR | DEFERRED WITH ADR | ADR records current threshold status, revisit triggers, and child-data sale/share prohibition. |
| HIPAA scope | Deferred with ADR | DEFERRED WITH ADR | ADR records current non-covered-entity/non-business-associate assumption and triggers for revisit. |
| FDA/SaMD scope | Deferred with ADR | DEFERRED WITH ADR | ADR ties non-device posture to product positioning and prohibits diagnosis/treatment/prevention claims without review. |
| GDPR scope | Deferred with ADR | DEFERRED WITH ADR | ADR records no EU targeting/monitoring policy or opens GDPR gate before EU launch. |

---

## 4. ADR-Lite Rows

### ADR-COMP-001: Adult-directed child/family information scope

- Status: `MVP-CONDITIONAL`
- Decision: For MVP, Qimi is an adult-directed service for parents, guardians, and adults supporting a family. Children cannot independently create accounts or use Qimi as the intended user.
- Current control: adult user attestation plus stored consent record before account-backed child/family data is stored.
- Required evidence: FTC COPPA FAQ, FTC verifiable parental consent guidance, counsel-reviewed product copy.
- Revisit trigger: before child accounts, child-directed marketing, child-accessible AI features, school/clinic child-user deployment, or collection that materially changes Qimi from adult-directed support into child-directed service.

### ADR-COMP-002: Privacy and AI processor disclosure

- Status: `BLOCKED`
- Decision needed: publish accurate `/privacy` copy for collected data, AI processing, retention, deletion, and parent rights.
- Current risk: footer/auth copy can link to planned routes that are not yet implemented.
- Required evidence: real code data-flow audit plus current third-party provider list.
- Revisit trigger: any new AI vendor, upload pipeline, analytics provider, payment provider, or data retention change.

### ADR-COMP-003: Medical and regulatory positioning

- Status: `BLOCKED`
- Decision needed: keep Qimi positioned as education/support, not diagnosis, treatment, prevention, cure, or substitute clinical judgment.
- Required evidence: FDA intended-use guidance, product copy audit, prompt audit.
- Revisit trigger: any feature that interprets reports diagnostically, creates treatment plans, recommends medication, triages emergencies, or claims clinical outcomes.

### ADR-COMP-004: FTC Health Breach Notification scope

- Status: `MVP-CONDITIONAL`
- Decision: Current MVP is treated as health-adjacent family support outside the core PHR-vendor model because it does not aggregate health records from multiple sources, connect devices, import provider records, or provide a user-managed personal health record.
- Required evidence: FTC Health Breach Notification Rule and actual product integrations/data sources.
- Revisit trigger: adding connected-device imports, health-record imports, provider integrations, or any breach/security incident.

### ADR-COMP-005: CCPA/CPRA threshold watch

- Status: `DEFERRED WITH ADR`
- Decision: Not a launch blocker while Qimi is below statutory thresholds and does not sell/share personal information.
- Required guardrail: do not sell/share children's personal information; revisit before California scale, ad-tech sharing, or threshold approach.
- Revisit trigger: California targeting, paid ads using personal-information sharing, 100,000 California residents/households, qualifying revenue, or 50% revenue from selling/sharing personal information.

### ADR-COMP-006: HIPAA scope

- Status: `DEFERRED WITH ADR`
- Decision: Treat Qimi as a consumer app outside HIPAA unless it becomes a covered entity or business associate.
- Required guardrail: do not claim HIPAA compliance unless a full HIPAA assessment is completed.
- Revisit trigger: partnership with providers, clinics, health plans, schools acting under health-provider arrangements, or business associate agreements.

### ADR-COMP-007: GDPR scope

- Status: `DEFERRED WITH ADR`
- Decision: Not a launch blocker if Qimi does not target EU users or monitor behavior of people in the EU.
- Required guardrail: no EU-targeted marketing/localization/paid acquisition until GDPR gate is opened.
- Revisit trigger: EU launch, EU pricing, EU localized pages, EU ads, or material EU user base.

---

## 5. Implementation Acceptance Plan

Execution must follow `docs/project-control.md`:

1. Technical acceptance
2. Functional acceptance plan
3. Human acceptance
4. Merge or carry-forward decision

Technical acceptance:

- `npm run supabase:reset` applies compliance/RLS migrations locally.
- `npx tsc --noEmit` passes.
- `npm run build` passes.
- `/privacy`, `/terms`, and `/consent` route checks pass.
- Consent APIs return expected responses for authenticated and unauthenticated requests.
- Account deletion cascade is verified in local Supabase.

Functional acceptance plan:

- Email signup cannot complete without the consent control.
- OAuth/new authenticated user without consent is routed to `/consent`.
- Consent record is stored exactly once per user.
- User can access `/privacy` and `/terms` from public and auth flows.
- AI chat copy keeps support positioning and disclaimer behavior.
- Account deletion removes account-owned data and signs the user out.
- RLS audit confirms no broad user-owned `USING (true)` policies remain in active migrations.

Human acceptance:

- User manually verifies signup/consent, policy pages, settings deletion UX, and normal app access after consent.
- 2026-05-09: User confirmed functional testing passed with no current blockers. Documentation cleanup is intentionally deferred to prioritize MVP launch.

Merge/carry-forward:

- Any remaining `BLOCKED` required-launch row blocks public launch.
- `DEFERRED WITH ADR` rows must include a clear revisit trigger before merge.

---

## 6. Current Conclusion

The existing compliance spec had the correct COPPA direction, but it was not a complete launch gate. The standardized gate above should now be treated as the evidence-backed checklist for Compliance MVP closure.

The highest-risk boundary is preserving Qimi as an adult-directed support product. If Qimi adds child accounts, child-directed marketing, child-accessible AI features, connected-device imports, health-record imports, or provider integrations, this MVP gate no longer applies without a fresh compliance review.

---

## 7. Technical Implementation Note

Implementation pass completed on 2026-05-08 in the working tree, with human acceptance recorded on 2026-05-09, pending commit:

- Added `/privacy`, `/terms`, and `/consent`.
- Added `POST /api/compliance/consent` and `GET /api/compliance/consent-status`.
- Added `parental_consents` migration with consent text, method, version, timestamp, IP, and user agent fields.
- Added active RLS policy replacement for users, conversations, messages, child_profiles, profile_summaries, memory_items, and parental_consents.
- Added signup consent control and logged-in app consent gate.
- Removed user-facing/system TCM prompt and module injection paths.

Technical checks completed:

- `npx tsc --noEmit`: pass.
- `npm run build`: pass.
- `npm run supabase:reset`: pass.
- Local RLS audit: no active `pg_policies` rows with broad `true` qual/with_check after migrations apply.
- HTTP route smoke test: `/privacy`, `/terms`, `/consent` return 200.
- Consent API smoke test: unauthenticated `consent-status` returns 401; authenticated test user transitions from `hasConsent:false` to `hasConsent:true` after POST; database row includes method/version/text/timestamp.

Gate status is `MVP-CONDITIONAL` for a parent/adult-directed launch. Remaining practical launch guardrails are final business contact details when available, continued no-sale/no-share posture, no child accounts, and no health-record/device/provider integrations.
