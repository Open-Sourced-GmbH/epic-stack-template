# Git workflow

## Conventional commits

Subject format:

```
type(scope): description
```

Allowed types: `feat`, `fix`, `chore`, `refactor`, `style`, `docs`.

Commits feed `release-please`, which rejects bare subjects (e.g. `update skills`).
**Always include the `type:` prefix.**

## Branch model: develop → staging → main

Three long-lived branches, each with a deploy consequence:

| Branch | Role | Deploy |
| --- | --- | --- |
| `develop` | Default branch; feature PRs merge here | none |
| `staging` | Pre-production | push → deploys to the staging Cloudron app + smoke test |
| `main` | Production source of truth | `release-please` opens a release PR; merging it tags `v*.*.*` → deploys production |

Promote by opening a PR `develop → staging`, then `staging → main`.

> **Promote PRs must be merge commits, not squashed.** Squashing collapses the
> individual `feat:`/`fix:` commits, and `release-please` reads those commits to
> decide the version bump and changelog. `release-please` is pinned to
> `target-branch: main`.

## Release flow

1. Land `feat:`/`fix:` commits on `develop`.
2. Promote `develop → staging` (merge commit) → staging deploy.
3. Promote `staging → main` (merge commit).
4. `release-please` opens/updates a release PR on `main`, bumping the version in
   `package.json` + `CloudronManifest.json` and updating `CHANGELOG.md`.
5. Merge the release PR → a `v*.*.*` tag is pushed → production deploy.

## Required GitHub secrets

Set these in repo settings for the deploy workflows to work:

| Secret | Used by |
| --- | --- |
| `CLOUDRON_SERVER` | all deploys + migration check |
| `CLOUDRON_TOKEN` | all deploys + migration check |
| `CLOUDRON_APP_STAGING` | staging migration check |
| `CLOUDRON_APP_PROD` | production migration check |
| `RELEASE_PLEASE_TOKEN` | `release-please.yml` (a PAT, so release PRs trigger CI) |

The GHCR image is published with the built-in `GITHUB_TOKEN`; enable GitHub
Packages write for Actions.

See [docs/decisions/024-cloudron-deploy-branch-model.md](../decisions/024-cloudron-deploy-branch-model.md)
for the rationale.
