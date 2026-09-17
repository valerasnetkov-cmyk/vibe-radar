# Codex Task — Stage 01 Foundation

Implement **only Stage 01 Foundation** for VibeRadar. Do not implement GitHub discovery, VIBE SCORE, AI analysis, Telegram, Instagram, production editorial UI, Product Mechanic Radar, Opportunity Engine, or OUTSCAN runtime integration.

## Before editing

Read, in order:

1. `AGENTS.md`
2. `README.md`
3. `plan.md`
4. `docs/IMPLEMENTATION_SPEC.md`
5. `docs/ARCHITECTURE.md`
6. `docs/DATABASE_SCHEMA.md`
7. `docs/SECURITY.md`
8. `docs/TEST_STRATEGY.md`
9. `docs/WEB_UI.md`

Treat these documents as the current project contract.

## Goal

Create a minimal, production-oriented foundation that can support the later VibeRadar pipeline without prematurely implementing it.

## Required implementation

### Project/tooling

- Node.js 24+
- TypeScript with strict mode
- pnpm
- Next.js App Router
- separate worker entry point
- PostgreSQL
- Drizzle ORM with explicit migrations
- Zod
- Vitest
- lint/format/typecheck/build scripts with a minimal justified toolset

Do not add a second web framework.

### Application shell

Create only the minimum routes needed to prove the application foundation:

- `/` — restrained placeholder shell using the VibeRadar light visual system; no fake live metrics
- `GET /api/health/live`
- `GET /api/health/ready`

The home shell must follow `docs/WEB_UI.md`: light, flat, minimal, no decorative gradients, glows, glassmorphism, or shadow-card wall.

Do not implement the real radar/project UI yet.

### Worker

Create a separate worker process/entry point that can:

- start with validated configuration;
- establish the future background-process boundary;
- shut down cleanly.

It must not implement discovery/scoring jobs in Stage 01.

### Configuration

Create a validated server-side configuration boundary.

At minimum support:

- `NODE_ENV`
- database configuration
- server/runtime settings needed by the chosen Next.js/worker setup
- `DATABASE_SSL`
- OUTSCAN feature flags from `.env.example`, parsed but unused

Do not require GitHub/Telegram/AI credentials because those integrations do not exist yet.

Invalid required configuration must fail closed with a safe error that does not print secret values.

### PostgreSQL / Drizzle

Requirements:

- explicit server-only DB connection boundary;
- Drizzle schema definitions;
- explicit versioned migrations;
- no automatic hidden production schema mutation from application startup;
- typed/parameterized database access;
- local PostgreSQL through Docker Compose.

Use `docs/DATABASE_SCHEMA.md` as the target contract, but create only tables that have a coherent Stage 01 purpose.

Minimum Stage 01 contracts should establish:

- canonical project/provider identity uniqueness;
- historical snapshot boundary;
- publication idempotency.

If later-domain tables would be ceremonial, defer them and document the decision.

### Domain contracts

Add focused types/enums for implemented Stage 01 boundaries.

Do not create one large shared types file.

### Health/readiness

`/api/health/live`:

- process health only;
- no secrets or config dump.

`/api/health/ready`:

- database readiness;
- generic safe failure output;
- no credentials/internal connection detail.

### Tests

At minimum verify:

1. configuration validation;
2. invalid configuration fails safely;
3. OUTSCAN flags default closed;
4. migration/schema initialization in an isolated PostgreSQL database when available;
5. canonical provider identity uniqueness at DB level;
6. publication idempotency uniqueness at DB level if publication table is introduced in Stage 01;
7. liveness behavior;
8. readiness success/failure behavior;
9. server-only boundaries are not imported by client code where practical to test.

If an integration-test database is unavailable, keep the tests and clearly report that they were not executed.

### Security

Apply `docs/SECURITY.md`.

Do not:

- add a generic arbitrary URL fetcher;
- execute discovered repository code;
- add shell execution features;
- add public admin/auth shortcuts;
- log environment variables;
- commit real credentials;
- expose PostgreSQL publicly in production configuration;
- create model/provider integrations.

### Documentation

After implementation:

- update `README.md` with actual setup and commands;
- update `plan.md` Stage 01 checkboxes based only on verified completion;
- update `CHANGELOG.md`;
- document intentionally deferred schema/runtime choices.

Evaluate Graphify only after meaningful source/module structure exists. If used, follow the project-scoped Codex setup documented by the modular-project instructions.

## Architecture/quality constraints

- authored source files <=400 physical lines;
- one primary responsibility per file;
- no circular imports;
- no generic `utils.ts` dumping ground;
- keep server-only code in server boundaries;
- no Redis/Kafka/Kubernetes/vector DB/agent framework;
- no implementation of Stages 02+.

## Verification gate

Run all available relevant checks:

- format/lint
- TypeScript typecheck
- unit tests
- PostgreSQL integration tests when available
- production Next.js build
- worker build/type validation
- source-file line-count check
- final diff review for secrets/debug code/scope creep

Do not mark Stage 01 complete if any required available check fails.

## Completion response

Report only:

1. achieved Stage 01 outcome;
2. important files/modules added;
3. database schema/migration summary;
4. checks actually run and exact pass/fail state;
5. anything not verified and why;
6. remaining Stage 01 blockers;
7. confirmation that Stages 02+ were not implemented.

Stop after Stage 01. Do not continue automatically.
