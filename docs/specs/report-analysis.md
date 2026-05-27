# Module Spec: Report Analysis

> Status: PLANNED — Post-MVP P1, refreshed 2026-05-27
> Module: report-analysis
> Routes: `/reports`, `/reports/upload`, `/reports/[id]`
> Implementation status: Planned; not part of MVP launch acceptance
> Branch: future dedicated `feature/report-analysis` or `codex/report-analysis-*`
> SOP v2.4 status: Refreshed with external evidence, Search Ledger, ADR-lite, and AQS self-review. Do not implement from any older historical task list.

---

## 0. Planning Baseline

### Current Repo Reality

- `docs/project-control.md` marks Report Analysis as `Planned` and outside the current MVP acceptance baseline.
- `docs/project-control.md` places `report-analysis` after MVP launch readiness as the first P1/post-MVP feature.
- `docs/system-architecture.md` reserves `/reports`, `/reports/upload`, and `/reports/[id]` for this module, all under the logged-in SmartDrawer/AppLayout shell.
- The current branch has no `pages/reports/*`, no `pages/api/reports/*`, no `components/Reports/*`, and no versioned report-analysis migration.
- The cross-platform mini-program blueprint remains reference-only. Its multi-page grouping, SSE, report chat, RAG, historical comparison, Redis batch state, and membership quota system must not be copied into the first web version.

### Product Decision

Report Analysis has a real user need, but it does not block MVP launch.

Qimi should build it as **post-MVP P1** after launch readiness and after a dedicated implementation branch is opened. The first version is a parent-facing explanation assistant for already-existing professional reports. It is not a diagnostic, treatment, medication, school-placement, or clinical decision tool.

### Key Distinctions

1. **Professionals often explain reports.**
   Clinical and school workflows commonly include feedback sessions or IEP/evaluation meetings where results are reviewed with the family.
2. **Parents may still need a plain-language summary afterward.**
   Evidence shows report language, structure, length, and jargon can still reduce comprehension and advocacy even when reports are formally provided.
3. **Qimi should not build this now.**
   Report upload introduces sensitive document storage, third-party AI processing, OCR/vision error risk, deletion obligations, and stronger legal copy requirements. Those are not needed to validate the MVP's main chat, Memory, Family Profile, Growth Plan, onboarding, analytics, and compliance loop.

---

## 1. Evidence And Search Ledger

Accessed: 2026-05-27.

