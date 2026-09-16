# VibeRadar

**VibeRadar** is a technology-intelligence and opportunity-discovery platform for AI-assisted builders.

Canonical domain: `viberadar.ru`

## Product thesis

VibeRadar is not a mirror of GitHub Trending and not a generic technology-news feed. It discovers fast-moving developer tools, open-source projects, AI-native software, emerging product mechanics, and other signals, then explains whether they matter and what can realistically be built from them.

Core chain:

```text
SIGNAL -> TREND -> EXPLANATION -> BUILDABILITY -> OPPORTUNITY -> ACTION
```

The product answers four questions:

1. What is genuinely new or accelerating?
2. Why does it matter now?
3. Can a solo developer or small AI-assisted team build on it?
4. How can the signal be applied in a real product?

## Three product layers

### Radar Engine

Internal intelligence layer for source collection, normalization, entity matching, longitudinal snapshots, growth analysis, scoring, clustering, buildability, and opportunity detection.

### VibeRadar Media

Public distribution layer. Telegram is first; `viberadar.ru` is the canonical web surface; Instagram and other channels are derived from approved content later.

### VibeRadar Intelligence

Future SaaS/API layer: watchlists, personal radars, alerts, filters, project applicability, team intelligence, API access, and agent-facing interfaces such as MCP.

## Primary audience

- solo developers
- vibe coders
- indie hackers
- small studios
- product founders
- technical product managers
- AI-assisted development teams

Initial editorial focus remains solo builders, vibe coders, and indie hackers.

## Core intelligence modules

- Source ingestion and normalization
- Entity matching and deduplication
- Longitudinal repository snapshots
- Trend Velocity and acceleration
- VIBE SCORE
- Confidence score
- Buildability assessment (`SOLO_MVP`, `SMALL_TEAM`, `TEAM_REQUIRED`)
- Product Mechanic Radar
- Opportunity Engine
- Agent Radar
- AI-assisted analysis with source traceability
- Editorial queue with explicit human approval
- Daily and weekly radar outputs

## Product principles

- Popularity is not the same as importance.
- Reach is displayed separately from VIBE SCORE.
- Growth velocity is evaluated relative to project age/category where possible.
- AI analysis never replaces source evidence.
- Low evidence must produce low confidence, not confident prose.
- Sponsored, partner, or first-party content never affects scoring or ranking.
- Initial publication always requires trusted editor approval.
- Raw evidence and generated analysis are stored separately.
- Security and abuse risk are part of product evaluation.

## MVP

The first production slice focuses on a narrow end-to-end loop:

1. GitHub ingestion
2. repository snapshots
3. growth history
4. normalization and deduplication
5. VIBE SCORE + confidence
6. buildability
7. bounded AI analysis
8. source/fact-check evidence
9. private Telegram editor bot
10. manual approval
11. idempotent Telegram publishing
12. minimal `viberadar.ru` radar/project pages
13. daily and weekly radar generation

Instagram, user accounts, personalized feeds, Product Mechanic Radar automation, Opportunity Engine automation, and paid intelligence are post-MVP layers.

## Architecture direction

VibeRadar starts as a modular TypeScript application with a separate worker process, not as microservices.

Baseline direction:

- Node.js 24+
- TypeScript
- Next.js for web/application surfaces
- PostgreSQL
- Drizzle ORM
- Zod
- Vitest
- background worker/jobs
- Telegram Bot API
- AI-provider abstraction
- Docker Compose for local infrastructure

The public website is part of the product architecture, but the first implementation priority remains ingestion -> intelligence -> editorial -> publishing.

## Security model

External source content and model output are untrusted. The LLM cannot publish, execute discovered code, modify scoring policy, or authorize actions. Publication requires deterministic backend checks and a trusted editor decision.

See `docs/SECURITY.md`.

## OUTSCAN

OUTSCAN is the native security-expertise layer for relevant VibeRadar content, not an advertising override. It may contribute security context and later approved calls to action, but it never affects VIBE SCORE, Trend Velocity, candidate selection, or editorial ranking.

See `docs/OUTSCAN_INTEGRATION.md`.

## Repository documentation

- `AGENTS.md` - binding development instructions
- `plan.md` - current implementation plan
- `CHANGELOG.md` - durable project changes
- `docs/PRODUCT.md` - canonical product contract
- `docs/ARCHITECTURE.md` - module/runtime boundaries
- `docs/DATA_MODEL.md` - canonical data model
- `docs/GITHUB_DISCOVERY.md` - GitHub discovery rules
- `docs/SOURCES_AND_TRUST.md` - evidence tiers and fact-check policy
- `docs/VIBE_SCORE.md` - score/velocity contract
- `docs/AI_ANALYSIS.md` - AI trust boundary
- `docs/CONTENT_MODEL.md` - normalized content model
- `docs/EDITORIAL_PIPELINE.md` - review/publish lifecycle
- `docs/PRODUCT_MECHANIC_RADAR.md` - emerging-mechanic detection
- `docs/OPPORTUNITY_ENGINE.md` - signal-to-product-opportunity contract
- `docs/MVP_SCOPE.md` - implementation boundary and acceptance criteria
- `docs/SECURITY.md` - security invariants
- `docs/OUTSCAN_INTEGRATION.md` - OUTSCAN integration rules
- `docs/ROADMAP.md` - staged delivery

## Graphify

Do not initialize Graphify for documentation-only work. After the first meaningful source/module structure exists, evaluate project-scoped Graphify integration and record the result in `plan.md`.
