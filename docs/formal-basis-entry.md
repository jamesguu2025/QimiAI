# Formal Basis Entry — Qimi Web

> Created: 2026-03-14 | Amended: 2026-05-06 (SOP v2.4 evidence discipline)
> Purpose: Define the single formal entry point for planning, review, and implementation so legacy material does not pollute current decisions.

---

## 1. Canonical Entry

All future planning, review, and implementation work must start from these documents, in this order:

1. `/Users/jamesguu/Library/CloudStorage/OneDrive-个人/work/Million Dollar Business/agent-dev-sop/01-总流程.md`
2. `/Users/jamesguu/Library/CloudStorage/OneDrive-个人/work/Million Dollar Business/agent-dev-sop/02-规划者手册.md`
3. `/Users/jamesguu/Library/CloudStorage/OneDrive-个人/work/Million Dollar Business/agent-dev-sop/07-架构质量标准(AQS).md`
4. `/Users/jamesguu/Library/CloudStorage/OneDrive-个人/work/Million Dollar Business/agent-dev-sop/08-设计阶段循证Gate(EBG).md`
5. `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/formal-basis-entry.md`
6. `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/planning-review-rules.md`
7. `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/project-control.md`
8. `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/system-architecture.md`
9. The relevant canonical spec under `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/specs/`
10. The matching review record under `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/reviews/`

This file is the project-level formal-basis entry required by the SOP.

SOP interpretation rule:

- The `agent-dev-sop/` directory is the method authority.
- The Qimi `docs/` directory is the project authority.
- If this project entry and the SOP disagree about process, follow the latest SOP and update this entry.

---

## 2. Current Canonical Documents

### Architecture

- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/system-architecture.md`

### Project Control

- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/project-control.md`

### Specs

- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/specs/dashboard.md` (added 2026-03-16)
- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/specs/family-profile.md` (added 2026-03-16, replaces user-profile.md)
- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/specs/settings.md` (added 2026-03-17, account settings MVP)
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

### Current SOP Review Records

- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/reviews/sop-planning-refresh-2026-05-06.md`

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

1. Read the latest `agent-dev-sop` entry and role-specific planning/review rules
2. Read this file
3. Read `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/planning-review-rules.md`
4. Read `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/project-control.md`
5. Read the relevant canonical spec

Reading strategy:

- New phase or gate request: full hydration of the SOP entry, planning rules, project control, architecture, target spec, and matching review record.
- Same-phase ordinary subtask: minimum necessary hydration only; read the target spec, current gate policy, current review record, and directly affected code.
- Rehydrate fully when a task is blocked, a formal basis conflict appears, ROQ changes, or a human gate is requested.

No agent should start from a historical handoff doc by default.
