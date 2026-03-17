# Formal Basis Entry — Qimi Web

> Created: 2026-03-14
> Purpose: Define the single formal entry point for planning, review, and implementation so legacy material does not pollute current decisions.

---

## 1. Canonical Entry

All future planning, review, and implementation work must start from these documents, in this order:

1. `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/formal-basis-entry.md`
2. `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/planning-review-rules.md`
3. `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/project-control.md`
4. `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/system-architecture.md`
5. The relevant canonical spec under `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/specs/`
6. The matching review record under `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/reviews/`

This file is the project-level formal-basis entry required by the SOP.

---

## 2. Current Canonical Documents

### Architecture

- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/system-architecture.md`

### Project Control

- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/project-control.md`

### Specs

- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/specs/dashboard.md` (added 2026-03-16)
- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/specs/family-profile.md` (added 2026-03-16, replaces user-profile.md)
- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/specs/followup-reminder.md`
- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/specs/growth-plan.md`
- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/specs/report-analysis.md`
- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/specs/crisis-calm.md`
- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/specs/memory-profile-summary.md`
- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/specs/compliance.md` (added 2026-03-17, MVP launch gate)
- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/specs/membership-billing.md` (added 2026-03-17, post-MVP monetization module)
- ~~`/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/specs/user-profile.md`~~ — SUPERSEDED by family-profile.md (2026-03-16)

### Planning Rules

- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/planning-review-rules.md`

---

## 3. Reference-Only Materials

These may inform planning, but they are not equal to the canonical web docs above:

- `/Users/jamesguu/WeChatProjects/adhdhelper-cursor/docs/项目技术蓝图.md`
- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/Web INJECTION_SYSTEM_ARCHITECTURE.md`
- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/technical-decisions-for-review.md`
- older handoff docs, sprint notes, temporary review notes, and historical planning drafts

Rules:

- Do not inherit an older design wholesale
- Do not let a historical document override current code or canonical web docs
- If a reference-only document contains something useful, copy the decision into a canonical doc explicitly before treating it as current policy

---

## 4. Start Rule

Before any new planning pass, review pass, or implementation pass:

1. Read this file
2. Read `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/planning-review-rules.md`
3. Read `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/project-control.md`
4. Read the relevant canonical spec

No agent should start from a historical handoff doc by default.
