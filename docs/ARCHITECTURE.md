# Architecture — Vibe Radar

## 1. Logical architecture

```text
External sources
  GitHub first
      ↓
Discovery / provider adapters
      ↓
Normalization
      ↓
PostgreSQL
  repositories
  snapshots
  releases
      ↓
Growth Engine
      ↓
VIBE SCORE
      ↓
Candidate Policy
      ↓
AI Analyzer (bounded, untrusted output)
      ↓
Editorial Queue
      ↓
Trusted Editor Approval
      ↓
ContentModel
      ↓
Publisher adapters
  Telegram first
      ↓
Publication analytics / attribution
```

## 2. Initial module boundaries

```text
src/
  app/            composition/root application
  config/         environment parsing and validated config
  db/             connection, migrations, repositories
  modules/
    discovery/    source-neutral discovery orchestration
    github/       GitHub read-only adapter and normalization
    scoring/      growth metrics + VIBE SCORE
    analysis/     LLM projection, prompts, schema validation
    editorial/    candidate state and editor decisions
    content/      normalized ContentModel and render inputs
    publishing/   source-neutral publication contracts
    telegram/     editor bot + Telegram publisher adapter
    analytics/    publication/referral metrics later
    outscan/      disabled-by-default future integration
  jobs/           bounded scheduled jobs/orchestration
```

## 3. Dependency direction

Provider adapters depend on domain contracts, not the reverse.

Preferred direction:

```text
app/jobs
   ↓
use cases/services
   ↓
domain contracts
   ↓
adapters (db/github/telegram/llm)
```

Avoid circular dependencies and shared catch-all `utils` modules.

## 4. Runtime shape

MVP can run as a single deployable Node.js application with separate process entry points if useful:

- API/editor surface;
- worker/scheduler.

Do not split into network microservices until independent scaling or isolation is demonstrated.

## 5. Database

PostgreSQL is the system of record.

Use constraints for:

- GitHub repository identity;
- snapshot uniqueness per observation boundary;
- score version uniqueness where appropriate;
- publication idempotency.

## 6. Scheduling

Start with bounded in-process or single-worker scheduling if production deployment guarantees a single scheduler instance. If horizontal scaling is introduced, add a database-backed lease/advisory-lock mechanism before adding a queue platform.

## 7. Public surfaces

MVP:

- no public website required;
- private Telegram editor bot;
- Telegram channel publisher.

Later:

- `viberadar.ru` public catalog;
- `api.viberadar.ru` API;
- optional `admin.viberadar.ru` editor UI.

## 8. OUTSCAN boundary

`modules/outscan` must remain isolated from scoring and candidate selection. It may contribute only to approved content enrichment/CTA/attribution after feature flags are enabled.
