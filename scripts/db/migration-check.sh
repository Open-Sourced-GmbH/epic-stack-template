#!/usr/bin/env bash
# Check pending Prisma migrations for destructive operations.
#
# Pulls the remote environment's applied-migrations list, compares with
# local migration files, applies pending migrations against a temp copy
# of the remote schema, and scans for destructive SQL operations.
#
# Usage: migration-check.sh <env>
#   env - staging | prod
#
# Exit codes:
#   0 - no destructive operations (safe to deploy)
#   1 - error
#   2 - destructive operations detected (requires approval)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "${SCRIPT_DIR}/_common.sh"

validate_args 1 1 $# "migration-check.sh <env>"

ENV="$1"

if [[ "$ENV" == "local" ]]; then
  echo "Error: migration-check is for remote environments only." >&2
  exit 1
fi

APP_ID="$(resolve_app_id "$ENV")"
MIGRATIONS_DIR="${PROJECT_ROOT}/prisma/migrations"

# ── Pull remote schema ───────────────────────────────────────────────
echo "Pulling schema from ${ENV}..."
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

SCHEMA_FILE="${TEMP_DIR}/remote-schema.sql"
FRESH_DEPLOY=false

if ! cloudron_run exec --app "$APP_ID" -- \
  sqlite3 "$REMOTE_DB_PATH" .schema > "$SCHEMA_FILE" 2>/dev/null; then
  echo "Remote database not found - treating as fresh deploy."
  FRESH_DEPLOY=true
fi

# ── Create temp DB from remote schema ────────────────────────────────
TEMP_DB="${TEMP_DIR}/check.db"
if [[ "$FRESH_DEPLOY" == false ]]; then
  # Strip explicit CREATE TABLE statements for FTS5 shadow tables
  # (suffixes: _data, _idx, _content, _docsize, _config). These are
  # auto-created by the parent CREATE VIRTUAL TABLE ... USING fts5(...)
  # statement; replaying them fails with "object name reserved for
  # internal use".
  filtered="${TEMP_DIR}/remote-schema.filtered.sql"
  grep -vE "^CREATE TABLE (IF NOT EXISTS )?['\"]?[A-Za-z0-9_]+_(data|idx|content|docsize|config)['\"]?" "$SCHEMA_FILE" > "$filtered"
  mv "$filtered" "$SCHEMA_FILE"

  sqlite3 "$TEMP_DB" < "$SCHEMA_FILE"
fi

# ── Find pending migrations ──────────────────────────────────────────
echo "Checking for pending migrations..."

APPLIED=""
if [[ "$FRESH_DEPLOY" == false ]]; then
  APPLIED=$(cloudron_run exec --app "$APP_ID" -- \
    sqlite3 "$REMOTE_DB_PATH" \
    "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL;" 2>/dev/null || echo "")
fi

PENDING=()
for dir in "${MIGRATIONS_DIR}"/*/; do
  [[ -d "$dir" ]] || continue
  local_name="$(basename "$dir")"
  [[ -f "${dir}/migration.sql" ]] || continue
  if ! echo "$APPLIED" | grep -qF "$local_name"; then
    PENDING+=("$local_name")
  fi
done

if [[ ${#PENDING[@]} -eq 0 ]]; then
  echo "No pending migrations."
  exit 0
fi

echo "Found ${#PENDING[@]} pending migration(s):"
for m in "${PENDING[@]}"; do
  echo "  - $m"
done

# ── Apply migrations against temp copy (validation) ──────────────────
if [[ "$FRESH_DEPLOY" == false ]]; then
  for migration in "${PENDING[@]}"; do
    sql_file="${MIGRATIONS_DIR}/${migration}/migration.sql"
    if ! sqlite3 "$TEMP_DB" < "$sql_file" 2>"${TEMP_DIR}/err.log"; then
      echo "Error: migration ${migration} failed to apply:" >&2
      cat "${TEMP_DIR}/err.log" >&2
      exit 1
    fi
  done
  echo "All migrations applied successfully against temp copy."
else
  echo "Skipping temp-copy validation (no remote schema to apply against)."
fi

# ── Detect destructive operations ────────────────────────────────────
# "What counts as destructive" lives in classify-destructive.sh; here we just
# attribute each finding to the migration it came from.
DESTRUCTIVE=()

for migration in "${PENDING[@]}"; do
  sql_file="${MIGRATIONS_DIR}/${migration}/migration.sql"

  set +e
  stmts="$("${SCRIPT_DIR}/classify-destructive.sh" < "$sql_file")"
  rc=$?
  set -e

  if [[ $rc -eq 2 ]]; then
    while IFS= read -r stmt; do
      [[ -n "$stmt" ]] && DESTRUCTIVE+=("${migration}: ${stmt}")
    done <<< "$stmts"
  elif [[ $rc -ne 0 ]]; then
    echo "Error: classify-destructive.sh failed on ${migration}." >&2
    exit 1
  fi
done

if [[ ${#DESTRUCTIVE[@]} -eq 0 ]]; then
  echo "No destructive operations detected."
  exit 0
fi

echo ""
echo "WARNING: Destructive operations detected in pending migrations:"
echo ""
for op in "${DESTRUCTIVE[@]}"; do
  echo "  - ${op}"
done
echo ""
echo "Manual approval required before deployment."

exit 2
