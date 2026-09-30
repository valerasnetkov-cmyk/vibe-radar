# Production deployment — viberadar.ru

This runbook is for the first VPS deployment. It keeps the application and
database local to the host, and enables external integrations one at a time.

## Topology

```text
Internet -> Nginx/TLS -> Next.js at 127.0.0.1:3000 -> local PostgreSQL 17
                                      |
                                      +-> VibeRadar worker (no listener)
```

Canonical paths:

- repository: `/opt/viberadar/app`
- environment: `/opt/viberadar/shared/.env.production`
- backups: `/opt/viberadar/backups`
- logs: `journalctl` for the two systemd services

The application and its environment are owned by the dedicated
`viberadar:viberadar` account. Nginx, PostgreSQL and certificates remain
system-managed. No secret belongs in the repository working tree.

## Preconditions

1. Confirm DNS for `viberadar.ru` and `www.viberadar.ru` points to this VPS.
2. Audit installed versions before changing anything: `git --version`,
   `node --version`, `pnpm --version`, `psql --version`, `nginx -v` and
   `certbot --version`. This release requires Node 24+ and pnpm 10.15.0.
3. Check the existing firewall before modifying it. Keep SSH open; only
   22/tcp, 80/tcp and 443/tcp are public. PostgreSQL 5432 and port 3000 must
   remain local/private.
4. Install Git, Node 24, pnpm 10.15.0, PostgreSQL 17, Nginx and Certbot only
   if absent and only after checking they do not conflict with other services.

## Host preparation

Create the account and paths as an administrator:

```bash
sudo useradd --system --create-home --shell /bin/bash viberadar
sudo install -d -o viberadar -g viberadar -m 0750 /opt/viberadar/app /opt/viberadar/shared /opt/viberadar/backups
sudo -u viberadar git clone <REPOSITORY_URL> /opt/viberadar/app
```

Create a local PostgreSQL role and database with a generated password. Do not
use the PostgreSQL superuser as `DATABASE_URL`, and do not print the password.
Keep `listen_addresses` local/private. Before a migration on any non-empty
production database, create a backup.

```bash
sudo -u postgres psql
CREATE ROLE viberadar LOGIN PASSWORD 'GENERATED_SECRET';
CREATE DATABASE viberadar OWNER viberadar;
\q
```

Create the production environment outside Git:

```bash
sudo install -o viberadar -g viberadar -m 0600 /dev/null /opt/viberadar/shared/.env.production
sudoedit /opt/viberadar/shared/.env.production
```

Use `deploy/env.production.example` as the list of variable names. For the
first boot, leave GitHub discovery, AI and every Telegram value empty; keep
`AI_DAILY_MAX_CANDIDATES=0` and all OUTSCAN flags `false`. `DATABASE_SSL` is
`disable` for this local PostgreSQL connection.

## First build and migration

The first release is the exact SHA `2a5a4d3abb3727256f7633e896b641e38ca74c23`.
As `viberadar`, fetch the repository and verify both `HEAD` and `origin/main`
equal that SHA and `git status --porcelain` is empty. Do not reset, force
checkout or deploy an uncommitted tree.

```bash
sudo -u viberadar /opt/viberadar/app/scripts/deploy-production.sh 2a5a4d3abb3727256f7633e896b641e38ca74c23
```

The script only verifies, installs, builds and runs the explicit migration. It
does not start services or roll back the database. If it fails, stop the
deployment. Confirm the migration chain is complete before continuing.

## Services and Nginx

Install the provided unit files under `/etc/systemd/system/`, then validate
and enable them:

```bash
sudo install -m 0644 /opt/viberadar/app/deploy/systemd/viberadar-web.service /etc/systemd/system/
sudo install -m 0644 /opt/viberadar/app/deploy/systemd/viberadar-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now viberadar-web
```

Start the worker only after database readiness and the web health checks pass:

```bash
sudo systemctl enable --now viberadar-worker
```

Install `deploy/nginx/viberadar.conf` only after obtaining the listed
certificate. For the initial ACME request use an HTTP-only temporary server
block with the same `server_name` and `/.well-known/acme-challenge/` location,
then issue the certificate with Certbot and replace it with the supplied
configuration. Test Nginx before each reload.

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Once HTTPS works, the committed Nginx configuration provides HTTP-to-HTTPS and
`www`-to-apex redirects and HSTS without preload.

## Verification

Run local checks first, then HTTPS checks:

```bash
curl --fail http://127.0.0.1:3000/api/health/live
curl --fail http://127.0.0.1:3000/api/health/ready
curl --fail https://viberadar.ru/api/health/live
curl --fail https://viberadar.ru/api/health/ready
```

Verify `/`, `/radar`, `/mechanics` and `/opportunities` return success. Check
the HTTPS responses for `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy`, `X-Frame-Options` and, after TLS is confirmed, HSTS.
CSP is intentionally deferred and must not be claimed as active.

Use `journalctl -u viberadar-web` and `journalctl -u viberadar-worker` for
logs; do not print environment variables or token-bearing URLs. Confirm the
worker has no listening port and does not restart-loop.

## Controlled integrations

1. Enable a single narrow GitHub query only after web and database health are
   confirmed; inspect one discovery cycle before expanding it.
2. Add the private Telegram editor token, secret, chat and editor allow-list;
   register `https://viberadar.ru/api/telegram/webhook` and prove invalid
   secrets are rejected. Do not use arbitrary state-mutating public payloads.
3. Enable AI for one candidate only after the private editor flow is healthy.
4. Add `TELEGRAM_CHANNEL_ID` last, publish one editor-approved candidate and
   verify duplicate invocation sends no second message.

OUTSCAN and Instagram stay disabled.

## Backup and rollback

After the first real data, create an external PostgreSQL backup with
`pg_dump -Fc`, record timestamp, file size and latest migration level, and
restore only into a separate empty database for verification. Never restore
over production as a routine test.

For an application rollback, stop the services, return to a previously known
good committed SHA, rebuild, then restart and check health. Database schema is
forward-only: never apply a destructive rollback. If compatibility is not
preserved, deploy a forward fix.

## Routine release

For a release already checked out cleanly at the requested SHA, run the script
as `viberadar`, then restart web, health-check it, restart worker, and verify
worker recovery. Do not restart PostgreSQL as part of a normal application
release.
