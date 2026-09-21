# Implementation Specification — VibeRadar

## 1. Purpose

This document is the implementation bridge between the product contracts and source code.

Canonical product chain:

```text
SIGNAL -> TREND -> EXPLANATION -> BUILDABILITY -> OPPORTUNITY -> ACTION
```

The first implementation must prove the shorter MVP loop:

```text
GitHub
-> collect
-> normalize
-> snapshot
-> calculate growth
-> score + confidence
-> buildability
-> assemble claims/evidence
-> analyze
-> editorial review
-> publish
-> measure
```

Do not implement post-MVP intelligence merely because its data model is documented.

## 2. Runtime shape

Use one repository and one Node.js package.

Two production processes:

1. **web** — Next.js application, server-rendered public pages and health/webhook route handlers;
2. **worker** — background collection/scoring/analysis/digest process.

PostgreSQL is the system of record.

Do not introduce network microservices, Redis, Kafka, Kubernetes, a vector database, or an agent framework until a measured need exists.

## 3. Baseline stack

- Node.js 24+
- TypeScript with strict mode
- pnpm
- Next.js App Router
- PostgreSQL
- Drizzle ORM + explicit migrations
- Zod for runtime validation
- Vitest
- native Node.js `fetch` for initial provider clients
- Docker Compose for local infrastructure
- Nginx or equivalent reverse proxy in production

Additional dependencies require a concrete stage-level reason.

## 4. Repository layout

Target shape after Stage 01:

```text
src/
  app/                       Next.js routes and layouts
    api/
    methodology/
    projects/
    radar/
  components/                reusable UI components only
  styles/                    tokens/global/component styles
  server/
    config/                  environment parsing/validation
    db/                      client, schema, migrations, repositories
    modules/
      sources/
      github/
      discovery/
      entities/
      snapshots/
      growth/
      scoring/
      confidence/
      buildability/
      evidence/
      analysis/
      editorial/
      content/
      publishing/
      telegram/
      analytics/
      outscan/
  worker/
    index.ts
    jobs/
tests/
  fixtures/
  integration/
  security/
docs/
```

Rules:

- `src/app` orchestrates UI/route behavior; domain/business rules stay in `src/server/modules`.
- Browser-safe code must not import `src/server`.
- Provider adapters depend on internal contracts, not the reverse.
- No catch-all `utils.ts`.
- Auth, scoring, provider access, publishing, and DB writes remain server-only.
- Authored source files stay at or below 400 physical lines.

## 5. Dependency direction

```text
routes / worker jobs
        |
        v
application services
        |
        v
domain contracts
        |
        v
adapters
(db / GitHub / Telegram / AI)
```

A provider adapter may translate provider data into domain records. Domain services must not import GitHub-, Telegram-, or model-specific SDK types.

## 6. Web rendering model

Prefer Server Components and server-side queries for public read surfaces.

Client components are justified only for actual interaction such as:

- filter state that must update without navigation;
- charts requiring browser interaction;
- editor/admin controls later.

Do not ship a client-side SPA for read-only radar pages.

## 7. Canonical MVP routes

Public:

- `/` — current radar overview; data-first home
- `/radar` — filtered current signals/projects
- `/projects/[slug]` — canonical project intelligence record
- `/methodology` — VIBE SCORE, confidence, evidence and editorial independence

Operational:

- `GET /api/health/live` — process liveness only
- `GET /api/health/ready` — database readiness and required runtime dependencies
- Telegram webhook route is added only in the Telegram stage if webhook mode is chosen.

Do not expose a public JSON API in MVP unless the web implementation requires one. Server-render directly from application services.

## 8. MVP read model

The home/radar view needs a deliberately small projection:

- canonical project identity
- title/description
- primary category
- total reach
- 24h/7d growth
- momentum/velocity
- VIBE SCORE and version
- confidence
- buildability
- last meaningful event
- published analysis summary when approved
- evidence/source count
- updated timestamp

Do not fetch full raw provider payloads for page rendering.

## 9. Write boundaries

Only these server-side flows may write during MVP:

- provider collection
- normalization/entity resolution
- snapshot/release persistence
- deterministic metric/scoring jobs
- claim/evidence/research-run persistence
- validated analysis persistence
- trusted editorial decisions
- publication state transitions
- analytics/calibration events

Public pages are read-only.

## 10. Stage order

Implementation must proceed in bounded stages:

1. Foundation
2. GitHub discovery + source provenance
3. Growth engine
4. VIBE SCORE + confidence
5. Buildability
6. Evidence + AI analysis
7. Telegram editorial
8. Publishing + minimal web
9. Scheduler/operations

After MVP quality is measurable:

10. Product Mechanic Radar
11. Opportunity Engine
12. additional sources
13. personalization/API/MCP

Each stage updates `plan.md`, `CHANGELOG.md`, and only documentation made stale by the implementation.

## 11. Definition of done for a stage

A stage is complete only when:

- the requested behavior is implemented;
- targeted tests exist;
- lint/format passes;
- TypeScript typecheck passes;
- relevant integration tests pass when infrastructure is available;
- production build passes when the stage touches runtime code;
- security-negative tests exist for changed privileged boundaries;
- changed authored source files satisfy the 400-line gate;
- final diff contains no secrets/debug code/scope creep;
- documentation reflects actual behavior.

## 12. Explicit deferrals

Do not build during the initial MVP unless scope is changed explicitly:

- user accounts
- subscriptions/billing
- personalized radar
- public write APIs
- community submissions
- Instagram automation
- external agent/control-plane frameworks as core runtime dependencies
- multi-provider model routing before at least two providers and a measured routing/fallback need
- automated Product Mechanic Radar
- automated Opportunity Engine
- VibeRadar MCP
- autonomous execution of discovered repositories
- third-party security scans
