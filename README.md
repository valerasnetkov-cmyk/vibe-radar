# Vibe Radar

**Vibe Radar** is an automated media and discovery system for vibe coding, AI development, developer tools, and noteworthy open-source/GitHub projects.

Canonical domain: `viberadar.ru`

## Product idea

Vibe Radar is not a mirror of GitHub Trending. The core asset is a time-series dataset plus a transparent **VIBE SCORE** that prioritizes projects by growth velocity, relevance, freshness, activity, documentation quality, community signals, and originality.

Primary loop:

```text
GitHub sources
→ collect
→ normalize
→ snapshots
→ growth metrics
→ VIBE SCORE
→ candidate selection
→ bounded AI analysis
→ editorial review
→ publish
→ analytics
```

## MVP scope

MVP focuses on Telegram and the editorial pipeline:

1. collect GitHub repositories;
2. store repository snapshots;
3. calculate growth metrics;
4. calculate VIBE SCORE v1;
5. analyze only top candidates with an LLM;
6. send candidates to a private Telegram editorial bot;
7. require explicit editor approval;
8. publish idempotently to a Telegram channel.

Not in MVP critical path:

- Instagram publishing;
- public web catalog;
- personalized feeds;
- community submissions;
- automatic execution of discovered repositories;
- public OUTSCAN integration.

## Planned stack

- Node.js 24+
- TypeScript
- pnpm
- Fastify
- PostgreSQL
- Zod
- Vitest
- Docker Compose

Additional dependencies must be justified by the stage being implemented.

## Canonical surfaces

Planned DNS/application layout:

- `viberadar.ru` — public website/catalog later;
- `api.viberadar.ru` — API later;
- `admin.viberadar.ru` — optional editor/admin surface later.

Telegram is the first publishing surface.

## Security model

GitHub content and model output are untrusted. The LLM cannot publish, execute code, change policy, or authorize actions. Publication requires deterministic backend checks and a trusted editor decision.

See `docs/SECURITY.md`.

## OUTSCAN

OUTSCAN is a later native integration for deployment/security-related content. It remains feature-flagged off until the required OUTSCAN product gates are ready. OUTSCAN never affects VIBE SCORE or editorial ranking.

See `docs/OUTSCAN_INTEGRATION.md`.

## Repository documentation

- `AGENTS.md` — binding development instructions;
- `plan.md` — current implementation plan;
- `CHANGELOG.md` — durable project changes;
- `docs/PRODUCT.md` — product contract;
- `docs/ARCHITECTURE.md` — module boundaries;
- `docs/DATA_MODEL.md` — data model;
- `docs/GITHUB_DISCOVERY.md` — discovery rules;
- `docs/VIBE_SCORE.md` — score contract;
- `docs/AI_ANALYSIS.md` — AI boundary;
- `docs/CONTENT_MODEL.md` — normalized content model;
- `docs/EDITORIAL_PIPELINE.md` — review/publish lifecycle;
- `docs/SECURITY.md` — security invariants;
- `docs/OUTSCAN_INTEGRATION.md` — future OUTSCAN integration;
- `docs/ROADMAP.md` — staged delivery.

## Graphify

Do not initialize Graphify for this documentation-only bootstrap. After Stage 01 creates a meaningful source/module structure, evaluate project-scoped Graphify integration and record the result in `plan.md`.
