# AQS Review Result — Memory And Profile Summary Spec

## Review Time
2026-03-14

## Review Scope
- Target document: `/Users/jamesguu/qimi-ai-website/qimi-ai-website/docs/specs/memory-profile-summary.md`
- Review type: self-review + second-pass review
- Constraint: this pass did not use a separate review agent session, so strict SOP cross-agent review is still pending

## Findings Fixed In This Pass

1. The repo still exposed `familyNotes` and `extractedFacts` at the prompt-builder boundary without a canonical storage spec.
   Resolution: introduced a dedicated memory/profile-summary spec that separates compatibility inputs from system-of-record tables.
2. Earlier planning risked copying the mini-program `extractedFacts` model directly into the web app.
   Resolution: standardized the web design on `profile_summary` plus `memory_items`, with `extractedFacts` kept only as a compatibility alias.
3. Memory concerns were previously mixed into profile planning.
   Resolution: kept `user-profile` focused on explicit editable profile fields and moved memory into its own spec.
4. The likely implementation path could have overreached into embeddings or a separate memory service too early.
   Resolution: constrained MVP retrieval to simple capped heuristics with no vector layer.

## AQS Review

### 1. Security
- [PASS] Memory writes remain behind authenticated or internal API routes
- [PASS] Per-user ownership is explicit in schema and RLS
- [PASS] Sensitive conversation-derived memory is not exposed by default in a public UI

### 2. Architecture
- [PASS] Structured profile, editable summary, and internal memory are separated cleanly
- [PASS] The design avoids overloading the profile table with inferred memory
- [PASS] Prompt-injection compatibility is preserved without making prompt fields the canonical model

### 3. Engineering Quality
- [PASS] MVP is intentionally narrow and avoids unnecessary infrastructure
- [PASS] Retrieval is capped and selective
- [PASS] The execution path is incremental and compatible with the current repo

### 4. Technology Stack Compliance
- [PASS] The spec stays within the current Next.js + Supabase stack
- [PASS] No new external memory platform is required
- [PASS] API-route ownership stays consistent with the existing app architecture

### 5. Reverse Checks
- [PASS] No vector search or embeddings are required in MVP
- [PASS] No full memory-management UI is required in MVP
- [PASS] No raw `extractedFacts` array is promoted as the main user data model

## Residual Risks

- `lib/prompts.ts` still uses the old field names until implementation catches up
- Memory extraction quality will depend on later prompt and dedup design
- Strict SOP cross-agent review is still outstanding

## Summary

- PASS: content-level AQS review completed after fixes
- P0: 0
- P1: 0
- Remaining process gap: independent cross-agent review pending
