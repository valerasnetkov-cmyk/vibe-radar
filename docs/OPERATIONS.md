# Operations and Deployment — VibeRadar

## 1. Environments

Required logical environments:

- local
- test/CI
- production

A separate staging environment is useful later but is not required before the MVP has enough integrations to justify it.

Never use production credentials in local/test.

## 2. Configuration

Configuration is environment-driven and validated at process startup.

Stage 01 minimum:

- `NODE_ENV`
- `DATABASE_URL`
- `DATABASE_SSL`
- web port/host settings
- worker enable/role settings where needed
- OUTSCAN feature flags default false

Later stage variables are added only when their integration exists:

- GitHub token/config
- Telegram bot token/editor ids
- AI provider credentials/model
- publish timezone/schedule

`.env.example` contains names and safe example values only.

## 3. Local development

Expected local shape:

```text
pnpm dev:web
pnpm dev:worker
Docker Compose -> PostgreSQL
```

Exact commands are finalized by Stage 01 and documented in README.

Local PostgreSQL may expose a host port; production PostgreSQL must not be publicly exposed.

## 4. Production topology

Recommended first deployment:

```text
Internet
   |
 Nginx/TLS
   |
 Next.js web
   |
 private application network
   |---- PostgreSQL
   |---- worker
```

The worker has no public listener unless a later operational requirement explicitly needs one.

Keep the first deployment on one VPS if capacity is sufficient.

## 5. Deployment contract

A production deploy should be explicit:

1. build immutable application artifacts/container images;
2. run migrations as a controlled step;
3. start/update web and worker;
4. verify readiness;
5. run smoke checks;
6. retain previous known-good release for rollback.

Do not run schema mutation implicitly from every web process startup.

## 6. TLS and reverse proxy

Production requirements:

- HTTPS only;
- HSTS after TLS/domain configuration is confirmed;
- redirect HTTP to HTTPS;
- forward only required headers;
- reasonable request-body limits;
- no exposure of PostgreSQL/worker management ports.

## 7. Health

`/api/health/live`:

- proves process is running;
- no database call required;
- no config/secrets.

`/api/health/ready`:

- checks database connectivity;
- may check critical migration/runtime readiness;
- returns generic failure, not credentials/internal dumps.

## 8. Logging

Use structured logs.

Useful fields:

- timestamp
- level
- service/process
- request/job id
- route/job
- duration
- normalized status/error
- project/candidate/publication internal ids when useful

Redact:

- authorization headers
- cookies
- bot tokens
- GitHub tokens
- AI keys
- database credentials

## 9. Metrics

MVP operational metrics:

- discovery runs success/failure
- provider rate-limit remaining
- projects discovered/refreshed
- snapshot writes/dedupes
- score jobs success/failure
- candidate count
- AI calls/failures/cost estimate
- editorial queue depth
- publish success/failure
- web 5xx rate
- DB readiness latency

Product-quality metrics are separate from operational metrics.

## 10. Backups

Before public launch:

- automated PostgreSQL backups;
- encrypted backup destination;
- retention policy;
- documented restore command/process;
- at least one tested restore.

A backup that has never been restored is not considered verified.

## 11. Rollback

Rollback plan must distinguish:

- application-only rollback;
- backward-compatible migration rollback;
- forward-fix required migration.

Avoid destructive schema changes that make the immediately previous application release unable to run unless a maintenance plan exists.

## 12. Incident basics

For production incidents:

1. stop unsafe publication/worker activity if needed;
2. preserve logs/state;
3. identify affected job/publication/project ids;
4. revoke/rotate compromised credential if suspected;
5. restore known-good release/data if necessary;
6. document cause and durable fix.

Publication can be disabled independently from collection/scoring.

## 13. Production security gate

Do not launch publicly until verified:

- secrets are external to the repository;
- editor authorization works;
- publication is idempotent;
- AI output schema validation works;
- external calls have timeout/rate/retry bounds;
- DB is not Internet-exposed;
- HTTPS is active;
- backup/restore procedure exists;
- lint/typecheck/tests/build pass;
- no unresolved Critical/High security finding remains.
