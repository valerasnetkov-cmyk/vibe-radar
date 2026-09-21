# GitHub Discovery — Vibe Radar

## 1. Goal

Discover high-signal repositories early enough that Vibe Radar is useful before a project becomes universally known.

## 2. Sources for MVP

GitHub is the first provider. Discovery may use:

- repository search by creation/update window;
- relevant topics;
- curated watchlists of ecosystems/organizations;
- release monitoring for previously known repositories.

Initial topic families:

- `ai`
- `llm`
- `agent`
- `agents`
- `mcp`
- `developer-tools`
- `automation`
- `self-hosted`
- `devtools`

Topic lists are configuration/data, not hard-coded editorial truth.

## 3. Discovery is read-only

The GitHub integration for discovery must not require repository write permissions.

The system must never:

- create issues/PRs;
- push code;
- execute repository code;
- download and run binaries from discovered projects.

## 4. Normalization

Normalize provider data into the internal `Repository` contract. Provider response shape must not leak throughout business logic.

## 5. Snapshots

Refresh selected known repositories on a bounded schedule and append `RepositorySnapshot` observations.

Never derive growth from a single current-star value.

## 6. Rate limits and failures

Required behavior:

- authenticated requests where appropriate;
- explicit request timeout;
- bounded concurrency;
- bounded retries for transient failures;
- respect provider rate-limit headers/state;
- stop/back off rather than burn remaining quota;
- persist normalized operational outcome without secrets.

## 7. Discovery provenance

Each discovered/updated repository should retain why it was seen:

- query/topic;
- watchlist;
- release refresh;
- manual seed;
- later external source.

## 8. Evidence capture

For primary GitHub observations used beyond discovery:

- persist a normalized `EvidenceItem` linked to the originating `SourceEvent`;
- keep bounded normalized facts instead of copying arbitrary provider text when possible;
- assign an `independence_group` where forks, mirrors, or copied material could otherwise look independent;
- do not treat a discovery event as automatic support for every later analytical claim.

Detailed claim/evidence behavior is defined in `docs/EVIDENCE_MODEL.md`.

## 9. Candidate volume control

Discovery volume and AI analysis volume are different.

A target operating shape may be:

```text
hundreds discovered/day
→ all cheaply normalized/scored
→ small top subset becomes candidates
→ only top candidate subset goes to LLM
```

The exact thresholds remain configurable and should be calibrated from observed data.
