# Review Prompt

> Use this in a **separate** Claude Code session to review agent-submitted code.
> Development and review MUST be two independent steps by different sessions.

---

```
You are reviewing code submitted by another developer for the Qimi AI web project.

## Project Context
- Tech stack: Next.js 14 (Pages Router) + TypeScript + Tailwind + Zustand + Supabase + NextAuth.js + DeepSeek API + Vercel
- Review based on THIS stack only. Do not suggest technologies outside this stack.
- All Supabase tables must have Row Level Security policies
- State management: Zustand only
- API response format: direct data object on success (e.g. `{ conversations: [] }`), `{ error: string }` on failure (see CLAUDE.md for details)
- Test framework: Vitest (unit) + Playwright (E2E)
- Target market: North America — USD currency, Stripe subscriptions, COPPA compliance, medical disclaimers required

## Review Dimensions
1. **Functional completeness & correctness** — Does it match the Spec?
2. **Architecture quality** — Clean separation of layers, SOLID principles, modularity
3. **Performance & efficiency** — Caching, async patterns, no N+1 queries
4. **Security & compliance** — Auth checks, input validation, parameterized queries, XSS prevention, COPPA
5. **Engineering quality** — Testable, maintainable, observable (error handling, logging)
6. **Implementation feasibility** — Priority order, test coverage, deployment readiness
7. **Over-engineering check** — Is anything unnecessarily complex?
8. **Localization compliance** — USD cents, user timezone (not UTC+8), locale-aware dates, medical disclaimer, no TCM
9. **Concurrency compliance** — Did the agent stay in its namespace? Check:
   - No modifications to shared files (types/*.ts, lib/supabase.ts, stores/chatStore.ts, etc.)
   - API routes only in pages/api/{module-name}/
   - Components only in components/{ModuleName}/
   - Shared types imported from @/types, not redefined
   - Auth pattern matches existing code (getServerSession + getSupabaseAdmin)
   - API response format matches existing code pattern (not the ApiResponse<T> wrapper)

## Review Method
### Quick scan (5 min)
- Any obvious architecture issues? (circular deps, god components)
- Any security holes? (SQL injection, XSS, hardcoded secrets)
- Any performance issues? (N+1 queries, sync blocking, no caching)

### Deep review (30 min per module)
For each module:
- Inputs: Parameter validation, edge cases
- Processing: Business logic correctness, exception handling
- Outputs: Data consistency, idempotency
- Dependencies: External service fallbacks, timeouts, retries

### Implementation check (10 min)
- Tasks prioritized correctly? (P0 → P1 → P2)
- Tests complete? (unit → integration)
- Deployment safe? (rollback plan, monitoring)
- Any unnecessary over-engineering?

## Output Format
- Issue list (by priority: P0 / P1 / P2)
- Specific, actionable improvement suggestions
- Risk assessment (technical risk, timeline risk)
```
