# Test Strategy — VibeRadar

## 1. Purpose

Tests protect the product's most important properties:

- historical metrics are reproducible;
- VIBE SCORE is deterministic/versioned;
- weak evidence cannot become high-confidence fact by accident;
- LLM output cannot authorize actions;
- duplicate callbacks/jobs cannot duplicate publications;
- external provider failures remain bounded.

## 2. Test layers

### Unit

Use for pure logic:

- normalization
- delta/acceleration calculations
- score components
- confidence calculation
- candidate policy
- state-transition guards
- render/content transformations

Unit tests must be deterministic and run without network/database where possible.

### Database integration

Run against isolated PostgreSQL.

Cover:

- migrations
- provider identity uniqueness
- snapshot uniqueness
- candidate dedupe
- publication idempotency
- transactional state transitions
- repository/query behavior used by critical flows

### Provider contract

Use fixtures for GitHub/Telegram/AI payload shapes.

Do not call live providers in normal CI.

Cover:

- successful normalization
- partial/missing fields
- provider rate-limit/error mapping
- malformed payload rejection
- upstream schema changes represented by fixture tests

### Security-negative

Required for privileged/trust boundaries:

- malicious README/release prompt injection
- model output with extra/unexpected fields
- invalid Telegram callback
- unauthorized editor id
- stale state transition
- duplicate publish race
- secret redaction
- oversized/unbounded provider/model input

### Web/component

Cover meaningful rendering behavior:

- home radar with data
- empty state
- partial/missing metric state
- project page evidence
- score/confidence/buildability labels
- responsive critical layout behavior where tooling permits

### End-to-end

Keep few and high-value:

1. discovered project -> snapshot -> score -> candidate;
2. candidate -> valid analysis -> trusted approval -> one Telegram publication;
3. repeated publish request -> no duplicate;
4. public project page renders approved intelligence/evidence.

## 3. Fixtures

Fixtures are versioned and small.

Keep separate fixtures for:

- normal GitHub repository
- very young fast-growing project
- stale project
- suspicious/discontinuous growth
- missing history
- release event
- malicious prompt-injection content
- model invalid schema
- Telegram duplicate callback

Do not use real credentials or private data in fixtures.

## 4. Scoring golden tests

For each `score_version`, keep deterministic examples with expected component values/ranges.

A scoring formula change requires:

- new/updated version;
- changed golden tests;
- documentation update;
- no silent reinterpretation of historic scores.

## 5. Time

Inject/fix clock in tests for:

- observation windows
- candidate expiry
- digest windows
- rate-limit reset logic
- publication timestamps

Tests must not depend on the wall clock.

## 6. Network

Default test policy: no uncontrolled outbound network.

Provider tests use mocked/fixture responses.

Optional live smoke tests must be explicitly invoked and must not be required for ordinary local unit tests.

## 7. UI QA

For web changes verify at minimum:

- desktop representative width;
- narrow mobile width;
- keyboard focus;
- long Russian project names;
- long numeric values;
- no-data/low-confidence states;
- no clipping/horizontal page overflow.

Visual QA must enforce `docs/WEB_UI.md`.

## 8. Stage verification command contract

Stage 01 should establish scripts equivalent to:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
pnpm check:lines
```

Names may differ only if README documents the canonical commands.

## 9. Release gate

Do not report an implementation stage complete when any required available check fails.

If infrastructure prevents a check, report exactly:

- which check did not run;
- why;
- whether the code/test exists;
- what is required to execute it.

Code inspection is not a substitute for an available executable check.
