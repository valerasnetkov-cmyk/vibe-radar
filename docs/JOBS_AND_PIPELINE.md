# Jobs and Processing Pipeline — VibeRadar

## 1. Objective

Background processing must be deterministic, bounded, observable, and safe to retry.

The worker process owns scheduled/background work. The web process must not become an implicit scheduler.

## 2. MVP pipeline

```text
DISCOVER
  -> NORMALIZE
  -> PERSIST IDENTITY
  -> SNAPSHOT
  -> CALCULATE GROWTH
  -> SCORE
  -> CONFIDENCE
  -> BUILDABILITY
  -> SELECT CANDIDATE
  -> AI ANALYSIS
  -> EDITORIAL REVIEW
  -> PUBLISH
  -> MEASURE
```

Each step persists enough state that a retry does not require guessing what happened previously.

## 3. Job classes

### github-discovery

Purpose:

- execute configured discovery queries/watch sources;
- persist `source_events`;
- upsert provider identity;
- queue/mark projects for refresh.

Requirements:

- explicit timeout;
- provider rate-limit awareness;
- bounded pages/results;
- bounded concurrency;
- no arbitrary user-supplied URL fetching.

### project-refresh

Purpose:

- fetch canonical repository metadata;
- persist snapshot;
- detect meaningful release/update signals.

Idempotency:

- same observation bucket must not produce duplicate snapshots.

### growth-calculate

Purpose:

- calculate 2h/24h/7d deltas when data is sufficient;
- calculate acceleration/freshness/activity inputs;
- explicitly mark insufficient windows.

Never manufacture a zero/normal delta from missing history.

### score-calculate

Purpose:

- compute VIBE SCORE and confidence from persisted normalized data;
- persist versioned breakdowns.

Must be deterministic for identical input/version.

### buildability-assess

Purpose:

- create structured implementation-feasibility output for substantial candidates.

Model assistance may be added later, but the output schema and provenance remain explicit.

### candidate-select

Purpose:

- apply deterministic thresholds/dedupe/editorial diversity rules;
- create candidate records.

The model cannot create an approved publication.

### analysis-generate

Purpose:

- build a bounded evidence projection;
- call configured model provider;
- validate strict output;
- persist provider/model/prompt provenance.

Failure becomes `ANALYSIS_FAILED`.

### digest-generate

Purpose:

- create daily/weekly candidate groups from approved/publishable records.

Actual clock times are configuration, not hard-coded business logic.

### publish-telegram

Purpose:

- validate approved state;
- create/lock publication intent;
- send one provider message;
- persist attempt and provider message id.

Unique `idempotency_key` is mandatory.

## 4. Scheduling

Internal timestamps use UTC.

Human publication timezone is configuration.

Do not hard-code Moscow, Sakhalin, Berlin, or another local timezone into scoring/storage logic.

Initial scheduler may be a single worker with database-backed state.

Before horizontal worker scaling, add a PostgreSQL advisory lock or lease so only one scheduler claims a singleton schedule.

Do not add Redis merely for scheduling.

## 4a. Stage 09 singleton lease (implemented)

Singleton ownership is decided by the `job_leases` table: `INSERT ...
ON CONFLICT DO NOTHING` elects the first owner, and losers may only win a
conditional `UPDATE ... WHERE locked_until < now()` after expiry, so crashed
workers never leave permanent locks. Lease rows were preferred over advisory
locks because pool connection/session lifetime is ambiguous under the
current pg/Drizzle pooling model. Owner ids are random runtime identities,
not credentials, and only allow-listed registry names can hold a lease.

## 5. Retry policy

Every external call defines:

- timeout;
- maximum attempts;
- exponential backoff/jitter when appropriate;
- retryable status/error classes;
- non-retryable validation/auth errors.

A job exceeding retry policy transitions to a visible failed/dead-letter-equivalent state in PostgreSQL or structured operational records.

Infinite retries are forbidden.

## 6. Concurrency

Provider concurrency must be configurable and conservative.

Global worker concurrency and per-provider concurrency are separate settings.

Database uniqueness constraints are the final protection against duplicate identities/publications.

## 7. Job state

Use a simple DB-backed approach first.

A stage may use explicit job tables or claimable domain statuses if that produces a coherent retry/audit contract.

Do not introduce a generic queue abstraction until at least two job families require identical queue semantics.

## 8. Observability

Each job run records structured fields such as:

- job type
- run id
- start/end time
- success/failure
- processed count
- created/updated count
- skipped/deduped count
- provider rate-limit state where useful
- normalized error category
- duration

Never log provider tokens or authorization headers.

## 9. Cost controls

AI stage requires configurable:

- maximum analyses per run/day;
- maximum input size;
- maximum output tokens;
- provider timeout;
- daily cost/budget guard.

GitHub stage requires configurable:

- maximum queries;
- maximum pages/query;
- maximum repositories/run;
- maximum refresh concurrency.

## 10. Manual replay

Operators must be able to replay a failed bounded job by stable internal identifier without bypassing idempotency or editorial authorization.

Manual replay is an operational action, not a public endpoint.

## 10a. Stage 09 replay and dead letter (implemented)

`pnpm ops:replay -- <job-run-id>` loads the old run, resolves its job name
through the allow-list registry (unknown names are rejected; no dynamic
imports, commands, or module paths), and executes the canonical handler, so
all domain idempotency and approval gates stay enforced. Every execution
persists a `RUNNING` job run finished as `SUCCEEDED`, `FAILED`
(terminal non-retryable failure), or `DEAD_LETTER` (bounded attempts
exhausted) with a safe normalized code. Exhausted runs stay immutable; the
next scheduled occurrence or a manual replay creates a NEW run, optionally
linked via `replay_of_job_run_id`, and never overwrites history.
