# Database Operations

This document is the single source of truth for database operations on this
project's Cloudron deployment. All scripts live in `scripts/db/` and share
helpers from `_common.sh`.

## Environment topology

| Environment    | Where                             | Database path              | Access            |
| -------------- | --------------------------------- | -------------------------- | ----------------- |
| **local**      | Developer machine                 | `prisma/data.db`           | Direct filesystem |
| **staging**    | Cloudron (`CLOUDRON_APP_STAGING`) | `/app/data/prisma/data.db` | `cloudron exec`   |
| **production** | Cloudron (`CLOUDRON_APP_PROD`)    | `/app/data/prisma/data.db` | `cloudron exec`   |

Cloudron runs each environment as a **single instance** -- no multi-region, no
LiteFS.

### Environment variables

| Variable               | Used by                                | Description                                                                   |
| ---------------------- | -------------------------------------- | ----------------------------------------------------------------------------- |
| `CLOUDRON_APP_STAGING` | All remote scripts                     | Cloudron app ID for staging                                                   |
| `CLOUDRON_APP_PROD`    | snapshot, pull, reset, migration-check | Cloudron app ID for production                                                |
| `CLOUDRON_SERVER`      | migration-check (CI)                   | Cloudron server URL for non-interactive auth                                  |
| `CLOUDRON_TOKEN`       | migration-check (CI)                   | Cloudron API token for non-interactive auth                                   |
| `DB_OPS_CONFIRM`       | All scripts                            | Set to `skip` to bypass interactive confirmation prompts (CI/non-interactive) |
| `BACKUPS_DIR`          | snapshot, pull                         | Override the backups directory (default: `<project>/backups`)                 |
| `LOCAL_UPLOADS_DIR`    | pull, push                             | Override the local uploads directory (default: `<project>/data/uploads`)      |

> **CI note:** Only `migration-check.sh` uses `cloudron_run` (which reads
> `CLOUDRON_SERVER`/`CLOUDRON_TOKEN`). All other scripts call `cloudron exec`
> directly and require an interactive `cloudron login` session on the
> developer's machine.

### Script × environment matrix

| Script               | local | staging |        prod        |
| -------------------- | :---: | :-----: | :----------------: |
| `snapshot.sh`        |   ✓   |    ✓    |         ✓          |
| `pull.sh`            |   ✗   |    ✓    |         ✓          |
| `push.sh`            |   ✗   |    ✓    | **✗ hard-blocked** |
| `reset.sh`           |   ✓   |    ✓    |         ✓          |
| `migration-check.sh` |   ✗   |    ✓    |         ✓          |

## Scripts

### `snapshot.sh <env> [name]`

Create a safe hot-copy snapshot of a SQLite database.

- **env**: `local | staging | prod`
- **name**: optional label appended to the filename
- Output: `backups/<env>-<YYYY-MM-DD-HHMMSS>[-name].db`
- Local: uses `sqlite3 .backup`
- Remote: hot-copies via `cloudron exec`, streams the file out, cleans up

### `pull.sh <env> [--with-files]`

Download a remote database, sanitize PII, and replace the local dev database.

- **env**: `staging | prod` (pulling from local is blocked)
- **--with-files**: also pull `/app/data/uploads` into `./data/uploads`
- Steps:
  1. Downloads remote DB via Cloudron hot copy
  2. Runs `sanitize.sql` to wipe auth tables and anonymize user PII
  3. Auto-snapshots the current local DB (`pre-pull` label)
  4. Replaces `prisma/data.db` with the sanitized copy
  5. _(--with-files)_ Snapshots existing local uploads to
     `backups/local-uploads-*-pre-pull.tar.gz`, then merges remote uploads into
     `./data/uploads` via `tar` over `cloudron exec`

File sync uses **merge** semantics - files that no longer exist remotely are
kept locally. The pre-pull tar.gz is the rollback path.

### `push.sh <env> [--with-files]`

Push local `prisma/data.db` to a remote environment.

- **env**: `staging` only -- **production is hard-blocked**
- **--with-files**: also push `./data/uploads` to `/app/data/uploads` (extra
  confirmation prompt)
