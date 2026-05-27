# Report Analysis Post-MVP Refresh Review

> Date: 2026-05-27
> Scope: `docs/specs/report-analysis.md`
> Review role: planner self-review plus second-pass tightening
> Result: PASS for planning; implementation remains future post-MVP work

---

## 1. Review Context

This review records the SOP v2.4 refresh of the Report Analysis spec.

The previous spec still contained a historical MVP-style upload, analyze, list, and delete implementation plan. Current roadmap control moved Report Analysis out of MVP and into the first desired P1/post-MVP feature after launch readiness. The refresh therefore needed to:

- Preserve the product judgment that report understanding has real demand.
- Keep it out of MVP launch acceptance.
- Replace the historical implementation-first spec with a risk-bounded post-MVP v1 plan.
- Add external evidence, Search Ledger, ADR-lite, and AQS self-review.
- Avoid copying the mini-program's complex report system into web v1.

---

## 2. Evidence Check

The updated spec includes sources for:

- Parent difficulty with psychological, psychoeducational, and neuropsychological report comprehension.
- Professional feedback/report-review workflows.
- Plain-language parent understanding.
- Generative AI health risks, including hallucination, privacy, brittleness, and output limitations.
- FDA CDS/intended-use risk boundaries.
- FTC Health Breach Notification Rule and HIPAA scope.
- Supabase private storage and signed URL behavior.

Search Ledger rows include supported claims and unsupported gaps. This satisfies the SOP requirement that high-risk P1 decisions not rely on unstated "product principle" reasoning.

---

## 3. AQS Review

### Security

- [PASS] Auth boundary: guest upload is explicitly out of scope.
- [PASS] Authorization boundary: future DB schema requires ownership-scoped RLS plus server-side ownership checks.
- [PASS] Input validation: server-side file size, extension, MIME, and signature validation are required.
- [PASS] Sensitive-data logging: report file names, titles, OCR text, report content, and analysis output are excluded from analytics/logs.
- [PASS] Resource cleanup: failed upload cleanup, report deletion, and account deletion storage cleanup are acceptance items.

### Architecture

- [PASS] Routes remain aligned with `docs/system-architecture.md`: `/reports`, `/reports/upload`, `/reports/[id]`.
- [PASS] App shell remains AppLayout/SmartDrawer.
- [PASS] Growth Plan integration is one-way candidate review, not automatic cross-module writes.
- [PASS] The mini-program blueprint is treated as reference-only; batch/SSE/report-chat/RAG/history comparison are out of v1 scope.

### Engineering Quality

- [PASS] Search Ledger and ADR-lite are embedded in the canonical spec.
- [PASS] Task metadata defines linear implementation, gate mode, machine checks, and human-gate conditions.
- [PASS] Tests are required for high-risk boundaries before human acceptance.
- [PASS] Current repo validation commands match project reality: `npx tsc --noEmit`, `git diff --check`, and `npm run build`.

### Technical Stack

- [PASS] Supabase Storage guidance is linked and applied to private buckets and signed URLs.
- [PASS] Versioned migrations remain required for future schema work.
- [PASS] Provider names are excluded from user-visible copy and public docs.

### Reverse Check

- [PASS] No MVP blocker introduced.
- [PASS] No unnecessary new service or architecture layer proposed.
- [PASS] Old task list is no longer executable as MVP work.
- [PASS] MVD: updating the existing canonical spec is the correct minimum viable documentation path; this review file is justified because planning rules require review records in `docs/reviews/`.

---

## 4. Second-Pass Findings

### Finding 1: Product copy may still imply reports are currently available

Risk: Outside the spec, current app copy may still mention report upload before the feature exists. This does not invalidate the refreshed spec, but before MVP launch the product-copy pass should ensure user-visible surfaces do not promise unavailable report upload.

Suggested follow-up:

- Check `lib/system-prompt-lite.ts` and landing/dashboard copy before launch.
- Keep Reports card disabled/Coming Soon until routes exist.

Priority: P1 launch-copy hygiene.

### Finding 2: Privacy/Terms are not yet report-upload-ready

Risk: Current legal pages cover AI processing generally, but report upload has stronger file-storage and third-party OCR/vision disclosure requirements.

Suggested follow-up:

- Update Privacy Policy and Terms during the actual Report Analysis implementation branch, before exposing upload.
- Do not update them now as if report upload exists in MVP.

Priority: P1 implementation prerequisite.

### Finding 3: Full-text review may be needed for paywalled neuropsychology article

Risk: One source is abstract-level in this pass. It supports the existence of parent-report readability research, but detailed UI choices should not depend on inaccessible full text.

Suggested follow-up:

- Use open-access sources for final UI copy unless the full article is reviewed.

Priority: P2 planning rigor.

---

## 5. Final Status

PASS for planning refresh.

Report Analysis remains:

- Real user need: yes.
- MVP blocker: no.
- Priority: Post-MVP P1.
- Implementation state: not started in current branch.
- Next gate: dedicated implementation preflight after MVP launch readiness, starting from the refreshed spec.
