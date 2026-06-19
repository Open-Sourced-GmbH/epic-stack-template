---
name: epic-deployment
description:
  Guide on deployment with Cloudron, environment setup, and CI/CD for an Epic Stack app
categories:
  - deployment
  - cloudron
  - ci-cd
  - docker
---

# Deployment

## When to use this skill

Use this skill when you need to:

- Configure deployment on Cloudron
- Work with the Cloudron app manifest or Dockerfile
- Manage environment variables and secrets in production
- Configure CI/CD with GitHub Actions
- Work with database backups and persistence

## Target platform: Cloudron

The production deployment target is [Cloudron](https://cloudron.io/) — a self-hosted PaaS. **Not Fly.io.** This template ships the Cloudron packaging (`Dockerfile`, `CloudronManifest.json`, `start.sh`); there is no `fly.toml` or LiteFS.

### Cloudron architecture

- **Single instance** — no multi-region, no LiteFS, no Consul
- **Reverse proxy and TLS** provided by Cloudron
- **Backups** managed by Cloudron's built-in backup system
- **Environment variables** configured via Cloudron dashboard
- **Persistent data** lives in `/app/data/` (Cloudron's data directory)

### Cloudron app manifest

Cloudron apps are packaged with a `CloudronManifest.json`:

```json
{
  "id": "com.example.app",
  "title": "Epic App",
  "version": "1.0.0",
  "dockerImage": "",
  "healthCheckPath": "/resources/healthcheck",
  "httpPort": 3000,
  "addons": { "localstorage": {}, "sendmail": {} },
  "manifestVersion": 2,
  "description": "An Epic Stack application",
  "tagline": "Built on the Epic Stack",
  "website": "https://app.example.com",
  "minBoxVersion": "7.0.0"
}
```

### Database persistence

SQLite databases must be stored in Cloudron's persistent data directory:

```bash
DATABASE_PATH=/app/data/sqlite.db
DATABASE_URL=file:/app/data/sqlite.db?connection_limit=1
CACHE_DATABASE_PATH=/app/data/cache.db
```

### Healthcheck

The existing healthcheck at `/resources/healthcheck` works with Cloudron's `healthCheckPath`.

## Patterns and conventions

### Deployable Commits

Every commit to the main branch should be deployable:

- Code must be in a working state
- Tests must pass
- The application must build successfully
- No WIP or TODO commits that break the build

### Small and Short-Lived PRs

- **Small** — one feature or fix per PR
- **Short-lived** — merge within a day or two
- **Reviewable** — reviewable in 30 minutes or less
- **Independent** — each PR is independently deployable

When PRs get too large, split into smaller PRs or use feature flags to merge incrementally.

### Environment variables

Secrets are managed via the Cloudron dashboard — never commit them to the repo.

Required secrets:
- `SESSION_SECRET` — session cookie signing
- `HONEYPOT_SECRET` — honeypot form protection
- `INTERNAL_COMMAND_TOKEN` — internal cache-sync

See [docs/claude/environment.md](../../../docs/claude/environment.md) for the full list.

### GitHub Actions CI/CD

CI runs `pnpm validate` on pull requests to keep every change in a deployable state. There is no deploy-on-push-to-main: releases flow through a develop → staging → main promotion chain. Promotions are merge commits (not squashes) so the underlying `feat:`/`fix:` commits stay visible and drive release-please, which cuts the release on `main`.

```yaml
# Validate workflow — runs pnpm validate on pull requests
name: Validate

on:
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: pnpm install --frozen-lockfile
      - run: pnpm validate
```

> **Note**: Automated deployment from CI to Cloudron is not yet configured. Currently, deployment is manual via `cloudron update`.

## Common mistakes to avoid

- **Non-deployable commits** — every commit to main must be deployable
- **Large, long-lived PRs** — keep PRs small and merge quickly
- **Secrets in code** — never commit secrets; use the Cloudron dashboard
- **Database outside /app/data/** — SQLite files must be in Cloudron's persistent directory or they will be lost on restart
- **Using Fly.io patterns** — no LiteFS, no Consul, no multi-region. This is a single-instance Cloudron app
- **Deploy breaking schema changes without strategy** — use "widen then narrow" for migrations

## References

- [Cloudron Documentation](https://docs.cloudron.io/)
- [Cloudron App Packaging Guide](https://docs.cloudron.io/packaging/tutorial/)
- [docs/claude/environment.md](../../../docs/claude/environment.md) — environment variables
- [docs/claude/deployment.md](../../../docs/claude/deployment.md) — deployment overview
- `other/Dockerfile` — build Dockerfile
