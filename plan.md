# VibeRadar — Plan

## Current status

Canonical product concept is documented. Runtime implementation has not started.

## Stage 00 — Product/architecture bootstrap

- [x] Product identity fixed: VibeRadar
- [x] Canonical domain fixed: `viberadar.ru`
- [x] Technology-intelligence positioning fixed
- [x] Three product layers defined: Radar Engine / Media / Intelligence
- [x] MVP boundary documented
- [x] Architecture documented
- [x] Data model expanded to signals/trends/mechanics/opportunities
- [x] VIBE SCORE v1 contract drafted
- [x] Source trust/fact-check policy documented
- [x] AI trust boundary documented
- [x] Editorial/publishing contract documented
- [x] Product Mechanic Radar contract documented
- [x] Opportunity Engine contract documented
- [x] OUTSCAN integration boundary documented
- [x] Initial Codex implementation path defined
- [x] Implementation specification documented
- [x] Database schema contract documented
- [x] Jobs/scheduling/retry contract documented
- [x] Strict light minimal web UI contract documented
- [x] Operations/deployment contract documented
- [x] Test strategy documented
- [x] Stage 01 Codex brief aligned with Next.js + worker architecture
- [x] Claim-level evidence/ResearchRun contract documented
- [x] External reference repositories and adoption gates documented

## Stage 01 — Foundation

- [ ] Initialize Node.js 24+/TypeScript/pnpm project
- [ ] Initialize Next.js application shell
- [ ] Add separate worker entry point
- [ ] Add validated configuration loader
- [ ] Add PostgreSQL + Drizzle boundary
- [ ] Add versioned migrations
- [ ] Add initial domain enums/types
- [ ] Add initial database schema
- [ ] Add health/readiness endpoints
- [ ] Add tests for config/schema/idempotency constraints where applicable
- [ ] Add Docker Compose for local PostgreSQL
- [ ] Add `.env.example`
- [ ] Add lint/typecheck/test/build commands
- [ ] Verify authored source files <=400 lines
- [ ] Evaluate Graphify after meaningful module structure exists

## Stage 02 — GitHub discovery

- [ ] Read-only GitHub API client
- [ ] Query/source strategy
- [ ] SourceEvent/provenance persistence
- [ ] Evidence-item capture for primary discovery observations
- [ ] Evidence independence-group rules
- [ ] Project/provider identity normalization
- [ ] Entity dedupe rules
- [ ] Snapshot persistence
- [ ] Release ingestion
- [ ] Provider rate-limit handling
- [ ] Bounded retries/timeouts

## Stage 03 — Growth engine

- [ ] Delta calculations (2h/24h/7d)
- [ ] Percentage growth
- [ ] Acceleration metric
- [ ] Repository age/freshness context
- [ ] Activity metrics
- [ ] Snapshot-gap handling
- [ ] Separate reach from velocity

## Stage 04 — VIBE SCORE + confidence

- [ ] Weighted VIBE SCORE v1
- [ ] Penalties
- [ ] Explainable component breakdown
- [ ] `score_version=1`
- [ ] Confidence model/version
- [ ] Candidate threshold policy
- [ ] Deterministic tests
- [ ] Retrospective 7/30-day calibration hooks

## Stage 05 — Buildability

- [ ] Define dimension schema
- [ ] Deterministic/structured assessment inputs
- [ ] `SOLO_MVP` / `SMALL_TEAM` / `TEAM_REQUIRED`
- [ ] Preserve explanation and constraints
- [ ] Separate buildability from VIBE SCORE

## Stage 06 — Evidence + AI analysis

- [ ] ResearchRun lifecycle and reproducibility metadata
- [ ] Claim model and claim-type separation
- [ ] EvidenceItem links with support/contradiction semantics
- [ ] Verification states and claim-level fact-check pass
- [ ] Bounded input projection
- [ ] Strict output schema
- [ ] Prompt versioning
- [ ] Provider/model provenance
- [ ] Source/evidence references on factual statements
- [ ] Prompt-injection adversarial tests
- [ ] Token/cost limits
- [ ] Failure-state handling

## Stage 07 — Telegram editorial

- [ ] Private editor bot
- [ ] Authorized editor allow-list/identity
- [ ] Candidate card
- [ ] Approve / Watch / Reject
- [ ] Callback validation
- [ ] Audit trail

## Stage 08 — Publishing + minimal web

- [ ] Normalized ContentModel
- [ ] Telegram renderer
- [ ] Telegram publisher adapter
- [ ] Publication idempotency key/constraint
- [ ] Duplicate-publish regression tests
- [ ] Minimal `viberadar.ru` radar/project pages
- [ ] Evidence/source rendering

## Stage 09 — Scheduler/operations

- [ ] Collection schedule
- [ ] Score schedule
- [ ] Candidate queue policy
- [ ] AI daily budget
- [ ] retries/dead-letter state
- [ ] operational metrics
- [ ] daily radar generation
- [ ] weekly radar generation
- [ ] basic publication analytics

## Stage 10 — Product Mechanic Radar

- [ ] Mechanic extraction proposal schema
- [ ] Independent-evidence grouping
- [ ] Editor-assisted clustering
- [ ] `SPARK / RISING / BREAKOUT / ESTABLISHED`
- [ ] Mechanic confidence/velocity
- [ ] Public mechanic cards

## Stage 11 — Opportunity Engine

- [ ] Signal/trend-to-opportunity input contract
- [ ] 1-3 opportunity cap
- [ ] market scope (`RU/GLOBAL`)
- [ ] opportunity confidence
- [ ] differentiation hypothesis
- [ ] buildability reuse
- [ ] public opportunity cards

## Experimental/reference integrations

These are not Stage 01 dependencies and must not become a second system of record.

- [ ] Pilot Hermes Agent only after the native discovery -> evidence -> analysis -> editorial loop works
- [ ] Evaluate DeepSeek Harness as an isolated Agent Lab after Stage 06
- [ ] Benchmark Ruflo only if multi-agent orchestration becomes a measured bottleneck
- [ ] Evaluate OmniRoute only after multiple AI providers create measurable routing/fallback/cost needs
- [ ] Reuse review-gate/content-pipeline patterns from YouTube automation after approved-content generation is stable
- [ ] Revisit Paperclip-style governance/budget patterns only for future agent operations

## Later

- [ ] Additional source providers beyond GitHub
- [ ] Richer web discovery/catalog
- [ ] Instagram carousel/Reels pipeline from approved content
- [ ] OUTSCAN native security-context integration after readiness gates
- [ ] User watchlists
- [ ] Personalized Radar / Apply to your project
- [ ] Agent Preference experiments
- [ ] Public API
- [ ] VibeRadar MCP / agent intelligence interface
- [ ] Team/B2B intelligence
- [ ] Community submissions

## Open decisions

- Choose exact background job mechanism during Stage 01; prefer simplest DB-backed/single-worker approach first.
- Choose exact Telegram bot library only when Telegram work begins.
- Choose LLM provider/model only when AI analysis begins.
- Keep the initial AI-provider abstraction native; add a router only after a measured multi-provider need.
- Choose any external agent/control-plane runtime only after the native VibeRadar pipeline has baseline quality/operational metrics.
- Decide authentication solution only when a user/admin surface requires it.
- Define first non-GitHub source only after GitHub ingestion/scoring quality is measurable.
