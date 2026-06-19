#!/usr/bin/env bash
# Push local prisma/data.db to a remote environment.
#
# Usage: push.sh <env> [--with-files]
#   env          - staging (production is blocked)
#   --with-files - also push ./data/uploads to /app/data/uploads on the
#                  remote (merge - does not delete remote files that no
#                  longer exist locally)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "${SCRIPT_DIR}/_common.sh"

validate_args 1 2 $# "push.sh <env> [--with-files]"

ENV="$1"

WITH_FILES=false
if [[ -n "${2:-}" ]]; then
  if [[ "$2" == "--with-files" ]]; then
    WITH_FILES=true
  else
    echo "Error: Unknown argument '$2'" >&2
    echo "Usage: push.sh <env> [--with-files]" >&2
    exit 1
  fi
fi

# Hard-block production - never allow pushing to prod
case "$ENV" in
  prod|production)
    echo "Error: Pushing to production is NOT allowed. Use the CI/CD pipeline for production deployments." >&2
    exit 1
    ;;
esac

APP_ID="$(resolve_app_id "$ENV")"

if [[ "$APP_ID" == "local" ]]; then
  echo "Error: Cannot push to local - the database is already local." >&2
  exit 1
fi

LOCAL_DB="${PROJECT_ROOT}/prisma/data.db"
if [[ ! -f "$LOCAL_DB" ]]; then
  echo "Error: Local database not found at ${LOCAL_DB}" >&2
  exit 1
fi

confirm "Push local database to ${ENV}?"

# Force-checkpoint the local WAL into the main file before transfer.
# `cloudron push` only uploads /app/data/prisma/data.db, not the -wal
# sibling - so any rows still in the local WAL (e.g., changes a running
# dev server made and never checkpointed) would be silently dropped on
# the way to staging. TRUNCATE collapses the WAL down to zero bytes so
# the file we ship is the full picture.
echo "Checkpointing local WAL into main file..."
sqlite3 "$LOCAL_DB" "PRAGMA wal_checkpoint(TRUNCATE);" >/dev/null

# WAL-safe DB replacement.
#
# Constraints we have to work around:
#   * `cloudron push` (storage API) requires the app to be running -
#     stopping the app first returns "409 App not installed or running".
#   * Live-overwriting data.db while Node is connected leaves stale
#     data.db-wal / data.db-shm. On the next reader open SQLite may
#     replay those frames over the new file, silently undoing the push.
#
# Solution:
#   1. `cloudron push` overwrites data.db in place (app still running).
#   2. `cloudron exec rm -wal -shm` clears the stale WAL siblings. Node
#      still holds the open inodes so its in-memory connections keep
#      working until restart, but no new reader will find these files.
#   3. `cloudron restart` kills Node and re-runs start.sh, which opens
#      a fresh DB, runs `prisma migrate deploy`, and re-enables WAL.
ensure_app_running() {
  # Best-effort restart on the failure path; safe if app is already running.
  cloudron_run restart --app "$APP_ID" >/dev/null 2>&1 || true
}
trap ensure_app_running EXIT

echo "Pushing database file..."
cloudron_run push --app "$APP_ID" "$LOCAL_DB" "$REMOTE_DB_PATH"

echo "Clearing stale WAL/SHM siblings..."
cloudron_run exec --app "$APP_ID" -- \
  rm -f "${REMOTE_DB_PATH}-wal" "${REMOTE_DB_PATH}-shm"

echo "Restarting ${ENV} app..."
cloudron_run restart --app "$APP_ID"

trap - EXIT

echo "Pushed local database to ${ENV}."

# ── Push files (optional) ─────────────────────────────────────────────
if [[ "$WITH_FILES" == "true" ]]; then
  if [[ ! -d "$LOCAL_UPLOADS_DIR" ]]; then
    echo "Warning: No local uploads directory at ${LOCAL_UPLOADS_DIR} - skipping file push." >&2
  else
    confirm "Push local files to ${ENV}? Existing remote files with the same names will be overwritten."
    echo "Pushing files to ${ENV}..."

    tar -C "$LOCAL_UPLOADS_DIR" -cf - . \
      | cloudron_run exec --app "$APP_ID" -- \
        bash -c "mkdir -p ${REMOTE_UPLOADS_PATH} && tar -C ${REMOTE_UPLOADS_PATH} -xf -"

    echo "Pushed local files to ${ENV}."
  fi
fi
