# Evidence Model — VibeRadar

## Purpose

VibeRadar must be able to answer not only "what did the model say?" but also:

- what exact statement is being asserted;
- what source observation supports it;
- what contradicts it;
- whether apparently independent sources share one origin;
- what data/model/prompt versions were available when the analysis was produced;
- how the published copy can be reproduced or rechecked later.

This contract is inspired by reproducible-research patterns, but VibeRadar remains its own implementation and system of record.

## Core chain

```text
Source
  -> SourceEvent
  -> EvidenceItem
  -> Claim
  -> Verification
  -> Analysis
  -> EditorialDecision
  -> ContentPiece
```

A `ResearchRun` records the lineage around claim/evidence assembly and analysis.

## Non-negotiable separation

The following are different objects:

1. source observation;
2. normalized evidence;
3. claim;
4. deterministic metric;
5. model interpretation;
6. human editorial decision;
7. published content.

Persisting one does not convert it into another.

## ResearchRun

A `ResearchRun` is an auditable execution envelope.

Examples:

- verify a newly discovered repository;
- research a candidate before editorial review;
- re-check an old claim after a new release;
- investigate contradictory sources;
- re-run analysis with a newer prompt/model.

Suggested fields:

- `id`
- subject type/id
- `run_type`
- initiator type/id
- input snapshot/source-event references
- analyzer/provider/prompt versions when applicable
- `started_at`
- `completed_at`
- `status`
- bounded cost/token metadata
- normalized failure metadata

A ResearchRun is provenance, not proof.

## Claim

A `Claim` is the unit that VibeRadar evaluates.

Canonical types:

### OBSERVED_FACT

Directly established by primary/provider evidence.

Examples:

- repository star count at a timestamp;
- release publication time;
- declared license identifier.

### PROJECT_AUTHOR_CLAIM

A statement made by the project/vendor.

Examples:

- "supports local models";
- "reduces token usage";
- "works offline".

VibeRadar may report such a statement with attribution without treating it as independently verified.

### DERIVED_METRIC

Calculated by VibeRadar from stored observations.

Examples:

- 24h star delta;
- acceleration;
- VIBE SCORE component.

The algorithm/version is part of provenance.

### MODEL_INTERPRETATION

Analytical interpretation produced by AI.

Examples:

- likely audience;
- why the project matters;
- architectural similarity.

It must never be presented as a sourced fact.

### OPPORTUNITY_HYPOTHESIS

Product/business idea derived from one or more signals.

It is explicitly speculative and must not affect evidence confidence.

## EvidenceItem

An `EvidenceItem` is a bounded source-backed observation.

Suggested fields:

- stable source/source-event reference;
- URL or provider identifier;
- retrieval/observation timestamp;
- trust tier;
- normalized fact payload or bounded excerpt;
- content hash/reference when useful;
- parser/provider version;
- `independence_group`.

Do not store arbitrary source text when a normalized fact is sufficient.

## ClaimEvidence relation

Relation values:

- `SUPPORTS`
- `CONTRADICTS`
- `CONTEXT`

A claim may have multiple supporting and contradicting items.

Do not delete contradictions merely because a later editorial decision prefers one interpretation.

## Verification states

Recommended initial states:

- `UNVERIFIED`
- `SUPPORTED`
- `PARTIAL`
- `CONTRADICTED`
- `NOT_APPLICABLE`

Verification is not the same as confidence.

Confidence may use verification state as an input, but VIBE SCORE must remain independent of commercial/editorial interests.

## Independence groups

Different URLs are not automatically independent evidence.

Treat these as potentially one origin:

- forks;
- mirrors;
- reposts;
- syndicated articles;
- copied release notes;
- social posts that only repeat one announcement.

An `independence_group` lets confidence logic avoid double-counting repeated material.

## Reproducibility

For every high-value candidate analysis, preserve enough metadata to answer later:

1. Which project/signal/snapshot was analyzed?
2. Which source events were available?
3. Which claims existed?
4. Which evidence supported/contradicted them?
5. Which deterministic score/buildability versions were used?
6. Which model/provider/prompt version was used?
7. What validation result was produced?
8. Which editor decision approved/rejected the candidate?

Exact raw payload retention is policy-driven; reproducibility does not require storing unlimited external content.

## AI boundary

The model receives a bounded evidence package.

The model may:

- summarize;
- classify;
- explain;
- propose use cases;
- identify missing evidence;
- propose claims for verification.

The model may not:

- mark its own unsupported statement as source evidence;
- change deterministic metrics;
- change scoring policy;
- approve publication;
- execute a discovered repository;
- fetch arbitrary URLs outside approved provider boundaries;
- mutate canonical records directly.

## Editorial UI requirements

The editor should be able to distinguish visually:

- primary facts;
- project-author claims;
- VibeRadar-derived metrics;
- model interpretation;
- contradictions/missing evidence;
- opportunity hypotheses.

A candidate should not present one blended prose block as if every sentence had equal evidentiary status.

## MVP staging

### Stage 02

Implement:

- SourceEvent provenance;
- primary EvidenceItem capture;
- independence-group basics;
- project/snapshot linkage.

Do not build a general research-agent framework.

### Stage 06

Implement:

- ResearchRun lifecycle;
- typed Claim records;
- ClaimEvidence relations;
- verification states;
- bounded evidence projection;
- structured AI analysis tied back to claims/evidence.

## Acceptance checks

A Stage 06 implementation is not complete unless:

- a factual analysis statement can be traced to stored evidence;
- contradictory evidence can be represented;
- model/provider/prompt versions are recorded;
- a failed/malformed model response cannot create an approved candidate;
- rerunning research does not overwrite historical run lineage;
- generated interpretation remains distinguishable from source evidence.
