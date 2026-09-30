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
- Resolve Telegram dispatch settings through `requireTelegramEditorConfig`, which fails closed (bot token, editor chat, non-empty editor allow-list, `TELEGRAM_API_TIMEOUT_MS`); unrelated commands never require Telegram settings.
- Normalize all `EditorBot` provider failures (network, timeout, non-2xx, malformed JSON, `ok=false`, missing `message_id`) to safe codes; error text never contains the bot token or token-bearing URLs, and raw exception text is never persisted.

## 5. Publication idempotency

Use a unique database constraint and transaction boundary so concurrency/retries cannot duplicate a one-time publication.

The same guarantee covers review dispatch: `editorial_review_dispatches.candidate_id` is unique, so two concurrent claim attempts produce exactly one owner and one provider send; `SENT` dispatches never resend.

## 5a. Approved publication gate (Stage 08)

Only `APPROVED` candidates with a same-candidate `APPROVE` decision publish;
the service binds both from PostgreSQL, so a caller cannot combine candidate
A with a decision from candidate B or inject content, HTML, or channel ids.
Public Telegram traffic uses `requireTelegramPublishingConfig`
(`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`, `TELEGRAM_API_TIMEOUT_MS`) and
never the editor chat. Post-delivery DB finalization failures surface as
reconciliation-required and never resend automatically.

## 5b. Public web exposure

Public routes render only `published` snapshots validated against the
ContentModel schema. Internal candidate states, editorial notes, editor
identities, raw provider payloads, and secrets never reach public
projections; invalid snapshots are skipped and non-HTTP(S) links are
dropped before rendering.

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

## 8a. Operations security (Stage 09)

- Singleton job ownership is decided by PostgreSQL leases; unexpired leases cannot be taken by a second worker.
- Job names from the database resolve only through the allow-list registry; unknown names never execute handlers, imports, or commands, and no replay HTTP endpoint exists.
- Persisted and logged error codes are allow-listed safe codes; raw messages, tokens, URLs, and provider payloads never persist.
- The AI daily budget is enforced by an atomic database counter consumed before provider work; restarts cannot reset usage.
- Manual replay invokes canonical handlers, preserving publication approval, idempotency, dispatch idempotency, budgets, and candidate rules.
- Reconciliation visibility exposes internal ids and timestamps only.

## 8b. Mechanic radar integrity (Stage 10)

- Proposals are untrusted: strict schema, no executable fields, no caller-set stage/velocity/confidence/visibility/independence.
- Every evidence reference resolves to persisted projects/source events; unknown or anchor-less references are skipped and never counted.
- Independence is server-derived per canonical project; unresolved evidence never counts toward thresholds.
- Deterministic evidence keys plus `ON CONFLICT DO NOTHING` make retries inflation-proof.
- Reviews are append-only and cannot alter metrics; public visibility needs a latest `APPROVE` on top of the evidence gate.
- Public projections carry no editor identities, notes, internal keys, grouping internals, or raw source metadata; links are HTTP(S)-only.
- Operator CLIs validate input and perform no fetching, importing, or shell execution from proposal content.

## 8c. Opportunity integrity (Stage 11)

- Proposals are untrusted: strict schema, bounded prose, no executable fields, no caller-set confidence/buildability/status/visibility.
- Every confidence-bearing reference resolves to published projects or eligible mechanics; SIGNAL/TREND and unknown ids fail closed.
- Canonical and evidence keys plus `ON CONFLICT DO NOTHING` make retries inflation-proof.
- Buildability id and label always come from one persisted assessment and can never disagree.
- Reviews are append-only and cannot alter metrics; explicit publication re-checks eligibility from PostgreSQL.
- Public projections carry no editor ids, notes, evidence keys, raw payloads, assessment ids, or unsafe URLs; hypothesis prose stays inert data.
- Operator CLIs validate input and perform no fetching, importing, or shell execution from proposal content.

## 8d. Release-gate posture

- Integration fixtures run only against identifiably local databases; production mode and non-local hosts refuse explicitly.
- Readiness exposes booleans only, never SQL, hosts, paths, or stacks.
- Production headers ship `nosniff`, strict referrer/frame policy, and a minimal permissions policy; CSP stays deferred until a nonce architecture exists, and HSTS belongs to Nginx/TLS.
- Dependency audit: drizzle-orm raised past the SQL-identifier advisory; remaining postcss advisories are build-time-only with no attacker-controlled CSS path.
- Tracked-tree and history secret audit found no real credentials (only synthetic test fixtures and local-only compose values).

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
