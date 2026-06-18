#!/usr/bin/env bash
# Shared helpers for database operations scripts.
# Source this file - do not execute directly.

set -euo pipefail

# ── Paths ──────────────────────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export BACKUPS_DIR="${BACKUPS_DIR:-${PROJECT_ROOT}/backups}"
# Local uploads directory - mirrors Cloudron /app/data/uploads.
# Overridable for tests so they don't pollute the dev tree.
export LOCAL_UPLOADS_DIR="${LOCAL_UPLOADS_DIR:-${PROJECT_ROOT}/data/uploads}"
# Local SQLite paths - overridable for tests so they don't clobber the dev DB.
export LOCAL_DB="${LOCAL_DB:-${PROJECT_ROOT}/prisma/data.db}"
export LOCAL_DB_TMP="${LOCAL_DB_TMP:-${PROJECT_ROOT}/prisma/data-pull-tmp.db}"
# Remote uploads path inside Cloudron containers
REMOTE_UPLOADS_PATH="/app/data/uploads"

# ── Load .env if present (for CLOUDRON_APP_* and other local config) ──
# Vars already set in the environment take precedence over .env values -
# otherwise tests and CI env overrides would be silently clobbered.
if [[ -f "${PROJECT_ROOT}/.env" ]]; then
  while IFS= read -r _env_line || [[ -n "$_env_line" ]]; do
    [[ -z "$_env_line" || "$_env_line" =~ ^[[:space:]]*# ]] && continue
    [[ "$_env_line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]] || continue
    _env_key="${BASH_REMATCH[1]}"
    _env_val="${BASH_REMATCH[2]}"
    if [[ "$_env_val" =~ ^\"(.*)\"$ ]] || [[ "$_env_val" =~ ^\'(.*)\'$ ]]; then
      _env_val="${BASH_REMATCH[1]}"
    fi
    # Only export if not already defined (empty counts as defined).
    if [[ -z "${!_env_key+x}" ]]; then
      export "$_env_key=$_env_val"
    fi
  done < "${PROJECT_ROOT}/.env"
  unset _env_line _env_key _env_val
fi

# ── Cloudron app IDs (set via env vars or .env) ───────────────────────
CLOUDRON_APP_PROD="${CLOUDRON_APP_PROD:-}"
CLOUDRON_APP_STAGING="${CLOUDRON_APP_STAGING:-}"

# Remote database path inside Cloudron containers
REMOTE_DB_PATH="/app/data/prisma/data.db"

# ── Functions ──────────────────────────────────────────────────────────

# Resolve an environment name to a Cloudron app ID.
# Usage: resolve_app_id <env>
# Returns "local" for local, or the Cloudron app ID for remote envs.
resolve_app_id() {
  local env="$1"
  case "$env" in
    local)
      echo "local"
      ;;
    staging)
      if [[ -z "$CLOUDRON_APP_STAGING" ]]; then
        echo "Error: CLOUDRON_APP_STAGING is not set." >&2
        exit 1
      fi
      echo "$CLOUDRON_APP_STAGING"
      ;;
    prod|production)
      if [[ -z "$CLOUDRON_APP_PROD" ]]; then
        echo "Error: CLOUDRON_APP_PROD is not set." >&2
        exit 1
      fi
      echo "$CLOUDRON_APP_PROD"
      ;;
    *)
      echo "Error: Unknown environment '${env}'. Use: local, staging, prod" >&2
      exit 1
      ;;
  esac
}

# Validate that the number of positional arguments is within range.
# Usage: validate_args <min> <max> <actual> <usage_string>
validate_args() {
  local min="$1" max="$2" actual="$3" usage="$4"
  if (( actual < min || actual > max )); then
    echo "Usage: ${usage}" >&2
    exit 1
  fi
}

# Prompt the user for confirmation.
# Skipped when stdin is not a terminal or DB_OPS_CONFIRM=skip.
# Usage: confirm "Are you sure?"
confirm() {
  local message="$1"

  if [[ ! -t 0 ]] || [[ "${DB_OPS_CONFIRM:-}" == "skip" ]]; then
    return 0
  fi

  printf "%s [y/N] " "$message" >&2
  read -r response
  case "$response" in
    [yY]|[yY][eE][sS]) return 0 ;;
    *) echo "Aborted." >&2; exit 1 ;;
  esac
}

# Run a cloudron command with optional --server/--token from env vars.
# Enables the same scripts to work locally (where cloudron is authenticated)
# and in CI (where CLOUDRON_SERVER/CLOUDRON_TOKEN env vars are set).
cloudron_run() {
  local args=()
  [[ -n "${CLOUDRON_SERVER:-}" ]] && args+=(--server "$CLOUDRON_SERVER")
  [[ -n "${CLOUDRON_TOKEN:-}" ]] && args+=(--token "$CLOUDRON_TOKEN")
  cloudron "${args[@]}" "$@"
}

# Ensure the backups directory exists.
ensure_backups_dir() {
  mkdir -p "$BACKUPS_DIR"
}

# Generate a timestamped snapshot filename.
# Usage: generate_snapshot_filename <env> [name]
# Output: <env>-<YYYY-MM-DD-HHMMSS>[-name].db
generate_snapshot_filename() {
  local env="$1"
  local name="${2:-}"
  local timestamp
  timestamp="$(date +%Y-%m-%d-%H%M%S)"

  if [[ -n "$name" ]]; then
    echo "${env}-${timestamp}-${name}.db"
  else
    echo "${env}-${timestamp}.db"
  fi
}