- Streams the local database file into the remote container via `cloudron exec`
- With `--with-files`: pipes a `tar` of local uploads into the remote container
  - merge semantics, no remote backup, so confirm carefully

### `reset.sh <env>`

Run `prisma migrate reset --force` on the target environment.

- **env**: `local | staging | prod`
- Destroys all data and re-seeds from the seed script

### `migration-check.sh <env>`

Check pending Prisma migrations for destructive operations before deployment.

- **env**: `staging | prod` (local is blocked)
- Steps:
  1. Pulls the remote schema via `cloudron exec`
  2. Finds pending migrations by comparing local files against applied list
  3. Applies pending migrations against a temp copy for validation
  4. Scans for `DROP TABLE` and `ALTER TABLE ... DROP COLUMN`
- Exit codes: `0` = safe, `1` = error, `2` = destructive operations detected

### `sanitize.sql`

SQL script that sanitizes a pulled database:

- Deletes: `Password`, `Session`, `Connection`, `Passkey`, `Verification`
- Anonymizes: `User.email` and `User.name` for non-admin users (preserves
  usernames, roles, permissions, and your app's content tables)

### `_common.sh`

Shared shell helpers sourced by all scripts:

- `resolve_app_id <env>` -- maps environment name to Cloudron app ID
- `validate_args` -- argument count validation
- `confirm` -- interactive confirmation (skipped when `DB_OPS_CONFIRM=skip` or
  non-TTY)
- `cloudron_run` -- wraps `cloudron` with optional `--server`/`--token` from env
  vars (for CI)
- `ensure_backups_dir` -- creates `backups/` directory
- `generate_snapshot_filename` -- generates timestamped filenames

## Hard rules

1. **Never push to production.** `push.sh` hard-blocks `prod` and `production`
   targets. Production database changes go through CI/CD migrations only.
2. **Always sanitize on pull.** `pull.sh` automatically runs `sanitize.sql` --
   pulled databases never contain real passwords, sessions, or PII.
3. **Widen-then-narrow for migrations.** Deploy schema changes in stages to
   avoid breaking running instances:
   - Widen app to consume old and new schema
   - Widen DB to provide both (migration adds new columns/tables)
   - Narrow app to consume only new schema
   - Narrow DB to remove old schema (separate migration)
4. **Snapshot before destructive operations.** `pull.sh` auto-snapshots;
   manually run `snapshot.sh local` before `reset.sh`.
5. **Destructive migrations are flagged.** `migration-check.sh` detects
   `DROP TABLE` and `DROP COLUMN` and exits with code 2, which emits a CI
   warning and step summary. Deployment proceeds but the warning is visible in
   the workflow run.

## CI integration

Both `deploy-staging.yml` and `deploy-production.yml` run `migration-check.sh`
as a CI job:

- If exit code is 0: deployment proceeds normally
- If exit code is 2: a warning annotation and step summary are emitted, but
  deployment proceeds
- If exit code is 1: the pipeline fails

The migration check uses `CLOUDRON_SERVER` and `CLOUDRON_TOKEN` secrets for
non-interactive Cloudron authentication via `cloudron_run`.

## Backup and restore (Cloudron)

### Creating a backup

```bash
# Snapshot from any environment
bash scripts/db/snapshot.sh staging pre-deploy
bash scripts/db/snapshot.sh prod before-migration
```

Snapshots are saved to `backups/` (git-ignored). For production backups,
Cloudron also provides its own backup system via the dashboard.

### Restoring a backup

To restore a staging database from a snapshot:

```bash
# Push a backup file to staging
cp backups/staging-2026-04-07-120000.db prisma/data.db
bash scripts/db/push.sh staging
```

Production restores should use Cloudron's built-in restore feature or be handled
manually with `cloudron exec`.

## Common workflows

### Pull staging data for local development

```bash
bash scripts/db/pull.sh staging
# Or, to also sync uploaded images/files:
bash scripts/db/pull.sh staging --with-files
```

### Reset staging to a clean state

```bash
bash scripts/db/reset.sh staging
```

### Test a migration before deploying

```bash
bash scripts/db/migration-check.sh staging
```

### Push local database to staging

```bash
bash scripts/db/push.sh staging
```
