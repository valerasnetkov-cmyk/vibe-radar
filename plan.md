# Vibe Radar — Plan

## Current status

Documentation bootstrap prepared. No runtime implementation is considered complete yet.

## Stage 00 — Product/architecture bootstrap

- [x] Product identity fixed: Vibe Radar
- [x] Canonical domain fixed: `viberadar.ru`
- [x] MVP boundary documented
- [x] Architecture documented
- [x] Data model drafted
- [x] VIBE SCORE v1 contract drafted
- [x] AI trust boundary documented
- [x] Editorial/publishing contract documented
- [x] OUTSCAN integration boundary documented
- [x] Stage 01 Codex task prepared

## Stage 01 — Foundation

- [ ] Initialize Node.js/TypeScript/pnpm project
- [ ] Add Fastify application shell
- [ ] Add configuration loader with validation
- [ ] Add PostgreSQL connection boundary
- [ ] Add versioned migration runner
- [ ] Add initial domain enums/types
- [ ] Add initial database schema
- [ ] Add health/readiness boundary
- [ ] Add tests for config/schema/idempotency constraints where applicable
- [ ] Add Docker Compose for local PostgreSQL
- [ ] Add `.env.example`
- [ ] Add lint/typecheck/test/build commands
- [ ] Verify authored source files <=400 lines
- [ ] Evaluate Graphify only after meaningful module structure exists

## Stage 02 — GitHub discovery

- [ ] Read-only GitHub API client
- [ ] Search/query strategy
- [ ] Repository normalization
- [ ] Snapshot persistence
- [ ] Provider rate-limit handling
- [ ] Bounded retries/timeouts
- [ ] Discovery provenance

## Stage 03 — Growth engine

- [ ] Delta calculations (2h/24h/7d)
- [ ] Percentage growth
- [ ] Acceleration metric
- [ ] Repository age/freshness
- [ ] Activity metrics
- [ ] Snapshot-gap handling

## Stage 04 — VIBE SCORE v1

- [ ] Weighted component engine
- [ ] Penalties
- [ ] Explainable score breakdown
- [ ] `score_version=1`
- [ ] Candidate threshold policy
- [ ] Deterministic tests

## Stage 05 — AI analysis

- [ ] Bounded input projection
- [ ] Strict output schema
- [ ] Prompt versioning
- [ ] Provider/model provenance
- [ ] Prompt-injection adversarial tests
- [ ] Token/cost limits
- [ ] Failure state handling

## Stage 06 — Telegram editorial

- [ ] Private editor bot
- [ ] Authorized editor allow-list/identity
- [ ] Candidate card
- [ ] Approve / Watch / Reject
- [ ] Callback validation
- [ ] Audit trail

## Stage 07 — Telegram publishing

- [ ] Normalized ContentModel
- [ ] Telegram renderer
- [ ] Publisher adapter
- [ ] Idempotency key/constraint
- [ ] Duplicate publish regression tests

## Stage 08 — Scheduler/operations

- [ ] Collection schedule
- [ ] Score schedule
- [ ] Candidate queue policy
- [ ] AI daily budget
- [ ] retries/dead-letter state
- [ ] operational metrics

## Later

- [ ] Web catalog on `viberadar.ru`
- [ ] Analytics and attribution
- [ ] Instagram carousel/Reels pipeline
- [ ] OUTSCAN native integration after product readiness
- [ ] User watchlists
- [ ] Personalized Radar
- [ ] Community submissions

## Open decisions

- Choose SQL access layer after Stage 01 scaffold review: low-level `pg` vs a thin typed query layer.
- Choose exact Telegram bot library only when Stage 06 begins.
- Choose LLM provider/model only when Stage 05 begins.
- Decide public website framework when web catalog work begins; Astro remains preferred but is not an MVP dependency.
