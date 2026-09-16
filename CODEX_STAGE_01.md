# Codex Task — Stage 01 Foundation

Implement **only Stage 01 Foundation** for Vibe Radar. Do not implement GitHub discovery, VIBE SCORE, LLM integration, Telegram, Instagram, website UI, or OUTSCAN runtime integration.

## Before editing

Read, in order:

1. `AGENTS.md`
2. `README.md`
3. `plan.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DATA_MODEL.md`
6. `docs/SECURITY.md`

Treat those documents as the current project contract.

## Goal

Create a minimal, production-oriented Node.js/TypeScript foundation that can safely support later Vibe Radar stages without prematurely implementing them.

## Required implementation

### Project/tooling

- Node.js 24+ project
- TypeScript
- pnpm
- Fastify application shell
- Vitest
- lint/format/typecheck/build scripts using a minimal justified toolset

### Configuration

Create a validated server-side configuration boundary.

At minimum support:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `DATABASE_SSL`
- OUTSCAN feature flags from `.env.example`, parsed but unused

Do not require GitHub/Telegram/LLM credentials in Stage 01 startup because those integrations do not exist yet.

Invalid required configuration must fail closed at startup with a safe error that does not print secret values.

### PostgreSQL

- explicit connection boundary;
- versioned migrations;
- no automatic hidden schema mutation outside the explicit migration command;
- parameterized queries/typed bindings;
- local PostgreSQL through Docker Compose.

Implement the minimum schema needed to establish future domain identity and publication idempotency contracts without overbuilding provider-specific behavior.

Preferred initial tables:

- `repositories`
- `repository_snapshots`
- `scores`
- `candidates`
- `analyses`
- `editorial_decisions`
- `publications`
- `publication_attempts`

If a table would be ceremonial/empty without a coherent contract, document why it is deferred rather than inventing speculative columns.

### Domain contracts

Add focused types/enums for:

- provider
- candidate status
- editorial decision
- publication status/channel
- OUTSCAN relevance enum

Do not put unrelated types into a single large file.

### Application health

Add a minimal health/readiness boundary that can distinguish process health from database readiness.

Do not expose secrets/config dumps.

### Tests

At minimum verify:

1. configuration validation;
2. invalid configuration fails safely;
3. database migration can create the schema in an isolated test database if available;
4. canonical repository identity uniqueness at DB level;
5. publication idempotency uniqueness at DB level;
6. health/readiness behavior;
7. OUTSCAN feature flags default closed.

If an integration test database is unavailable in the environment, keep the tests and clearly report that they were not executed; do not claim they passed.

### Security

Apply `docs/SECURITY.md` to the implemented surface.

Do not:

- add a generic arbitrary URL fetcher;
- add shell execution;
- add repository code execution;
- add public admin/auth shortcuts;
- log environment variables;
- commit tokens/credentials.

### Documentation

After implementation:

- update `README.md` with actual setup and commands;
- update `plan.md` Stage 01 checkboxes based on verified completion;
- update `CHANGELOG.md` with durable changes;
- document any intentionally deferred decision.

Evaluate Graphify only after the meaningful source/module structure exists. If you install it, use the project-scoped Codex integration and document the regeneration command. If blocked or unnecessary at this stage, record the decision in `plan.md` rather than forcing it.

## Architecture/quality constraints

- authored source files <=400 physical lines;
- one clear primary responsibility per file;
- no circular imports;
- no broad `utils.ts` dumping ground;
- no Redis/queue/ORM/agent framework unless strictly necessary and justified;
- no implementation of later stages.

## Verification gate

Run all available relevant checks:

- formatting/lint
- TypeScript typecheck
- unit tests
- database/integration tests if test PostgreSQL is available
- production build
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
6. remaining Stage 01 blockers, if any;
7. confirmation that Stages 02+ were not implemented.

Stop after Stage 01. Do not continue automatically.