| ID | Query | Source | Result | Supported claim | Unsupported gap |
|----|-------|--------|--------|-----------------|-----------------|
| SL-1 | `parents difficulty understanding psychoeducational evaluation report plain language study` | Springer Nature, "Parent experiences with children's psychological evaluation reports" — https://link.springer.com/article/10.1186/s12982-026-01613-x | Found | Parents can struggle with traditional psychological/psychoeducational report language and structure; accessible plain-language reports can improve comprehension and engagement. | Does not prove Qimi specifically will convert users or that AI is the right delivery mechanism. |
| SL-2 | `pediatric neuropsychological evaluation reports parent comprehension readability study` | The Clinical Neuropsychologist, "Impact of text difficulty and visual emphasis on pediatric neuropsychological evaluation reports" — https://www.tandfonline.com/doi/abs/10.1080/13854046.2024.2366018 | Found(partial) | Parent-facing neuropsychological reports are an active readability/comprehension research topic; text difficulty and visual emphasis affect perceived readability and utility. | Abstract-level access only in this pass; implementation still needs full-text review if used for detailed UI copy decisions. |
| SL-3 | `plain language parents understanding health recommendations trial` | Journal of Clinical Epidemiology, plain-language parent trial — https://www.sciencedirect.com/science/article/pii/S0895435623001658 | Found(partial) | Plain-language child-health recommendations improved parent understanding and preference compared with standard wording. | It concerns health recommendations, not assessment reports, so it supports plain-language direction by analogy only. |
| SL-4 | `neuropsychological assessment feedback practices survey` | PMC, "A Survey of Neuropsychological Assessment Feedback Practices Among Neuropsychologists" — https://pmc.ncbi.nlm.nih.gov/articles/PMC10784416/ | Found | Neuropsychologists commonly provide verbal feedback and may walk patients through reports or written summaries. | Does not show every family receives enough explanation or retains the information after the session. |
| SL-5 | `autism assessment feedback session guideline recommendations family report` | PMC, "The Feedback Session of an Autism Assessment" — https://pmc.ncbi.nlm.nih.gov/articles/PMC8148412/ | Found | Assessment guidelines frequently recommend family feedback and report sharing. | Autism assessment guidance is adjacent to ADHD/neurodevelopmental reports, not identical to psychoeducational reports. |
| SL-6 | `IEP evaluation results parents meeting review information after evaluation` | NYC Public Schools IEP Meeting — https://www.schools.nyc.gov/learning/special-education/the-iep-process/iep-meeting | Found | School workflows include a post-evaluation IEP meeting where the team reviews evaluation information with parents. | Local policy example; not all North American jurisdictions follow the same details. |
| SL-7 | `IEP reports parents meaningful participation understandable progress reports` | Arizona Department of Education progress report FAQ — https://www.azed.gov/node/10288 | Found | Education agencies emphasize that parents need sufficient, meaningful information to participate in IEP decisions. | Progress reports are not the same as full psychoeducational assessment reports. |
| SL-8 | `generative AI health risks hallucination privacy security` | NCBI Bookshelf, "Risks of Generative Artificial Intelligence in Health and Medicine" — https://www.ncbi.nlm.nih.gov/books/NBK615587/ | Found | GenAI health risks include privacy/security, bias, output limitations, brittleness, and hallucinations. | Does not evaluate Qimi's future implementation specifically. |
| SL-9 | `FDA clinical decision support software FAQ medical device` | FDA CDS FAQ — https://www.fda.gov/medical-devices/software-medical-device-samd/clinical-decision-support-software-frequently-asked-questions-faqs | Found | Some CDS software remains a medical device and under FDA oversight depending on function and criteria. | Does not classify Qimi; classification depends on future intended use and claims. |
| SL-10 | `FDA software interpret clinical implications medical image signal pattern` | FDA Digital Health Policy Tool step 6 — https://www.fda.gov/medical-devices/digital-health-center-excellence/step-6-software-function-intended-provide-clinical-decision-support | Found | Software that assesses or interprets clinical implications/relevance of medical signals, patterns, or medical images can fall outside non-device CDS criteria. | Psychoeducational reports may be educational/psychological documents rather than medical images, but clinical interpretation claims still raise intended-use risk. |
| SL-11 | `FTC Health Breach Notification Rule health apps similar technologies` | FTC HBNR basics — https://www.ftc.gov/business-guidance/resources/health-breach-notification-rule-basics-business | Found | The FTC rule can apply to health apps and similar technologies handling identifying health information outside HIPAA. | Whether Qimi is covered requires product-specific legal review. |
| SL-12 | `HHS HIPAA covered entity business associate health app` | HHS Covered Entities and Business Associates — https://www.hhs.gov/hipaa/for-professionals/covered-entities/index.html | Found | HIPAA applies to covered entities and business associates; entities outside those definitions do not comply with HIPAA Rules by default. | Does not remove FTC, state privacy, contract, or platform obligations. |
| SL-13 | `Supabase Storage private bucket signed URL sensitive documents` | Supabase Storage buckets — https://supabase.com/docs/guides/storage/buckets/fundamentals | Found | Private buckets use RLS-controlled access; private downloads use authenticated download or time-limited signed URLs; sensitive documents are an example use case. | Does not design Qimi's RLS policies or deletion workflow. |
| SL-14 | `Supabase Storage private buckets not accessible public URL signed URLs` | Supabase serving assets docs — https://supabase.com/docs/guides/storage/serving/downloads | Found | Non-public bucket assets are private and not accessible through public URLs; signed URLs are time-limited but remain valid until expiry. | Does not define the exact signed URL TTL Qimi should use. |

### Evidence Layering

