# Local Test Environment

> Status: ACTIVE | Amended: 2026-05-06 (SOP v2.4 evidence note)

This project must not use production Supabase for routine local feature testing.

## SOP Evidence Status

This setup document has been checked against the current `agent-dev-sop` on 2026-05-06.

External evidence:

- Supabase's official local development guide supports local CLI development, version-controlled migrations under `supabase/migrations/`, `supabase db reset`, and seed data through `supabase/seed.sql`: https://supabase.com/docs/guides/cli/local-development
- Supabase's official CLI local development workflow supports running the local stack with `supabase start` and Docker-compatible local services: https://supabase.com/docs/guides/cli

Internal code evidence:

- `package.json:L6-L15` defines `dev`, `dev:local`, env switching, `supabase:start`, `supabase:stop`, `supabase:reset`, `build`, and `start`.
- `supabase/migrations/` contains the versioned local schema source of truth.
- `supabase/seed.sql` contains the local seed data loaded by reset.

Conclusion:

- The local testing policy is accepted as the default database-backed development path.
- Production Supabase remains restricted to validated migrations and explicit production maintenance.

## Environment Policy

Use this order for database-backed work:

1. Local Supabase
2. Staging or Supabase branch
3. Production Supabase

Production is only for validated migrations and production maintenance. Do not use it for exploratory testing, guest migration debugging, or repeated manual refresh tests.

## Local Supabase Setup

Prerequisites:

- Docker Desktop, OrbStack, Colima, or another Docker-compatible runtime
- Node 20+
- Project dependencies installed with `npm install --legacy-peer-deps`

## Parallel Local Projects

Qimi keeps the default local Supabase ports:

```text
Qimi app: http://localhost:4000
Qimi Supabase API: http://127.0.0.1:54321
Qimi DB: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Qimi Studio: http://127.0.0.1:54323
Qimi Inbucket: http://127.0.0.1:54324
Qimi analytics: 54327
```

The separate social media account manager project at:

```text
/Users/jamesguu/Library/CloudStorage/OneDrive-个人/work/Million Dollar Business/social media account manager
```

uses a separate local Supabase port group so both projects can run at the same time:

```text
Social app: http://localhost:3000
Social Supabase API: http://127.0.0.1:55321
Social DB: postgresql://postgres:postgres@127.0.0.1:55322/postgres
Social Studio: http://127.0.0.1:55323
Social Mailpit: http://127.0.0.1:55324
Social analytics: 55327
```

Do not move Qimi to the social project's `553xx` ports, and do not move the social project back to Qimi's `543xx` ports. If both stacks are running, `docker ps` should show both `supabase_*_qimi-ai-website` and `supabase_*_lazibuzz-local` containers with different host ports.

Start local Supabase:

```bash
npm run supabase:start
```

The CLI prints local credentials:

```text
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
anon key: ...
service_role key: ...
```

Create a local env file:

```bash
cp .env.supabase-local.local.example .env.supabase-local.local
```

Fill in the local `anon key` and `service_role key` printed by the CLI.

Switch Next.js to local Supabase:

```bash
npm run env:local
npm run dev
```

Or start local mode in one command:

```bash
npm run dev:local
```

## Database Reset

Local schema is managed by migration files in:

```text
supabase/migrations/
```

Seed data is in:

```text
supabase/seed.sql
```

Default local test account:

```text
Email: local-parent@example.com
Password: LocalTest123!
```

Reset local Supabase to a known state:

```bash
npm run supabase:reset
```

This applies migrations and reloads seed data. Use this before testing guest migration, conversation persistence, user profile, growth plan, or other database-backed features.

## Environment Switching

Real env files are intentionally ignored by git:

```text
.env.supabase-local.local
.env.staging.local
.env.production.local
.env.local
```

Templates are committed:

```text
.env.supabase-local.local.example
.env.production.local.example
```

Switch target:

```bash
npm run env:local
npm run env:staging
npm run env:production
```

Before testing any feature that writes data, verify `.env.local` points to the intended Supabase URL.

## Production Rule

Production Supabase changes require:

1. Migration file committed under `supabase/migrations/`
2. Local reset passing
3. Staging or branch verification
4. Explicit production migration approval

Do not manually edit production schema unless the same SQL is also captured in version-controlled migration files.

## Accepted Smoke Test Baseline

Accepted on 2026-05-06:

- `npm run supabase:start` starts the local stack.
- `npm run supabase:reset` rebuilds the database from migrations and seed data.
- `npm run env:local` points `.env.local` to `http://127.0.0.1:54321`.
- `npm run dev` serves the app at `http://localhost:4000`.
- Guest chat works without DSML leakage.
- Markdown tables render in assistant messages.
- Guest conversation content survives refresh in the expected order.
- Signing in with the default local test account migrates guest chat into saved conversations.
- Refreshing and re-logging after migration does not create duplicate conversations.
- Clicking a SmartDrawer history item loads the expected conversation and allows continued replies.
