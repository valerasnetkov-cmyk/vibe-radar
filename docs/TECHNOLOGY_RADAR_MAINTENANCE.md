# Technology Radar Maintenance — VibeRadar

## Purpose

Keep `TECHNOLOGY_RADAR.md` and `REFERENCE_REPOSITORIES.md` useful as a curated technology-intelligence backlog rather than a mirror of daily GitHub Trending.

## Canonical roles

- `TECHNOLOGY_RADAR.md` — fast-moving research priorities, experiments and product ideas.
- `REFERENCE_REPOSITORIES.md` — canonical adoption register and durable status of reviewed external projects.

A project may appear in the technology radar before it deserves a canonical reference entry.

## Update cadence

Primary cadence: weekly GitHub Radar.

Do not commit every daily discovery.

Update the repository when:
- a project remains relevant after the weekly comparison;
- a new architecture/product pattern emerges;
- a candidate becomes suitable for a measured pilot;
- a previous candidate is superseded;
- a license/security/maintenance change affects the decision;
- a VibeRadar bottleneck creates a concrete reason to test a tool.

## Selection criteria

Use a combination of:
- repository age/freshness;
- sustained star velocity, not one-hour virality;
- commits/PR/issues/release activity;
- external discussion/independent validation;
- architectural novelty;
- practical fit for VibeRadar;
- maturity and operational cost;
- license/commercial usability.

Popularity alone is insufficient.

## Promotion path

### New discovery -> TECHNOLOGY_RADAR

Add only when there is a concrete VibeRadar mapping:
- research/evidence;
- memory/intelligence;
- source acquisition;
- editorial workflow;
- deterministic media;
- agent UI;
- developer productivity;
- deployment/operations.

### TECHNOLOGY_RADAR -> REFERENCE_REPOSITORIES

Require:
- durable relevance beyond a daily/weekly spike;
- a named adoption status;
- a defined use case;
- hard boundaries;
- pilot trigger or explicit no-adoption decision.

### Reference -> runtime pilot

A pilot must specify:
- baseline/native path;
- measurable hypothesis;
- test dataset/workflow;
- cost/latency/reliability metrics;
- security and privacy boundary;
- rollback/removal path.

The pilot must not replace PostgreSQL or trusted editorial state.

## VibeRadar invariants

External projects never:
- change VIBE SCORE directly;
- change Confidence directly;
- create trusted Claim verification;
- approve editorial content;
- publish automatically;
- execute discovered repositories;
- obtain unrestricted GitHub/Telegram/infrastructure credentials.

External output remains untrusted until normalized and validated by VibeRadar-owned code/workflows.

## Weekly curation rules

Prefer a short high-signal register.

Each weekly review should decide:
- **add** — genuinely new durable candidate;
- **promote** — stronger evidence or newly relevant bottleneck;
- **demote/remove** — stale/superseded/no longer useful;
- **merge** — combine duplicate projects into one technology family;
- **no change** — when none deserve repository updates.

For example, several decision-model repositories should normally remain one technology family unless one becomes a real pilot candidate.

## Media-specific rule

Media tools move toward a pilot only when they support the desired chain:

```text
Approved ContentPiece
  -> bounded source-backed script
  -> VibeRadar style package
  -> deterministic/controlled render
  -> automated QA
  -> human review
  -> publication
```

A tool that bypasses factual/source review or human approval is not a production candidate.

## Research-memory rule

Memory systems are evaluated against native VibeRadar history.

Measure:
- recall quality;
- unsupported-claim rate;
- evidence traceability;
- editorial time saved;
- operating cost;
- ability to correct/forget superseded conclusions.

Memory is context, not canonical truth.

## Preferred commit shape

Weekly curation:
- one docs branch;
- update `TECHNOLOGY_RADAR.md`;
- update `REFERENCE_REPOSITORIES.md` only for durable status changes;
- do not change runtime code in the same PR.

Commit example:

```text
docs: curate weekly technology radar
```

## Handoff to Codex

```text
Review the validated GitHub Radar findings for the last 7 days against:
- docs/TECHNOLOGY_RADAR.md
- docs/REFERENCE_REPOSITORIES.md
- docs/TECHNOLOGY_RADAR_MAINTENANCE.md

Do not copy the daily digest.
Curate only durable changes.
Keep PostgreSQL, deterministic scoring and editorial approval authoritative.
For every add/promote/demote/remove, state the evidence and VibeRadar-specific reason.
Do not modify runtime code as part of radar maintenance.
```