| Claim | Source axis | Maturity | Basis |
|-------|-------------|----------|-------|
| Parents can need clearer explanations of psychological, psychoeducational, or neuropsychological reports. | External research supported | Stable | SL-1, SL-2, SL-3 |
| Professional/school workflows often include feedback sessions or meetings where reports are explained. | External research/official workflow supported | Stable | SL-4, SL-5, SL-6 |
| Qimi should help with plain-language understanding, not diagnosis or treatment. | External risk supported + internal product choice | Stable for post-MVP v1 | SL-8, SL-9, SL-10 plus compliance posture |
| Report Analysis should be Post-MVP P1, not MVP. | Internal product sequencing choice | Stable for current roadmap | `docs/project-control.md` and current module status |
| First web version should avoid mini-program multi-page/SSE/RAG/report-chat complexity. | Internal MVP scope choice | Stable for first post-MVP version | Cross-platform blueprint is reference-only; AQS anti-overengineering |
| Private Supabase Storage with signed URLs is the correct storage boundary if uploads are built. | Official vendor supported | Stable | SL-13, SL-14 |

---

## 2. ADR-Lite

| Decision ID | Decision | Risk | External evidence | Local evidence | Supported claim | Unsupported gap | Status | Confirmation |
|-------------|----------|------|-------------------|----------------|-----------------|-----------------|--------|--------------|
| ADR-RA-1 | Keep Report Analysis out of MVP and mark it Post-MVP P1. | Normal | SL-1 to SL-3 support real need; SL-8 to SL-12 support added risk. | `docs/project-control.md` places Report Analysis after launch readiness. | Demand exists, but risk and effort justify post-MVP sequencing. | No Qimi production demand data yet. | Accepted | Revisit after MVP launch readiness closes. |
| ADR-RA-2 | Scope first version as plain-language report understanding, not diagnosis/treatment. | High | SL-8 to SL-10. | Compliance spec already positions Qimi as education/support, not medical advice. | Health AI hallucination and FDA intended-use risk require strict output boundaries. | Does not guarantee non-device posture; counsel/product-copy review still needed before launch. | Accepted | Prompt regression tests must reject diagnostic/treatment/medication outputs. |
| ADR-RA-3 | Store uploads only in private Supabase Storage with DB-owned `storage_path` and short-lived signed URLs. | High | SL-13, SL-14. | Current architecture uses Supabase as primary DB/storage platform. | Private buckets and signed URLs fit sensitive uploaded documents. | Exact bucket policy and TTL need implementation review. | Accepted | Local Supabase migration and ownership/delete tests required. |
| ADR-RA-4 | Connect report findings to Growth Plan only through parent-reviewed candidate items. | Normal | SL-7 supports parent meaningful participation; SL-8 supports avoiding unreviewed AI action. | Growth Plan exists as the current accepted action loop. | AI-generated support ideas should be reviewed before becoming plan items. | No current report-to-plan schema exists. | Accepted | Integration tests must prove no automatic plan write. |
| ADR-RA-5 | Do not copy mini-program report architecture into web v1. | Normal | AQS anti-overengineering; no external source needed for internal scope. | Cross-platform blueprint is reference-only under `docs/formal-basis-entry.md`. | Web v1 should avoid multi-page batch, SSE, RAG, report-chat, and historical comparison complexity. | Later usage may justify expanding scope. | Accepted | Keep v1 tasks linear and single-file upload only. |

---

## 3. Product Scope

### 3.1 In Scope For Post-MVP P1 v1

The first implementation should support a single uploaded report and produce a parent-facing explanation with:

1. **Plain-language summary**
   - What this document appears to be.
   - The main findings or sections in parent-friendly language.
   - A clear uncertainty note when OCR/model confidence is limited.
2. **Key points explained**
   - Explain important terms, scores, headings, and recommendations already present in the report.
   - Avoid inventing missing values or inferring hidden clinical meaning.
3. **Questions to ask**
   - Questions for the doctor, psychologist, evaluator, therapist, or school team.
   - Questions should help parents prepare for a meeting, not replace the meeting.
4. **Growth Plan candidates**
   - Optional candidate support ideas derived from report recommendations.
   - Must be shown as drafts requiring parent review, editing, and confirmation before becoming Growth Plan items.

### 3.2 Explicitly Out Of Scope

