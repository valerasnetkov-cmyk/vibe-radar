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
