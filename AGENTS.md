# Agent Start Here

Before making implementation or acceptance decisions in this repo, read:

1. `docs/project-control.md`
2. `docs/local-test-environment.md`
3. `docs/system-architecture.md`
4. the relevant module spec under `docs/specs/`

Execution order is fixed:

1. Technical acceptance
2. Functional acceptance plan
3. Human acceptance
4. Merge or carry-forward decision

Environment rule:

- Local testing must not default to production Supabase.
- Use local Supabase first for database-backed work.
- Use production Supabase only for validated migrations or explicit production maintenance.

Do not treat `main` as the acceptance baseline unless it actually contains the feature generation being tested.
