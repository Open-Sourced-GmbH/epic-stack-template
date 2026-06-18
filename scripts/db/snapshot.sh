#!/usr/bin/env bash
# Create a safe hot-copy snapshot of a SQLite database.
#
# Usage: snapshot.sh <env> [name]
#   env  - local | staging | prod
#   name - optional human-readable label appended to the filename

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "${SCRIPT_DIR}/_common.sh"

validate_args 1 2 $# "snapshot.sh <env> [name]"

ENV="$1"
NAME="${2:-}"

APP_ID="$(resolve_app_id "$ENV")"
FILENAME="$(generate_snapshot_filename "$ENV" "$NAME")"
DEST="${BACKUPS_DIR}/${FILENAME}"

ensure_backups_dir

confirm "Snapshot ${ENV} database to ${FILENAME}?"

if [[ "$ENV" == "local" ]]; then
  if [[ ! -f "$LOCAL_DB" ]]; then
    echo "Error: Local database not found at ${LOCAL_DB}" >&2
    exit 1
  fi
  sqlite3 "$LOCAL_DB" ".backup '${DEST}'"
else
  # Remote: create a hot copy inside the container, stream it out
  cloudron_run exec --app "$APP_ID" -- \
    sqlite3 "$REMOTE_DB_PATH" ".backup /tmp/db-snapshot.db"
  cloudron_run exec --app "$APP_ID" -- \
    cat /tmp/db-snapshot.db > "$DEST"
  cloudron_run exec --app "$APP_ID" -- \
    rm -f /tmp/db-snapshot.db
fi

echo "Snapshot saved: ${DEST}"
