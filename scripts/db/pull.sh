#!/usr/bin/env bash
# Pull a remote database to local, sanitize PII, and replace the dev DB.
#
# Usage: pull.sh <env> [--with-files]
#   env          - staging | prod
#   --with-files - also pull /app/data/uploads into ./data/uploads (merge,
#                  does not delete local files that no longer exist remotely)
#
# The current local database is auto-snapshotted before being overwritten.
# When --with-files is passed, the existing local uploads dir is also
# snapshotted as a tar.gz in backups/.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "${SCRIPT_DIR}/_common.sh"

validate_args 1 2 $# "pull.sh <env> [--with-files]"

ENV="$1"

WITH_FILES=false
if [[ -n "${2:-}" ]]; then
  if [[ "$2" == "--with-files" ]]; then
    WITH_FILES=true
  else
    echo "Error: Unknown argument '$2'" >&2
    echo "Usage: pull.sh <env> [--with-files]" >&2
    exit 1
  fi
fi

# Block pulling from local - it makes no sense
if [[ "$ENV" == "local" ]]; then
  echo "Error: Cannot pull from local. Use: staging, prod" >&2
  exit 1
fi

APP_ID="$(resolve_app_id "$ENV")"
SANITIZE_SQL="${SCRIPT_DIR}/sanitize.sql"
TMP_DB="${LOCAL_DB_TMP}"

confirm "Pull ${ENV} database and replace local? This will overwrite prisma/data.db."

# ── Step 1: Download remote DB via hot copy ───────────────────────────
echo "Downloading ${ENV} database..."
cloudron_run exec --app "$APP_ID" -- \
  sqlite3 "$REMOTE_DB_PATH" ".backup /tmp/db-pull.db"
cloudron_run exec --app "$APP_ID" -- \
  cat /tmp/db-pull.db > "$TMP_DB"
cloudron_run exec --app "$APP_ID" -- \
  rm -f /tmp/db-pull.db

# ── Step 2: Sanitize the downloaded database ──────────────────────────
echo "Sanitizing PII..."
sqlite3 "$TMP_DB" < "$SANITIZE_SQL"

# ── Step 3: Snapshot current local DB before overwriting ──────────────
if [[ -f "$LOCAL_DB" ]]; then
  echo "Snapshotting current local database..."
  DB_OPS_CONFIRM=skip bash "${SCRIPT_DIR}/snapshot.sh" local "pre-pull"
fi

# ── Step 4: Replace local DB ─────────────────────────────────────────
mv "$TMP_DB" "$LOCAL_DB"

echo "Done. Local database replaced with sanitized ${ENV} data."

# ── Step 5: Pull files (optional) ────────────────────────────────────
if [[ "$WITH_FILES" == "true" ]]; then
  echo "Pulling files from ${ENV}..."

  # Snapshot existing local uploads (if non-empty) before merging.
  if [[ -d "$LOCAL_UPLOADS_DIR" ]] && [[ -n "$(ls -A "$LOCAL_UPLOADS_DIR" 2>/dev/null || true)" ]]; then
    ensure_backups_dir
    UPLOADS_SNAPSHOT="${BACKUPS_DIR}/local-uploads-$(date +%Y-%m-%d-%H%M%S)-pre-pull.tar.gz"
    echo "Snapshotting current local uploads → ${UPLOADS_SNAPSHOT}"
    tar -C "$LOCAL_UPLOADS_DIR" -czf "$UPLOADS_SNAPSHOT" .
  fi

  mkdir -p "$LOCAL_UPLOADS_DIR"

  # Stream remote uploads tarball into local directory (merge - does not
  # delete local files that no longer exist remotely).
  cloudron_run exec --app "$APP_ID" -- \
    bash -c "mkdir -p ${REMOTE_UPLOADS_PATH} && tar -C ${REMOTE_UPLOADS_PATH} -cf - ." \
    | tar -C "$LOCAL_UPLOADS_DIR" -xf -

  echo "Done. Local files merged from ${ENV}."
fi
