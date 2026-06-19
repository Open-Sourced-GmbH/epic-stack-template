#!/usr/bin/env bash
# Classify a SQL migration for destructive operations.
#
# Reads SQL from stdin and prints each destructive statement (one per line,
# leading whitespace trimmed) to stdout. A "destructive" operation is one that
# can lose committed data:
#   - DROP TABLE [IF EXISTS] ...
#   - ALTER TABLE ... DROP [COLUMN] ...
#
# Detection is line-oriented: blank lines and `--` comments are skipped, and a
# statement is only matched when it *begins* a line, so DROP/ALTER appearing
# inside string literals or mid-statement are ignored. Prisma emits one
# statement per line in SQLite migrations, which this relies on.
#
# This is the single definition of "destructive" for the deploy pipeline -
# migration-check.sh feeds each pending migration through it and attributes the
# findings. Extending coverage (e.g. flagging DELETE FROM) is a change here,
# unit-tested via classify-destructive.test.ts without any remote-pull scaffold.
#
# Usage: classify-destructive.sh < migration.sql
#
# Exit codes:
#   0 - no destructive operations
#   2 - one or more destructive operations found (printed to stdout)

set -euo pipefail

found=0

while IFS= read -r line || [[ -n "$line" ]]; do
  # Trim leading whitespace
  trimmed="${line#"${line%%[![:space:]]*}"}"

  # Skip empty lines and SQL comments
  [[ -z "$trimmed" ]] && continue
  [[ "$trimmed" == --* ]] && continue

  # DROP TABLE [IF EXISTS] ... (case-insensitive)
  if echo "$trimmed" | grep -qiE '^DROP\s+TABLE\b'; then
    echo "$trimmed"
    found=1
  # ALTER TABLE <name> DROP [COLUMN] ...
  elif echo "$trimmed" | grep -qiE '^ALTER\s+TABLE\s+\S+\s+DROP(\s+COLUMN)?\b'; then
    echo "$trimmed"
    found=1
  fi
done

if [[ "$found" -eq 1 ]]; then
  exit 2
fi
exit 0
