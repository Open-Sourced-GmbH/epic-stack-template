# Deployment - Cloudron

The production deployment target is [Cloudron](https://cloudron.io/)
(self-hosted PaaS), **not Fly.io**. The app is built into a Docker image
(`Dockerfile`), pushed to GHCR, and deployed with `cloudron update`. See the
`epic-deployment` skill for the full conventions and
[docs/agents/git-workflow.md](../agents/git-workflow.md) for the branch model
and the GitHub secrets the deploy workflows need.

## Key considerations

- Cloudron apps run as a **single instance** - no multi-region or LiteFS needed
- Cloudron provides its own reverse proxy, TLS, and backup system
- Environment variables / secrets are configured via the Cloudron dashboard, or
  via a `.env` file placed in `/app/data/` (read by `start.sh` on boot)
- SQLite database files live in Cloudron's persistent data directory
  (`/app/data/`), set up by `start.sh` and run in WAL mode
- Migrations run on boot (`prisma migrate deploy` in `start.sh`); a pre-deploy
  `_migration-check.yml` job flags destructive operations first

## Pipeline

| Trigger | Result |
| --- | --- |
| Push to `staging` | CI → build & push image → migration check → `cloudron update` staging → smoke test |
| Tag `v*.*.*` (release-please from `main`) | CI → build & push image → migration check → `cloudron update` production |
| `manual-deploy` dispatch | Build & deploy a chosen ref to staging or production |

The Docker image name is derived automatically from the GitHub repository
(lowercased) in `_shared-build-deploy.yml`.

## Scheduled jobs

If your app needs cron, drive it from an external scheduler (Cloudron's cron or
n8n) hitting an authenticated resource endpoint, e.g. authorize with
`Authorization: Bearer $CRON_SECRET`. Document each job here as you add it:

| Schedule (Europe/Zurich) | Endpoint | Purpose |
| --- | --- | --- |
| _example_ `0 3 * * *` | `POST /resources/your-cron` | _what it does_ |