- No diagnosis, rediagnosis, severity classification, or "your child has/does not have ADHD" language.
- No medication, dosage, supplement, treatment, crisis, legal, IEP eligibility, placement, or service entitlement advice.
- No interpretation of medical images, lab values, EEG, genetic tests, or other clinical measurements as abnormal/normal beyond what the uploaded report itself explicitly states.
- No replacing feedback from doctors, psychologists, school evaluators, or qualified clinicians.
- No report sharing, public links, export, provider portal, school portal, or collaboration workflow.
- No multi-page batch analysis, page grouping, SSE progress stream, report-chat, RAG citation layer, historical comparison, or membership quota system in v1.
- No guest upload.

### 3.3 Product Copy Rules

User-visible copy must say:

- Qimi helps parents understand and organize an existing report.
- Qimi may be wrong or incomplete.
- Parents should confirm results and next steps with the professional or school team that issued or reviewed the report.

User-visible copy must not say:

- Qimi diagnoses, detects, screens, treats, triages, or assesses ADHD or any condition.
- Qimi can find abnormalities, determine eligibility, or recommend treatment.
- Qimi replaces a clinician, psychologist, therapist, evaluator, school team, or legal advocate.
- A specific AI vendor/model name.

---

## 4. User Experience

### 4.1 Routes

| Route | Purpose | MVP status |
|-------|---------|------------|
| `/reports` | Report history and upload entry | Planned Post-MVP P1 |
| `/reports/upload` | Single-report upload and consent/disclaimer flow | Planned Post-MVP P1 |
| `/reports/[id]` | Parent-facing explanation result | Planned Post-MVP P1 |

All routes require authentication and use the existing AppLayout/SmartDrawer pattern.

### 4.2 Upload Flow

1. User opens `/reports/upload`.
2. Page displays sensitive-upload notice, authorization confirmation, and disclaimer.
3. User uploads one supported file.
4. Server validates auth, size, extension, MIME, and file signature before storage.
5. Server stores the file in private storage and inserts a report record.
6. Analysis runs through a controlled server route with timeout, retry cap, and safe failure state.
7. Result page displays summary, key points, questions, uncertainty, and optional Growth Plan candidates.

### 4.3 Result Sections

Result page sections:

- Report overview
- Key points in plain language
- Terms and scores explained
- Questions for doctor/evaluator/school
- Possible Growth Plan candidates
- Uncertainties and what Qimi could not verify
- Disclaimer

### 4.4 Empty And Failure States

- Empty history: "No reports yet. Uploading reports will be available after this feature is launched."
- Upload validation failure: generic user-safe messages; do not echo internal MIME/parser/provider errors.
- Analysis failure: "Qimi could not summarize this report. Please try again later or discuss the report directly with the professional who issued it."
- Low confidence: show uncertainty before any suggested candidate items.

---

## 5. Growth Plan Connection

Report Analysis may produce `candidate_plan_items`, but it must not directly create Growth Plan records.

Suggested contract:

```ts
type ReportPlanCandidate = {
  id: string;
  reportId: string;
  sourceExcerpt?: string;
  plainLanguageReason: string;
  suggestedSupportArea: 'school' | 'home' | 'routine' | 'emotion' | 'attention' | 'sensory' | 'sleep' | 'other';
  questionForProfessional?: string;
  draftAction: string;
  safetyFlags: Array<'medical' | 'diagnosis' | 'medication' | 'school_eligibility' | 'legal' | 'crisis' | 'none'>;
  requiresParentReview: true;
};
```

Rules:

- Parent must click "Review for Growth Plan" before any candidate enters the Growth Plan save flow.
- The Growth Plan save endpoint must apply the same safety filters used for chat-saved plans.
- Items with `medical`, `diagnosis`, `medication`, `school_eligibility`, `legal`, or `crisis` flags must be blocked from direct save and converted into "question to ask a professional" text instead.
- Stored Growth Plan items should reference `source_report_id` only if the final schema includes a report relation; do not duplicate OCR text or full report excerpts into Growth Plan rows.

---

## 6. Data, Upload, Privacy, And Compliance

### 6.1 Data Classification

Report files, extracted text, summaries, and candidate items are sensitive child/family records. They may include health, education, disability, school, medication, or evaluation information.

### 6.2 Upload Requirements

