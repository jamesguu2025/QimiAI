# Planning And Review Rules — Qimi Web

> Created: 2026-03-14
> Purpose: Freeze the user's planning and documentation requirements so they remain stable across the full planning pass.

---

## 1. Working Order

For each document:

0. Read this file first. This is a mandatory pre-check, not optional guidance.
1. Read current code, deployment shape, and relevant existing docs first
2. Check mature industry practice before changing the document
3. Update the document
4. Self-review the document
5. Do a second-pass review and optimization
6. Add or update the matching review record
7. Then move on automatically to the next document

Do not stop between documents unless:

- the document conflicts with real implementation in a way that changes product direction
- there are two materially different architecture choices and one must be chosen
- the current code is ambiguous enough that continuing would likely lock in the wrong plan

### Mandatory Pre-Check Rule

Before starting any new architecture document, spec, review note, or planning update, this file must be read first:

- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/formal-basis-entry.md`
- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/planning-review-rules.md`
- `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/project-control.md`

Treat this as a required checklist gate. No new documentation pass should begin without checking it.

---

## 2. Source Priority

When planning or reviewing, use this priority order:

1. Real code and real deployed architecture in this repo
2. `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/formal-basis-entry.md`
3. `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/project-control.md`
4. The canonical web planning docs in `docs/`
5. The cross-platform blueprint in `/Users/jamesguu/WeChatProjects/adhdhelper-cursor/docs/项目技术蓝图.md`
6. Official vendor docs and well-established industry practice
7. Older handoff or temporary docs

If a document disagrees with the real repo, the document must be corrected or explicitly marked as planned rather than implemented.

### Formal Basis Rule

- The project-level formal basis entry is `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/formal-basis-entry.md`
- Legacy, historical, and reference-only materials must not be treated as equal to canonical specs
- If a historical insight needs to survive, it must be copied into a canonical doc first

### Evidence Layering Rule

When a planning doc makes a strong product, method, or domain claim, it must be categorized as one of:

- external research supported
- internal design choice
- `Provisional`

Do not present an internal design choice as if it were an industry-wide standard.
Do not present an unvalidated parameter or threshold as final truth.

### Task Metadata Rule

Every formal module task list must explicitly define:

- implementation mode: `linear` or `controlled parallel`
- acceptance mode: `single-item gate` or `batch gate`
- machine gate: required checks, smoke test, contract consistency check
- whether the task group can proceed to a human gate

If all tasks in one module share the same mode and gate, the module spec may define these once above the task list instead of repeating them per task.

---

## 3. Core Requirements To Preserve

### 3.1 Reality First

- Already implemented pages, APIs, migrations, and deployment mechanisms must be marked as implemented in docs
- Planned but not implemented modules must remain marked as planned
- Archived or cancelled modules must be marked clearly

### 3.2 Mature Practice Only

- Prefer official, common, mature solutions
- Do not invent novel architecture where the stack already has a standard pattern
- Do not over-engineer for scale that the first 5,000 users do not need

### 3.3 Conflict Handling

If document and implementation differ:

- identify the difference clearly
- decide which approach is more mature and more suitable for this project
- if the choice is obvious, update the doc and keep going
- if the choice changes product or architecture direction, stop and discuss before continuing

### 3.4 Review Discipline

Every document pass must include:

- first review: self-review
- second review: another pass to tighten scope, remove drift, and improve alignment
- review output stored in `docs/reviews/`

### 3.5 Follow-Up Specific Rule

- Keep the current code route for follow-up reminders
- Mailchimp remains the current sending/automation provider because it is the fastest path to launch
- Mailchimp is treated as a replaceable delivery layer, not the architectural center of the follow-up system

---

## 4. Practical Documentation Rules

- Use canonical docs for stable architecture and specs
- Use review docs for AQS findings and correction history
- Keep implementation status explicit: `Implemented`, `Planned`, or `Archived`
- Keep validation commands aligned with the real repo scripts and tools
- Keep schema aligned with shared type contracts unless a type is explicitly revised
- Keep evidence layering explicit where a claim might otherwise sound stronger than its basis
- Keep machine-gate expectations explicit before any human approval or implementation handoff

---

## 5. Current Review Sequence

Completed in prior planning passes:

- `docs/system-architecture.md` (reviewed 2026-03-14, amended 2026-03-16)
- `docs/specs/user-profile.md` (reviewed 2026-03-14, **superseded** 2026-03-16 by family-profile.md)
- `docs/specs/followup-reminder.md` alignment update
- `docs/specs/growth-plan.md`
- `docs/specs/report-analysis.md`
- `docs/specs/crisis-calm.md`
- `docs/specs/memory-profile-summary.md`

Completed in 2026-03-16 amendment pass:

- `docs/system-architecture.md` — unified sidebar, Dashboard hub, route restructure
- `docs/specs/family-profile.md` — new, replaces user-profile.md
- `docs/specs/dashboard.md` — new
- `docs/project-control.md` — execution order updated
- `docs/formal-basis-entry.md` — spec list updated

Completed in 2026-03-17 planning pass:

- `docs/specs/compliance.md` — new, MVP launch gate (6 items: system prompt, parental consent, privacy policy, terms of service, account deletion, RLS fix)
- `docs/project-control.md` — compliance module added to status and execution order
- `docs/formal-basis-entry.md` — compliance spec added

Next documents to continue automatically:

1. Self-review + cross-review for compliance spec (2026-03-17)
2. Implementation-phase alignment updates as code lands
