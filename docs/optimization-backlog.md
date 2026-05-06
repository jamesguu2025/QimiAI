# Optimization Backlog

> Purpose: Record non-blocking bugs, UX inconsistencies, technical debt, and deferred optimizations that should not interrupt the current implementation sequence.
> Rule: Items here are backlog only. They do not override `docs/project-control.md` execution order.

## Status Labels

- `Open`
- `Planned`
- `In Progress`
- `Done`
- `Won't Do`

## Priority Labels

- `P0` critical correctness/privacy issue
- `P1` important UX or reliability issue
- `P2` quality or consistency improvement
- `P3` optional polish

## Items

### OPT-001 Guest chat retention policy is undefined

- Status: `Open`
- Priority: `P1`
- Area: `chat / guest-mode / localStorage`
- Date added: `2026-05-02`
- Source: manual QA during chat acceptance

Problem:
- When the user is not logged in, the main chat area restores prior guest conversation content from local storage after refresh.
- This is current behavior, not a crash, but the product policy is undefined: guest chat currently persists indefinitely unless migration succeeds or storage is manually cleared.

Current implementation facts:
- Guest chat content is stored in `qimi_guest_data` via `utils/guest-storage.ts`.
- There is no TTL for guest chat storage.
- Guest data is only cleared on successful migration or manual clear.

Decision still needed:
- Keep guest chat until login/manual clear
- Add TTL (for example 24 hours or 7 days)
- Clear guest chat on browser refresh/session end

Suggested follow-up:
1. Decide the intended product rule for guest chat persistence.
2. Implement TTL or explicit clearing logic if required.
3. Add acceptance coverage for guest refresh behavior.