- Authenticated users only.
- One file per report in v1.
- Server-side size limit.
- Explicit extension allowlist.
- MIME check plus file signature sniffing.
- Reject archives, scripts, executables, ambiguous content, and files with mismatched type/signature.
- Do not log file names, report titles, OCR text, extracted findings, or model output.
- Do not include report data in analytics event properties.

Initial file support should be decided in implementation planning. Conservative default:

- v1a: JPG/PNG only.
- PDF only after text extraction, page limits, malware scanning approach, and deletion behavior are reviewed.

### 6.3 Storage Requirements

- Use a private Supabase Storage bucket.
- Store `storage_path`, not public URLs.
- Generate signed URLs only after server-side ownership checks.
- Keep signed URL TTL short and never persist signed URLs in the database.
- Delete storage objects when deleting a report or account.
- Use versioned migrations under `supabase/migrations/`; no standalone SQL snippets as deployment source of truth.

### 6.4 Database Shape

Final schema must be designed during implementation. Minimum conceptual entities:

- `reports`
  - owner, title, storage path, mime type, size, status, created/updated timestamps
- `report_analysis_outputs`
  - report owner, summary JSON, uncertainty JSON, model/provider metadata safe for internal debugging, status/error code
- `report_plan_candidates`
  - report owner, candidate fields, safety flags, parent-review state

RLS policies must enforce ownership with `auth.uid() = user_id` or equivalent ownership joins. Server routes may use admin access only after session ownership checks.

### 6.5 Privacy And Legal Copy Requirements

Before launch, Privacy Policy and Terms must explicitly cover:

- Report upload and storage.
- Third-party AI/OCR/vision processing in generic provider-neutral terms.
- The fact that Qimi deletes data from Qimi-controlled systems on account/report deletion, but cannot guarantee deletion of data already processed by third-party AI providers except as available under provider terms and law.
- User responsibility to upload only documents they are authorized to share.
- Qimi's education/support positioning and non-diagnosis/non-treatment boundary.
- FTC Health Breach Notification Rule revisit trigger for report uploads and any security incident involving report data.
- HIPAA revisit trigger before provider, clinic, school-district, EHR, or covered-entity partnerships.
- COPPA/adult-directed scope revisit before child accounts or child-directed report workflows.

---

## 7. AI Output Contract

### 7.1 Allowed Output

- "This report appears to describe..."
- "The report states..."
- "This term usually means..."
- "You may want to ask the evaluator..."
- "A possible family support idea to discuss is..."
- "Qimi could not verify..."

### 7.2 Prohibited Output

- "Your child has ADHD/autism/anxiety/dyslexia..."
- "This score means your child is severe/mild/normal/abnormal" unless the uploaded report itself explicitly says so, and then only as "the report labels this..."
- "Start/stop/change medication..."
- "The school must provide..."
- "You should pursue legal action..."
- "This report proves..."
- "No need to talk to a doctor/school/evaluator..."

### 7.3 Required Disclaimer

Every completed analysis must include:

> Qimi AI is not a doctor, psychologist, school evaluator, or legal advisor. This explanation may be incomplete or wrong and is not a substitute for professional medical, psychological, educational, or legal advice. Please discuss the report with the professional or school team that issued or reviewed it.

---

## 8. Acceptance Criteria

- [ ] Report Analysis remains outside MVP launch acceptance and is marked Post-MVP P1.
- [ ] Authenticated user can upload one supported report file after explicit authorization/disclaimer acknowledgment.
- [ ] Guest users cannot upload or view reports.
- [ ] Upload API validates auth, size, extension, MIME type, and file signature server-side.
- [ ] Files are stored in private Supabase Storage; DB stores `storage_path`, not public URLs.
- [ ] Signed URLs are generated only after ownership checks and are not stored.
- [ ] Report list shows only the current user's reports.
- [ ] Result page shows summary, key points, questions, uncertainty, disclaimer, and optional Growth Plan candidates.
- [ ] AI output never diagnoses, prescribes, changes medication, determines eligibility, gives legal advice, or replaces professionals.
- [ ] Growth Plan candidates require parent review and do not auto-create plan items.
- [ ] Deleting a report removes analysis rows, candidate rows, and the storage object.
- [ ] Account deletion removes report records and storage objects or has an explicit verified cleanup job.
- [ ] Privacy Policy and Terms are updated before feature launch.
- [ ] Analytics/logs do not include report text, file names, titles, OCR text, or analysis content.
- [ ] Local Supabase reset passes with versioned migrations.
- [ ] `npx tsc --noEmit`, `git diff --check`, and `npm run build` pass before human acceptance.

