# Roadmap — VibeRadar

## Phase A — Core MVP

### Stage 00 — Product and implementation specification

Completed documentation contracts:

- product and audience
- architecture
- source trust/provenance
- data model and database schema
- scoring/confidence
- buildability
- AI trust boundary
- editorial/publishing
- security
- web visual system
- jobs/pipeline
- operations/deployment
- test strategy
- OUTSCAN separation

### Stage 01 — Foundation

- Node.js 24+ / TypeScript / pnpm
- Next.js App Router application shell
- separate worker entry point
- PostgreSQL + Drizzle
- explicit migrations
- validated configuration
- health/readiness
- local Docker Compose
- lint/typecheck/test/build
- first light/minimal shell with no fake product data

### Stage 02 — GitHub discovery

- read-only GitHub provider adapter
- configured search/watch discovery
- source-event provenance
- primary EvidenceItem capture for discovery observations
- evidence independence grouping
- project/provider identity normalization
- snapshots
- releases
- rate-limit handling
- bounded retry/timeout/concurrency

### Stage 03 — Growth engine

- 2h/24h/7d deltas
- percent growth
- acceleration
- project age/freshness context
- activity metrics
- missing-window handling
- reach separated from velocity

### Stage 04 — VIBE SCORE + confidence

- deterministic versioned score
- penalties
- component breakdown
- confidence model
- candidate policy
- 7/30-day calibration hooks

### Stage 05 — Buildability

- dimension schema
- `SOLO_MVP`
- `SMALL_TEAM`
- `TEAM_REQUIRED`
- constraints/explanation
- separate buildability provenance

### Stage 06 — Evidence + AI analysis

- ResearchRun lifecycle/reproducibility metadata
- typed Claim records
- EvidenceItem links with support/contradiction semantics
- claim verification state
- bounded evidence projection
- structured output schema
- prompt/model versioning
- claim-level source traceability
- prompt-injection negative tests
- cost/token budget
- explicit failure state

### Stage 07 — Telegram editorial

- private editor bot
- trusted editor authorization
- candidate evidence card
- approve/watch/reject
- callback/state validation
- audit trail

### Stage 08 — Publishing + minimal web

- normalized ContentModel
- idempotent Telegram publishing
- publication attempts/audit
- `viberadar.ru` radar overview
- project pages
- methodology page
- evidence/source rendering
- strict light minimal UI from `docs/WEB_UI.md`

### Stage 09 — Operations

- scheduler/worker claims
- bounded retries/dead-letter-equivalent state
- operational metrics
- daily radar
- weekly radar
- basic publication analytics
- production deployment
- backup/restore verification

## Priority interpretation

- **P0:** Stages 01-06. Build the native deterministic discovery, scoring, buildability, evidence, and analysis core.
- **P1:** Stages 07-09. Make the system operational through trusted editorial review, publishing, web surfaces, and measurable operations.
- **P2:** Stages 10-11. Add Product Mechanic Radar and Opportunity Engine only after the core loop produces useful candidates consistently.

External agent runtimes and model routers are optional experiments behind the adoption gates in `docs/REFERENCE_REPOSITORIES.md`.

## Phase B — Intelligence expansion

### Stage 10 — Product Mechanic Radar

- mechanic extraction proposals
- independent-evidence grouping
- editor-assisted clustering
- lifecycle: `SPARK / RISING / BREAKOUT / ESTABLISHED`
- mechanic confidence/velocity
- public mechanic surfaces

### Stage 11 — Opportunity Engine

- evidence-linked opportunity generation
- 1-3 opportunity cap
- RU/GLOBAL scope
- opportunity confidence
- differentiation hypothesis
- buildability reuse
- public opportunity surfaces

### Additional sources

Add only after GitHub scoring quality can be measured:

- Product Hunt
- YC
- major engineering/platform sources
- community discovery sources with explicit trust tiers
- RU ecosystem sources where useful

## Phase C — Multi-channel

- Instagram carousel renderer from approved content
- Instagram publishing
- Reels/Shorts pipeline only from approved ContentPiece records after editorial quality is stable
- preserve a review gate for generated visual/video artifacts before automatic distribution is considered
- richer SEO/editorial surfaces

## Phase D — Personal intelligence

- user accounts only when needed
- watchlists
- topic/project preferences
- personalized radar
- Apply to your project
- saved opportunities
- team/B2B intelligence

## Phase E — Agent-facing product

- public/partner API
- VibeRadar MCP
- agent discovery queries
- experimental Agent Preference Index kept separate from VIBE SCORE

## Phase F — OUTSCAN

Only after corresponding OUTSCAN capabilities are ready:

- contextual security layer
- native security notes for relevant content
- campaign attribution
- approved OUTSCAN Check format

OUTSCAN never affects VIBE SCORE, confidence, velocity, candidate selection, or editorial ranking.
