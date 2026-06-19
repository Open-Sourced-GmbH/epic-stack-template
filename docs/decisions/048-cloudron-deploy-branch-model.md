# Cloudron deployment + develop → staging → main branch model

Date: 2026-06-18

Status: accepted (supersedes the Fly.io deploy of
[004](004-github-actions.md)/[009](009-region-selection.md) for this template)

## Context

The upstream Epic Stack deploys to Fly.io with LiteFS and a single monolithic
`deploy.yml`. The Open Sourced fleet deploys to self-hosted
[Cloudron](https://cloudron.io/) instead, and runs a conventional-commits +
release-please release flow across three long-lived branches. This template
codifies that setup so every new project starts from it.

## Decision

- **Deploy to Cloudron**, not Fly. The app is shipped as a Docker image to GHCR
  and `cloudron update`d. Artifacts: `Dockerfile` (2-stage, `cloudron/base`
  runtime), `CloudronManifest.json`, `start.sh`, and the reusable
  `_shared-build-deploy.yml` workflow.
- **Three branches**: `develop` (default, where work lands) →
  `staging` (push deploys to the staging Cloudron app) →
  `main` (release-please cuts a tag → tag push deploys to production).
- **Conventional commits** are mandatory; release-please runs on `main`
  (`target-branch: main`) and maintains `CHANGELOG.md` + the version in
  `package.json`/`CloudronManifest.json`.
- **Promote PRs (`develop`→`staging`, `staging`→`main`) must be merge commits,
  not squashed**, so the individual `feat:`/`fix:` commits survive for
  release-please to read.
- **`package.json` version is the single source of truth**; the
  `deployment-metadata` action asserts `CloudronManifest.json` matches it.

## Consequences

- A push to `staging` and a `v*.*.*` tag are the two deploy triggers; there is
  also a `manual-deploy.yml` for ad-hoc deploys.
- Migrations are checked before deploy (`_migration-check.yml`) and run on boot
  inside `start.sh`.
- LiteFS multi-region replication is dropped; Cloudron runs a single instance
  with SQLite in WAL mode on persistent storage. `litefs-js` remains in
  dependencies but is inert (no `LITEFS_DIR`), so server code is unchanged.
- Adopters must provision two Cloudron apps and set the GitHub secrets listed in
  [docs/agents/git-workflow.md](../agents/git-workflow.md).
