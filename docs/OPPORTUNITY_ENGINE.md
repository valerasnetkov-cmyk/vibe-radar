# Opportunity Engine

## Purpose

Opportunity Engine converts validated signals and trends into a small number of concrete product or implementation opportunities for AI-assisted builders.

It is not a generic startup-idea generator. Every opportunity must remain traceable to observed evidence.

## Input

An opportunity may be derived from:

- a high-signal project
- a confirmed product mechanic
- a broader technology trend
- a meaningful platform/API change

## Canonical output

Each opportunity should contain:

- source signal/trend ids
- problem or user need
- proposed product/mechanic
- target user
- market relevance: `RU`, `GLOBAL`, or both
- buildability label
- estimated implementation complexity
- required capabilities/dependencies
- key differentiation hypothesis
- major risks/constraints
- evidence/confidence

## Output policy

Prefer 1-3 strong opportunities over a long speculative list.

An opportunity is useful only when the system can explain:

1. why the enabling signal exists now;
2. which user/problem it could address;
3. what the smallest credible product is;
4. whether a solo developer or small team can build it;
5. why it is not merely a clone with no differentiation.

## Buildability

Use the same implementation labels as the wider product:

- `SOLO_MVP`
- `SMALL_TEAM`
- `TEAM_REQUIRED`

Assessment dimensions may include:

- frontend
- backend
- infrastructure
- integrations
- AI/model dependency
- authentication
- billing
- data requirements
- real-time requirements
- mobile
- security
- compliance
- operations

## Confidence

Opportunity confidence is not the same as signal confidence.

A source signal may be highly certain while a derived business/product opportunity remains speculative. Store both separately.

## Apply to your project

Later personalized versions may evaluate an opportunity against a user's declared project profile:

- stack
- domain
- market
- team shape
- existing capabilities
- risk constraints

Possible output classes:

- `APPLICABLE`
- `ADJACENT`
- `STANDALONE_OPPORTUNITY`
- `NOT_RELEVANT`

The system must explain the match instead of returning only a label.

## Editorial boundary

Opportunity text is analysis, not a factual claim. Public content should visually distinguish evidence about the underlying signal from the opportunity hypothesis derived from it.

The initial implementation validates strict opportunity proposals, caps a generation batch at three items, stores source evidence separately, and derives opportunity confidence independently from source confidence.

## Trust boundary (Stage 11)

Proposals carry bounded hypothesis prose plus evidence references only.
Confidence, source confidence, buildability identity/label, evidence weight,
status, publication state, review, and editor identity are never accepted
from proposal input and are rejected by the strict schema.

## Source resolution (Stage 11)

`PROJECT` sources require a published Stage 08 record (snapshot confidence
and URL); unpublished projects fail closed. `MECHANIC` sources must pass the
full Stage 10 public eligibility gate, never a bare `ACTIVE` check.
`SIGNAL`/`TREND` have no canonical persisted trust boundary: references fail
closed, never count toward confidence, and never become public evidence.
Unknown ids never count, and duplicate subjects dedupe with first rationale.

## Buildability reuse (Stage 11)

Buildability comes from the latest persisted assessment of every trusted
source project, aggregated to the most demanding label
(`SOLO_MVP < SMALL_TEAM < TEAM_REQUIRED`) anchored to its own assessment.
With zero trusted assessments the proposal returns `missing_buildability`
and can never go public. This is a source-derived feasibility prior, not a
guarantee that the proposed product has been engineered.

## Confidence formula v1

```text
confidence = round(min(90, max(0,
  35 * Q + 25 * min(1, S/3) + 20 * min(1, P/3)
  + 10 * B + 10 * min(1, M) - min(20, U * 10))))
```

`S` unique resolved subjects, `P` unique traceable projects, `M` eligible
mechanic sources, `Q` average trusted source confidence 0..1, `B`
buildability coverage 0..1, `U` unresolved references. Capped at 90 because
an opportunity is a hypothesis, not an observed fact. Differentiation
length, market scope, editor approval, VIBE SCORE, and OUTSCAN carry zero
weight.

## Review, publication, and public threshold (Stage 11)

Reviews are append-only `APPROVE`/`REJECT` and never touch metrics. An
explicit `publishOpportunity` transition re-checks eligibility from
PostgreSQL before flipping to `PUBLISHED` with a server timestamp; opportunity
cards are web-only. Public visibility needs `PUBLISHED` status, latest
`APPROVE`, confidence at least 55, resolved sources, present buildability,
valid content, and traceable projects. A later `REJECT` hides the card
immediately. Batches hold 1-3 proposals; any other size rejects wholesale.
Canonical and evidence keys make retries idempotent. No autonomous AI
generation exists; proposals stay editor/operator-assisted.
