# Deployment

This template deploys to self-hosted [Cloudron](https://cloudron.io/), not
Fly.io. The pipeline builds a Docker image, pushes it to GHCR, and runs
`cloudron update`.

See the in-repo guides for the details:

- **[docs/claude/deployment.md](claude/deployment.md)** — the deploy pipeline,
  GHCR, and Cloudron specifics.
- **[docs/claude/environment.md](claude/environment.md)** — environment
  variables and secrets.
- **[docs/claude/database-operations.md](claude/database-operations.md)** —
  pulling, pushing, snapshotting, and migrating the production SQLite database.
- **[docs/agents/git-workflow.md](agents/git-workflow.md)** — the
  `develop → staging → main` branch model, release-please, and the GitHub
  secrets you must set.

## At a glance

| Trigger | What happens |
| --- | --- |
| Push to `staging` | CI → build image → migration check → deploy to staging Cloudron app → smoke test |
| Push tag `v*.*.*` (cut by release-please from `main`) | CI → build image → migration check → deploy to production Cloudron app |
| `manual-deploy` workflow dispatch | Build & deploy a chosen ref to staging or production |

## Decision record

The rationale for Cloudron over Fly and the branch model lives in
[docs/decisions/048-cloudron-deploy-branch-model.md](decisions/048-cloudron-deploy-branch-model.md).
