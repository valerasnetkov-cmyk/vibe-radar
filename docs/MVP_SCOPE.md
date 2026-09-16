# MVP Scope — VibeRadar

## Objective

Ship the smallest end-to-end system that proves VibeRadar can discover, score, explain, review, and publish high-signal developer projects without becoming a generic GitHub feed.

## In scope

1. GitHub repository ingestion
2. repository normalization
3. longitudinal snapshots
4. growth deltas and acceleration
5. duplicate/entity handling
6. VIBE SCORE v1
7. confidence calculation
8. buildability classification
9. bounded AI analysis
10. source/provenance display
11. private Telegram editorial bot
12. explicit human approval
13. idempotent Telegram publishing
14. minimal `viberadar.ru` project/signal pages
15. daily radar generation
16. weekly radar generation
17. basic publication analytics

## Out of scope

- Instagram automation
- public user accounts
- personalized feeds
- paid subscriptions
- community submissions
- fully automated Product Mechanic Radar
- fully automated Opportunity Engine
- Agent Preference Index
- public API/MCP
- autonomous execution of discovered repositories
- security scanning of arbitrary third-party targets

## Acceptance criteria

### Discovery

- the collector can ingest configured GitHub queries/sources without duplicate repository identities;
- each observation preserves provenance and timestamp;
- rate limits, retries, and provider failures are bounded.

### Growth

- snapshots support deterministic delta calculations;
- missing observation windows do not silently create false acceleration;
- score inputs are reproducible from stored data.

### Scoring

- VIBE SCORE is versioned;
- score components are inspectable;
- total reach is stored/displayed separately from score;
- confidence is separate from score;
- deterministic scoring logic has automated tests.

### Buildability

- substantial candidates receive one of `SOLO_MVP`, `SMALL_TEAM`, `TEAM_REQUIRED`;
- the classification preserves an explanatory breakdown rather than only a final label.

### AI analysis

- only bounded, normalized data is provided to the model;
- output uses a strict schema;
- provider/model/prompt version are recorded;
- missing facts are not invented;
- generated interpretation remains distinguishable from source evidence.

### Editorial

- only authorized editors can approve;
- approval/rejection/watch decisions are auditable;
- model output cannot publish directly.

### Publishing

- publication is idempotent;
- repeated jobs/callbacks cannot produce duplicate channel posts;
- published content links back to canonical evidence/project pages when available.

### Web

- `viberadar.ru` can render a minimal radar/project record with score, confidence, momentum/buildability, analysis, and sources;
- the web surface does not block Telegram-first delivery.

## MVP success test

The MVP is successful when it can repeatedly produce a small number of genuinely useful, source-backed candidates with less editorial effort than manual discovery, while avoiding duplicate/noisy publication and preserving enough historical data to evaluate scoring quality after 7 and 30 days.
