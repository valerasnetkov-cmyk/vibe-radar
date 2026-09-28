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

Proposals are validated, evidence is resolved against persisted records, and public cards require the eligibility gate below.

## Trust boundary (Stage 10)

Proposals supply only names, prose, categories, and evidence references
(project, source event, signal, bounded strength, rationale). Independence
groups, lifecycle stage, velocity, confidence, public status, and approval
are never accepted from proposal input. Unknown references are skipped
deterministically; duplicate submissions share canonical and evidence keys
and cannot inflate anything.

## Velocity formula v1

Over resolved independent groups with a 30-day recent window (`R` recent
groups, `N` newly formed groups, `G` total groups):

```text
velocity = round(min(100, max(0, 40 * R/G + 60 * min(1, N/3))))
```

Zero groups score zero. Duplicate observations of one group add nothing.
Stale-only evidence scores zero because nothing recent is expanding.

## Confidence formula v1

```text
confidence = round(min(100, max(0,
  30 * min(1, G/2) + 25 * min(1, G/5) + 15 * min(1, E/6)
  + (R >= 1 ? 10 : 0) - min(20, U * 10))))
```

`E` counts resolved evidence rows, `U` counts unresolved/skipped rows. No
VIBE SCORE, stars, marketing claims, OUTSCAN relevance, approval, or model
prose enters the formula. Mechanic confidence is distinct from project
confidence.

## Lifecycle policy v1

- `ESTABLISHED`: at least 5 independent groups observed over at least 90 days.
- `BREAKOUT`: at least 5 independent groups with velocity at least 70.
- `RISING`: at least 3 independent groups with at least 2 active recently.
- `SPARK`: everything else.

Low velocity alone never promotes to `ESTABLISHED`. Reassessment keeps the
maximum of the current and computed stage, so lifecycle never regresses
silently; corrections go through archive plus explicit review.

## Review and public threshold

Reviews are append-only `APPROVE`/`REJECT` records that never touch metrics.
Public visibility additionally requires `ACTIVE` status, a latest `APPROVE`
review, at least 2 independent groups, confidence at least 50, traceable
HTTP(S) project sources, and valid name/description. A later `REJECT` hides
the mechanic immediately. Operator CLIs (`mechanics:propose`,
`mechanics:review`) are the only write path; no public review API exists and
no automatic AI promotion is performed. Mechanics never affect VIBE SCORE,
project confidence, candidate ranking, or project publication approval.
