# Product Mechanic Radar

## Purpose

Product Mechanic Radar detects repeated mechanics across otherwise independent projects, launches, platform changes, and developer tools.

The goal is not to label every similarity as a trend. It is to identify repeated interaction, infrastructure, workflow, or monetization patterns early enough to be useful.

## Example

Independent signals may include:

- browser-agent human takeover
- approval checkpoints
- remote-control handoff
- privileged action confirmation

These may cluster into a mechanic such as:

`Human takeover for autonomous agents`

## Canonical mechanic fields

- stable mechanic id
- canonical name
- short description
- first observed timestamp
- last observed timestamp
- supporting signal ids
- supporting project ids
- independent-source count
- velocity
- confidence
- lifecycle stage
- affected categories
- practical implications
- risks/limitations

## Lifecycle

Use four states:

- `SPARK` — weak but distinct early pattern
- `RISING` — repeated pattern with increasing independent evidence
- `BREAKOUT` — broad and rapidly expanding adoption
- `ESTABLISHED` — common, no longer an early-signal mechanic

Transitions are deterministic policy outputs where possible. LLMs may propose a cluster or label, but cannot directly promote lifecycle state without validated evidence.

## Detection approach

Initial versions may use analyst/editor-assisted clustering. Later automation may combine:

- normalized tags/categories
- semantic similarity
- feature/mechanic extraction from project evidence
- cross-source co-occurrence
- time-window concentration
- growth of independent implementations

## Anti-patterns

Do not classify as a mechanic when evidence is only:

- multiple forks of the same repository
- copied marketing language
- a single vendor launching multiple related products
- a generic technology category without a concrete repeated behavior

## Publication threshold

A public mechanic card should normally require:

- at least two genuinely independent implementations/signals;
- source traceability;
- non-low confidence;
- a concise explanation of what is repeated;
- evidence that the pattern matters to builders.

## Relationship to VIBE SCORE

Mechanic lifecycle and velocity are separate from repository VIBE SCORE. A high-score project may create an early mechanic signal, but cannot by itself establish a trend.

The initial implementation validates bounded proposals, groups evidence by `independence_group`, and derives lifecycle/confidence deterministically. LLM/editor proposals can create evidence for review, but public mechanic cards remain deferred until traceability and threshold checks are connected to a public surface.
