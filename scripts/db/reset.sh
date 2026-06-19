#!/usr/bin/env bash
# Reset a database with prisma migrate reset --force.
#
# Usage: reset.sh <env>
#   env - local | staging | prod

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "${SCRIPT_DIR}/_common.sh"

validate_args 1 1 $# "reset.sh <env>"

ENV="$1"
APP_ID="$(resolve_app_id "$ENV")"

confirm "Reset ${ENV} database? This will destroy all data and re-seed."

if [[ "$APP_ID" == "local" ]]; then
  npx prisma migrate reset --force
else
  cloudron_run exec --app "$APP_ID" -- npx prisma migrate reset --force
fi

echo "Reset ${ENV} database complete."
