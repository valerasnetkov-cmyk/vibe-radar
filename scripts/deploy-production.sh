#!/usr/bin/env bash
set -euo pipefail

readonly release_sha="${1:-}"
readonly app_dir="/opt/viberadar/app"
readonly environment_file="/opt/viberadar/shared/.env.production"

fail() {
  printf 'deployment stopped: %s\n' "$1" >&2
  exit 1
}

[[ "${EUID}" -ne 0 ]] || fail "run this script as the viberadar user, not root"
[[ -n "${release_sha}" ]] || fail "usage: $0 <full-release-sha>"
[[ "${release_sha}" =~ ^[0-9a-f]{40}$ ]] || fail "release SHA must be a full lowercase SHA-1"
[[ -d "${app_dir}/.git" ]] || fail "application repository is missing"
[[ -r "${environment_file}" ]] || fail "production environment file is unavailable"

cd "${app_dir}"
[[ -z "$(git status --porcelain)" ]] || fail "application working tree is not clean"

git fetch origin
[[ "$(git rev-parse origin/main)" == "${release_sha}" ]] || fail "origin/main does not match requested release"
[[ "$(git rev-parse HEAD)" == "${release_sha}" ]] || fail "checked-out revision does not match requested release"

# The operator-owned environment file is deliberately outside Git. Its values
# are never printed; loading it is required for explicit database migration.
set -a
# shellcheck disable=SC1090
source "${environment_file}"
set +a

pnpm install --frozen-lockfile
pnpm build
pnpm build:worker
test -f .next/BUILD_ID
test -f dist/worker/index.js
pnpm db:migrate

printf 'build and migration completed for %s\n' "${release_sha}"
printf 'Restart systemd services separately after health validation.\n'
