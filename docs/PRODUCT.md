# Product — VibeRadar

## 1. Mission

Help AI-assisted builders discover important technology shifts early, understand why they matter, and convert them into concrete implementation or product opportunities.

## 2. Positioning

VibeRadar is a technology-intelligence and opportunity-discovery platform, not a generic technology feed and not a mirror of GitHub Trending.

Its core chain is:

```text
SIGNAL -> TREND -> EXPLANATION -> BUILDABILITY -> OPPORTUNITY -> ACTION
```

VibeRadar must answer:

1. What is genuinely new or accelerating?
2. Why does it matter now?
3. Can a solo developer or small AI-assisted team build on it?
4. What practical product or implementation opportunity follows from the signal?

## 3. Product layers

### Radar Engine

Internal intelligence engine responsible for:

- source ingestion;
- normalization;
- entity matching and deduplication;
- longitudinal snapshots;
- velocity/acceleration metrics;
- VIBE SCORE and confidence;
- trend clustering;
- buildability assessment;
- product-mechanic detection;
- opportunity generation.

### VibeRadar Media

Distribution layer for approved intelligence:

- Telegram first;
- `viberadar.ru` as canonical web surface;
- Instagram derived from approved content later;
- other channels only after the core pipeline is reliable.

### VibeRadar Intelligence

Future productized intelligence layer:

- watchlists;
- alerts;
- personal radars;
- filters;
- project applicability;
- team intelligence;
- API;
- agent/MCP access.

## 4. Primary audiences

Initial priority:

- solo developers;
- vibe coders;
- indie hackers.

Secondary audiences:

- small studios;
- product founders;
- technical product managers;
- AI-assisted product/development teams;
- DevSecOps/security users evaluating emerging tooling.

## 5. Editorial/intelligence themes

- coding agents;
- browser agents;
- MCP and agent APIs;
- agent infrastructure;
- agent security;
- AI developer tooling;
- automation;
- self-hosted software;
- web/SaaS tooling;
- developer infrastructure;
- UI/dev experience;
- practical cybersecurity tooling for builders;
- new product mechanics appearing across multiple launches.

## 6. Canonical intelligence outputs

Every substantial signal should be able to expose:

- what appeared;
- why it matters;
- evidence/sources;
- growth/velocity;
- VIBE SCORE;
- confidence;
- buildability;
- limitations/risks;
- related projects;
- underlying mechanic, when present;
- 1-3 plausible product opportunities, when evidence supports them;
- market relevance (`RU`, `GLOBAL`, or both);
- applicability to a user's project in later personalized versions.

## 7. Buildability

Each substantial signal may receive one implementation label:

- `SOLO_MVP`
- `SMALL_TEAM`
- `TEAM_REQUIRED`

The label must be derived from dimensions such as frontend/backend complexity, infrastructure, external APIs, AI dependency, auth, billing, data requirements, security, real-time requirements, mobile, compliance, and operations.

It is not a generic difficulty label. It estimates whether the core product value can be implemented by the stated team shape, including realistic AI/Codex assistance.

## 8. Trend stages

Mechanics and broader trends use a simple lifecycle:

- `SPARK`
- `RISING`
- `BREAKOUT`
- `ESTABLISHED`

Stage changes must be evidence-based and independently stored from prose analysis.

## 9. Editorial formats

- `Trending` — fast growth now
- `Fresh` — young project with unusual traction
- `Release` — meaningful release
- `Hidden Gem` — strong relevance/quality with modest reach
- `Watch` — follow-up on a previously discovered signal
- `Mechanic` — repeated product/technology mechanic
- `Opportunity` — concrete build opportunity derived from evidence
- `Comparison` — factual comparison later
- `Vibe Review` — community submission later
- `Security Angle` — security context for relevant tooling

## 10. Product principles

- Signal over volume.
- Explainable ranking over opaque hype.
- Longitudinal data over one-time snapshots.
- Popularity/reach is not VIBE SCORE.
- Evidence and generated interpretation are separate records.
- Low evidence produces low confidence.
- Human editorial control precedes publication in the initial product.
- Sponsored, partner, or first-party content cannot affect scoring/ranking.
- The system must preserve source traceability.
- Security and abuse risks are part of practical usefulness.

## 11. North-star quality concept

Audience size is not the primary product-quality metric.

The product should optimize toward a `Useful Signal Rate`: the share of surfaced signals that lead to meaningful downstream actions such as open, save, follow, revisit, or application to a project.

Scoring quality must also be calibrated retrospectively: projects/signals with high scores should be reevaluated after 7/30 days to measure false positives and score drift.

## 12. MVP outcome

The first production version should consistently discover a small number of high-signal GitHub projects, explain why they matter, quantify current momentum, estimate buildability, provide source evidence, route the result through a trusted editor, and publish it idempotently to Telegram while maintaining a minimal canonical web record.

## 13. Post-MVP expansion

Order of expansion:

1. Product Mechanic Radar automation
2. Opportunity Engine automation
3. additional source classes beyond GitHub
4. richer `viberadar.ru` discovery
5. Instagram generation from approved content
6. watchlists and personalized radar
7. Agent Preference experiments
8. API / MCP intelligence
9. team/B2B intelligence
