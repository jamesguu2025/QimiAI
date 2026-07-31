# AI Usage Quota Planning Review

> Date: 2026-07-26
> Artifact: `docs/specs/ai-usage-quota.md`
> Result: SELF-REVIEWED, independent review pending

## Review scope

This review covers the planning artifact only. It does not accept the current implementation and does not authorize implementation, merge, deployment, or production migration.

## First pass findings and corrections

1. P0: The initial quota concept covered the main chat and plan generation routes but not every direct cost-bearing endpoint. The spec now includes plan decision, title generation, memory extraction, routing, RAG gating, synthesis, and internal retries.
2. P0: Browser guest storage could block independently of the server. The target design now makes the server the only enforcement source.
3. P1: The status contract did not include an exact reset time. The target contract now includes `resetsAt` and temporary `Retry-After` behavior.
4. P1: Showing only a counter would not measure cascaded provider cost. The design now includes content-free provider-call and token telemetry.
5. P1: Retry behavior could double-charge a user action. The design now requires idempotent action accounting.
6. P1: Quota UI could become noisy. The accepted candidate separates visible product allowances from transient technical burst protection.

## Second pass optimization

1. Rejected counting every internal model call as a separate user allowance because one visible chat action can use several internal model calls.
2. Rejected counting user actions without a provider-call ceiling because ancillary routes could still create excessive cost.
3. Kept implementation linear because database authority, API integration, and UI all depend on the same quota contract.
4. Kept the Dashboard view compact and collapsed to avoid duplicating the full Chat and Growth Plan interfaces.
5. Kept Family Profile onboarding as a separate decision so quota work cannot silently change activation behavior.

## Gate result

- External evidence trace: PASS
- Current-code evidence with line references: PASS
- ADR-lite and Search Ledger: PASS
- AQS self-review: PASS
- Independent review: PENDING
- Human product decision: PENDING
- Implementation authorization: NOT GRANTED
