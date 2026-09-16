# Roadmap — Vibe Radar

## Phase A — Telegram-first MVP

### Stage 00 — Documentation

Product, architecture, data model, security, scoring, AI and editorial contracts.

### Stage 01 — Foundation

- TypeScript/Fastify project shell
- PostgreSQL
- migrations
- config
- health/readiness
- tests/build/lint/typecheck

### Stage 02 — GitHub discovery

- read-only provider adapter
- search/watchlist discovery
- normalization
- snapshots
- provenance/rate limits

### Stage 03 — Growth engine

- 2h/24h/7d deltas
- percent growth
- acceleration
- freshness/activity

### Stage 04 — VIBE SCORE v1

- weighted deterministic score
- penalties
- explanation
- candidate policy

### Stage 05 — AI analyzer

- bounded project projection
- structured output
- injection tests
- cost budget

### Stage 06 — Telegram editor

- private editorial bot
- authorization
- candidate card
- approve/watch/reject

### Stage 07 — Telegram publisher

- ContentModel
- renderer
- idempotent publish
- audit trail

### Stage 08 — Operations

- schedules
- bounded retries
- metrics
- production Docker deployment

## Phase B — Owned media/data product

- `viberadar.ru` catalog
- project pages
- trending/new/category views
- project history charts/data
- search
- publication analytics

## Phase C — Multi-channel

- Instagram carousel renderer
- Instagram publishing
- Reels pipeline after editorial quality is stable
- website articles/SEO surfaces

## Phase D — Personalization/community

- user watchlists
- topic preferences
- personalized Radar digests
- community submissions
- creator/project owner flows

## Phase E — OUTSCAN

Only after required OUTSCAN readiness:

- contextual native CTA
- campaign attribution
- approved `OUTSCAN Check` editorial format
- later security-related creator workflows

OUTSCAN never becomes a VIBE SCORE signal.
