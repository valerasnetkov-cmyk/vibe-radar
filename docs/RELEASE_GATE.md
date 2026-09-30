# MVP Release Gate — VibeRadar

## 1. Required local tooling

- Node.js 24+, pnpm 10.15.0 (`packageManager` field), Git.
- PostgreSQL 17 reachable locally. The canonical local shape is the
  Compose service (`docker compose up -d postgres`); where Docker is
  unavailable, an equivalent local PostgreSQL 17 with a dedicated test
  database is acceptable and must be reported as a deviation.
- Never use production infrastructure for gate verification.

## 2. PostgreSQL test procedure

1. Create a dedicated local database (example: `viberadar_gate`).
2. Export `DATABASE_URL` for that database only.
3. Integration tests refuse to run when `NODE_ENV=production` or when the
   host is not identifiably local (`localhost`, `127.0.0.1`, `::1`,
   `postgres`); see `tests/integration/guard.ts`.
4. Run `pnpm test:integration`. Every database test must execute:
   DB-dependent skips must be 0. Skips are explicit `describe.skip` guards
   that warn, never silent.

## 3. Migration verification

1. `pnpm db:migrate` on a clean database; confirm `schema_migrations`
   holds `0000` through the latest file (currently `0014`).
2. Run `pnpm db:migrate` again; the second run must exit 0 with no changes.
3. The migrator honors validated `DATABASE_SSL` exactly like runtime.
4. Never edit applied migrations to make a run pass; fix forward only.
5. `/api/health/ready` reports ready only when the database is reachable
   AND every shipped migration file is recorded; `/api/health/live` stays
   database-independent.

## 4. Integration-test matrix

- Stage 07: candidate get-or-create race, dispatch single owner, FAILED
  retry single owner, finalization ambiguity without resend.
- Stage 08: publication first claim, duplicate prevention, FAILED retry
  ownership, finalization failure without resend, published-only read model.
- Stage 09: lease race and expiry, job-run lifecycle and replay linkage,
  AI budget cap/rollover/restart, digest idempotency, reconciliation
  visibility, operational summary.
- Stage 10: mechanic get-or-create race, evidence dedupe, grouping,
  unknown references, reassessment, review-gated visibility matrix.
- Stage 11: opportunity get-or-create race, evidence dedupe, trusted
  resolution matrix, conservative buildability, threshold and review gating.
- MVP pipeline: fixture ingestion through score, candidate, analysis,
  real approval, mocked-Telegram publication, read models, and duplicate
  invocation with a single provider send.
- No live GitHub/Telegram/AI calls anywhere in the matrix.

## 5. Production web command

- Build: `pnpm build` (also validates types and collects all routes).
- Start: `pnpm start -- --port <port>` (or `PORT=<port> pnpm start`).
  `next start` serves the production build; dynamic routes render on demand.
- Smoke: `/api/health/live`, `/api/health/ready`, `/`, `/radar`,
  `/mechanics`, `/opportunities` must return 200 with the migrated database
  configured. Security baseline headers (`nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, `SAMEORIGIN` framing) are asserted on responses.
  Content-Security-Policy stays deferred; HSTS is owned by Nginx/TLS.

## 6. Production worker command

- Build: `pnpm build:worker` (esbuild single-file bundle pinned in
  devDependencies; no framework). Artifact: `dist/worker/index.js`
  (gitignored build output).
- Start: `pnpm start:worker`. The worker opens no network listener.
- Smoke: with a local database, job-run rows appear for registered jobs,
  optional jobs stay disabled without their configuration, and SIGTERM
  produces a bounded graceful stop (scheduler halt, pool close, exit 0).
- Windows cannot deliver POSIX signals to detached console processes, so
  graceful-stop proof for that platform comes from CI on Linux; see below.

## 7. Health/readiness

- Liveness: process-only, always independent of the database.
- Readiness: database reachable plus full migration chain applied.
  Responses carry booleans only, never SQL, hosts, paths, or stacks.

## 8. Deployment model

Single VPS:

```text
Internet
  |
Nginx / TLS (owns HSTS)
  |
Next.js web service (`pnpm start`)
  |
VibeRadar worker service (`pnpm start:worker`, private, no listener)
  |
PostgreSQL, private/local only
```

systemd units (or Compose services) per process with restart on failure.
Migration (`pnpm db:migrate`) is an explicit deploy step run before
starting new code; app processes never auto-migrate on startup.
Health checks hit `/api/health/live` (process) and `/api/health/ready`
(release level).

The production deployment runbook and templates are
`docs/PRODUCTION_DEPLOYMENT.md` and `deploy/`.

## 9. Security header ownership

Next.js owns baseline headers (see §5). Nginx owns TLS and HSTS. No
application code may weaken framing or MIME policy for public routes.

## 10. Backup

- `pg_dump -Fc` of the production database to storage outside the
  repository, on a schedule with retention. Credentials via environment,
  never in logs or docs.
- Record each backup with timestamp, source, size, and the
  `schema_migrations` maximum applied.

## 11. Restore

- Restore into a separate empty database (`pg_restore -d <fresh>`),
  never over the source; verify `schema_migrations`, row counts for
  `projects`, `candidates`, `publications`, `job_runs`,
  `product_mechanics`, `opportunities`, and unique constraints match.
- A backup that has never been restored does not satisfy this gate.

## 12. Rollback

- Application rollback returns to the previous known-good Git SHA and its
  built artifacts (`next build` output, `dist/worker/index.js`).
- Schema policy is forward-only: no destructive down migrations.
- Current schema is additive, so the previous release boots against the
  newer schema (new columns nullable/defaulted, new tables unread by old
  code). Otherwise forward-fix with a maintenance procedure, never a
  destructive rollback.

## 13. Residual risks

- Telegram external-delivery ambiguity stands by design (prevention over
  retry; reconciliation stays operator-visible, never automatic).
- Reconciliation automation remains deferred to post-MVP operations.
- postcss advisories via Next.js are build-time-only with no
  attacker-controlled CSS path; tracked, non-blocking.
- Production backup/restore cadence and off-site retention are
  operational follow-ups after first deploy.
