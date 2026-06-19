#!/bin/bash

set -eu

# Ensure data directory is owned by cloudron user
chown -R cloudron:cloudron /app/data

# Load environment variables from Cloudron localstorage if available.
# Place a .env file in /app/data/ to set secrets like
# SESSION_SECRET, SENTRY_DSN, etc.
if [ -f /app/data/.env ]; then
  set -a
  . /app/data/.env
  set +a
fi

# Database paths (Cloudron persistent storage)
# Mirrors local layout: prisma/data.db, other/cache.db
mkdir -p /app/data/prisma /app/data/other
export DATABASE_FILENAME="data.db"
export DATABASE_PATH="/app/data/prisma/${DATABASE_FILENAME}"
export DATABASE_URL="file:${DATABASE_PATH}"
export CACHE_DATABASE_PATH="/app/data/other/cache.db"

# Migrate legacy DB location (one-time)
if [[ -f /app/data/sqlite.db && ! -f "$DATABASE_PATH" ]]; then
  echo "Migrating database from /app/data/sqlite.db → ${DATABASE_PATH}"
  mv /app/data/sqlite.db "$DATABASE_PATH"
fi
if [[ -f /app/data/cache.db && ! -f "$CACHE_DATABASE_PATH" ]]; then
  mv /app/data/cache.db "$CACHE_DATABASE_PATH"
fi

# Generate fallback secrets if not provided (warn in logs)
if [ -z "${SESSION_SECRET:-}" ]; then
  echo "WARNING: SESSION_SECRET not set - generating random fallback (sessions will not survive restarts)"
  export SESSION_SECRET=$(openssl rand -hex 32)
fi

if [ -z "${HONEYPOT_SECRET:-}" ]; then
  echo "WARNING: HONEYPOT_SECRET not set - generating random fallback"
  export HONEYPOT_SECRET=$(openssl rand -hex 32)
fi

if [ -z "${INTERNAL_COMMAND_TOKEN:-}" ]; then
  echo "WARNING: INTERNAL_COMMAND_TOKEN not set - generating random fallback"
  export INTERNAL_COMMAND_TOKEN=$(openssl rand -hex 32)
fi

export NODE_ENV=production

# Ensure uploads directory exists
mkdir -p /app/data/uploads

# Run database migrations
npx prisma migrate deploy

# Seed runs manually post-deploy via `cloudron exec` - the seed script
# depends on devDependencies (tsx, @faker-js/faker) and fixtures in tests/
# that are not shipped in the production image.

# Set WAL mode for better concurrency
sqlite3 "${DATABASE_PATH}" "PRAGMA journal_mode = WAL;"
sqlite3 "${CACHE_DATABASE_PATH}" "PRAGMA journal_mode = WAL;"

exec gosu cloudron:cloudron node --experimental-strip-types index.ts