---

## 9. Execution Task List

### Task Execution Metadata

- Implementation mode: `linear`
- Acceptance mode: `single-item gate` for schema/storage/API safety tasks; `batch gate` only for pure UI components after API contracts are frozen
- Machine gate:
  - `npx tsc --noEmit`
  - `git diff --check`
  - `npm run build`
  - local Supabase reset for schema/storage tasks
  - local smoke test for upload, analyze, view, candidate review, delete
- Human gate: allowed only after machine gates pass and P0/P1 review findings are zero

### P1-RA-001: Final implementation preflight

- Update Search Ledger if sources or laws changed.
- Confirm Privacy/Terms text for report uploads.
- Decide v1 file types and limits.
- Confirm no current MVP route or prompt claims reports are already available.

### P1-RA-002: Schema and storage migration

- Add versioned migration for report records, analysis outputs, and candidate items.
- Add RLS ownership policies.
- Create private storage bucket configuration or documented setup.
- Add account deletion cleanup path for report storage.

### P1-RA-003: Upload API

- Implement authenticated upload endpoint.
- Validate size, extension, MIME, and signature.
- Store file privately.
- Insert report record.
- Clean up storage object if DB insert fails.

### P1-RA-004: Analysis API

- Implement controlled analysis route.
- Use provider-neutral environment variable names.
- Add timeout, retry cap, safe error mapping, and no-sensitive-log handling.
- Return structured JSON with summary, key points, questions, uncertainty, and candidates.

### P1-RA-005: Report pages

- Implement `/reports`, `/reports/upload`, and `/reports/[id]` using AppLayout.
- Include authorization confirmation, disclaimer, failure states, and accessible controls.
- Keep Dashboard Reports card disabled until these routes exist.

### P1-RA-006: Growth Plan candidate review

- Add candidate review UI.
- Reuse Growth Plan safety filters.
- Save only parent-confirmed safe items.
- Convert blocked candidates to questions for professionals.

### P1-RA-007: Tests and acceptance

- Add tests for ownership, validation, deletion cleanup, prohibited-output guardrails, and no automatic Growth Plan writes.
- Run local Supabase reset and smoke tests.
- Prepare technical and functional acceptance plan before human acceptance.

---

## 10. AQS Self-Review

### Security

- [PASS] Authentication: report routes require login; guest upload is out of scope.
- [PASS] Authorization: future schema requires owner-scoped RLS and server-side ownership checks.
- [PASS] Input validation: upload validation chain is explicitly required.
- [PASS] Sensitive data: report text/file names/OCR/model output are excluded from logs and analytics.
- [PASS] Resource cleanup: report deletion and failed-upload cleanup are required acceptance items.

### Architecture

- [PASS] Routes align with system architecture.
- [PASS] AppLayout/SmartDrawer remains the shell.
- [PASS] Web v1 avoids mini-program multi-page/SSE/report-chat complexity.
- [PASS] Growth Plan connection is review-based and does not cross-write automatically.

### Engineering Quality

- [PASS] Evidence is recorded with Search Ledger and ADR-lite.
- [PASS] Task metadata defines implementation and gate mode.
- [PASS] Machine gates are aligned with current repo scripts.
- [PASS] High-risk areas require tests before human gate.

### Technical Stack

- [PASS] Supabase private storage and signed URL usage is grounded in official docs.
- [PASS] Versioned migrations remain the schema source of truth.
- [PASS] Provider-neutral public copy and env direction is recorded.

### Reverse Check

- [PASS] MVP boundary: not a launch blocker.
- [PASS] Anti-overengineering: v1 is single-report understanding only.
- [PASS] MVD: this refresh updates the existing canonical spec; the new review record is justified because planning rules require review output under `docs/reviews/`.
- [PASS] No implementation is implied by this planning refresh.

Status: PASS for planning. Implementation remains blocked until a dedicated post-MVP branch starts from this refreshed spec.
