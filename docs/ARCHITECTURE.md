# Architecture — VibeRadar

## 1. System shape

VibeRadar starts as a modular TypeScript application with a separate worker process. Do not split into network microservices until independent scaling, security isolation, or operational ownership clearly requires it.

```text
External sources
  GitHub first
      ↓
Provider adapters / collectors
      ↓
Normalization + entity resolution
      ↓
PostgreSQL
  projects
  provider identities
  snapshots
  releases
  signals
  provenance
      ↓
Intelligence core
  velocity
  VIBE SCORE
  confidence
  buildability
  mechanics/trends later
  opportunities later
      ↓
Candidate policy
      ↓
AI analyzer
  bounded input
  structured output
  untrusted interpretation
      ↓
Editorial queue
      ↓
Trusted editor approval
      ↓
Content model
      ↓
Publisher adapters
  Telegram first
  Web canonical record
  Instagram later
      ↓
Analytics / calibration
```

## 2. Baseline technology direction

- Node.js 24+
- TypeScript
- Next.js for public/application surfaces
- PostgreSQL
- Drizzle ORM
- Zod
- Vitest
- background worker/job runner
- Telegram Bot API
- AI-provider abstraction
- Docker Compose for local infrastructure

Keep additional dependencies stage-justified.

## 3. Initial module boundaries

A concrete scaffold may adapt folder names, but responsibilities should remain explicit.

```text
src/
  app/                 web/application composition
  config/              validated runtime configuration
  db/                  connection, schema, migrations, repositories
  modules/
    sources/            source-neutral source/provenance contracts
    github/             GitHub read-only provider adapter
    discovery/          collection orchestration
    entities/           normalization/entity resolution/deduplication
    snapshots/          time-series observation persistence
    growth/             deltas, acceleration, project age context
    scoring/            VIBE SCORE/versioning/breakdown
    confidence/         evidence confidence
    buildability/       implementation feasibility assessment
    mechanics/          Product Mechanic Radar (post-MVP automation)
    opportunities/      Opportunity Engine (post-MVP automation)
    analysis/           LLM projection/prompts/schema validation
    editorial/          candidates and trusted decisions
    content/            normalized content model
    publishing/         channel-neutral publication contracts
    telegram/           editor bot + publisher adapter
    web/                radar/project presentation use cases
    analytics/          publication/usefulness/calibration metrics
    outscan/            isolated security-context integration
  jobs/                 bounded scheduled/background orchestration
```

## 4. Dependency direction

Preferred direction:

```text
app/jobs
   ↓
application use cases
   ↓
domain contracts
   ↓
adapters (db/providers/telegram/llm)
```

Provider-specific types must not leak into core scoring or editorial contracts unless explicitly mapped.

Avoid circular imports and generic catch-all modules.

## 5. Runtime processes

Initial deployment may use one codebase with separate entry points/processes:

### Web/app process

Responsible for:

- minimal public `viberadar.ru` pages;
- internal/editor endpoints when needed;
- health/readiness;
- read-oriented presentation.

### Worker process

Responsible for:

- source collection;
- snapshot refresh;
- growth/scoring jobs;
- analysis queue processing;
- scheduled radar generation;
- Telegram publication jobs.

Only one logical scheduler may own a scheduled job at a time. If horizontal workers are introduced, use database-backed leases/advisory locks before introducing a dedicated queue platform.

## 6. PostgreSQL as system of record

Use database constraints for at least:

- provider project identity uniqueness;
- snapshot uniqueness per observation boundary;
- score/version uniqueness where appropriate;
- candidate dedupe keys;
- publication idempotency keys.

Historical observations should remain append-oriented rather than mutable aggregates.

## 7. Evidence vs generated analysis

Keep these as distinct persistence concerns:

### Evidence

- source metadata
- source events
- repository/provider observations
- snapshots
- deterministic metrics

### Generated interpretation

- summaries
- classifications
- buildability explanation
- mechanic proposals
- opportunity hypotheses
- channel copy

An LLM output must not become evidence merely because it has been persisted.

## 8. Scoring boundaries

The following are separate:

- reach/popularity
- growth velocity
- VIBE SCORE
- confidence
- buildability
- trend/mechanic lifecycle

Do not collapse them into one opaque ranking number.

## 9. Public surfaces

Initial:

- private Telegram editor bot;
- Telegram channel publisher;
- minimal `viberadar.ru` canonical radar/project pages.

Later:

- richer web discovery/catalog;
- watchlists and alerts;
- authenticated personalization;
- Instagram content generation/publishing;
- public API;
- MCP/agent intelligence interface;
- optional team/admin surfaces.

## 10. OUTSCAN boundary

`modules/outscan` remains isolated from:

- VIBE SCORE;
- Trend Velocity;
- confidence;
- candidate selection;
- editorial ranking.

It may provide security-context enrichment and explicit, approved commercial attribution only after feature gates are enabled.

## 11. Security/trust boundary

All external repository content, metadata text, README excerpts, release notes, community text, and model output are untrusted inputs.

The LLM cannot:

- publish directly;
- execute discovered code;
- modify scoring policy;
- authorize editor actions;
- bypass deterministic validation.

See `docs/SECURITY.md` and `docs/SOURCES_AND_TRUST.md`.
