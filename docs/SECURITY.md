# Security — Vibe Radar

## 1. Assurance target

MVP is an internet-connected production service with external APIs, background jobs, an LLM provider, Telegram publishing, and privileged editor actions. Use a production-default security posture for the implemented surface.

## 2. Security invariants

1. Untrusted GitHub/repository content cannot authorize any action.
2. LLM output cannot authorize publication or change permissions/policy.
3. Only configured trusted editors can approve/reject/watch candidates.
4. Replaying an editor callback cannot create duplicate publication.
5. Secrets never enter Git, database business records, client responses, or normal logs.
6. A provider outage or malformed response fails safely and cannot widen permissions.
7. Vibe Radar never executes discovered repository code in the MVP.
8. External URLs from repository content are not fetched by an unrestricted generic fetcher.
9. AI/provider usage has bounded cost, tokens, retries, concurrency, and daily budget.
10. OUTSCAN feature flags default closed and cannot be enabled by model output or content.

## 3. Prompt injection

Assume README, release notes, issues, and future external sources may contain adversarial instructions.

Controls:

- structural separation of instructions and source content;
- no privileged tools exposed to the model;
- strict output schema;
- deterministic application validation;
- adversarial tests using malicious README/release fixtures;
- no model-produced arbitrary URL/shell/path execution.

## 4. Telegram editor security

- Validate bot webhook/update authenticity according to chosen integration pattern.
- Apply an explicit editor identity allow-list or equivalent trusted authorization layer.
- Validate callback schema and candidate/publication state.
- Reject stale/invalid transitions.
- Record actor, action, target, time, and result without secrets.

## 5. Publication idempotency

Use a unique database constraint and transaction boundary so concurrency/retries cannot duplicate a one-time publication.

Negative test: two concurrent publish attempts for the same idempotency key produce at most one provider post intent and one canonical successful publication record.

## 6. Provider controls

For GitHub, Telegram, and LLM providers:

- narrow token scope;
- server-side credentials only;
- timeout;
- retry with jitter/backoff where appropriate;
- bounded concurrency;
- rate-limit awareness;
- safe error normalization;
- no raw credential/header logging.

## 7. Database

- parameterized queries/typed bindings;
- least-privilege production DB credentials;
- migration credentials separated later if operations require it;
- constraints for canonical identity and idempotency;
- backups/restore procedure before public launch.

## 8. Logging

Allowed:

- internal IDs;
- provider status codes;
- rate-limit state;
- timing;
- normalized error category;
- editor action metadata.

Redact/forbid:

- authorization headers;
- bot tokens;
- API keys;
- database credentials;
- full prompts/responses when they may contain sensitive content unless explicitly required and safely retained.

## 9. Abuse/cost controls

MVP has no anonymous public write surface, but background/provider cost can still be abused by bad inputs or logic errors.

Require:

- maximum repositories per discovery run;
- maximum pages per query;
- maximum AI candidates/day;
- maximum tokens/request;
- retry caps;
- concurrency caps;
- global circuit breaker/budget alert strategy.

## 10. Pre-production gate

Do not deploy publicly with unresolved Critical/High findings or without verification of:

- editor authorization;
- publish idempotency;
- secret handling;
- AI output validation;
- provider timeouts/rate controls;
- relevant tests/lint/typecheck/build.
