<div align="center">
  <h1 align="center">Open-Sourced Epic Stack Template 🚀</h1>
  <strong align="center">
    A <a href="https://www.epicweb.dev/epic-stack">Epic Stack</a> starter
    pre-wired the Open-Sourced way: pnpm, Cloudron deployment, a
    conventional-commits release flow, and a full Claude/AI setup.
  </strong>
</div>

<hr />

This template extends
[Kent C. Dodds' Epic Stack](https://www.epicweb.dev/epic-stack) with three
things every Open-Sourced project needs from day one:

1. **Git workflows** — conventional commits, `release-please`, and a
   `develop → staging → main` promote flow with reusable CI/deploy workflows.
2. **Open-sourced deployment** — ship a Docker image to GHCR and deploy to
   self-hosted [Cloudron](https://cloudron.io/) (no Fly.io/LiteFS).
3. **AI setup** — `CLAUDE.md`, agent docs under `docs/agents/`, the Epic Stack
   `epic-*` skills, and a grill → PRD → design → issues → implement pipeline
   with a styleguide synced to Claude Design.

## Quick start

```sh
pnpm install
cp .env.example .env
pnpm dev            # http://localhost:3000
pnpm validate       # full CI check: test + lint + typecheck + e2e
```

Requires Node (see `.nvmrc`) and pnpm (via Corepack: `corepack enable`).

## 🛠 Make it yours

After creating a repo from this template, replace the placeholders below. Search
the tree for `example.com` and `com.example.app` to find them all.

| What                            | Where                                                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| App name & version              | `package.json` (`name`, `version`)                                                                                               |
| Cloudron app id / title / urls  | `CloudronManifest.json`                                                                                                          |
| Production & staging hostnames  | `.github/workflows/deploy-production.yml`, `deploy-staging.yml`, `manual-deploy.yml` (`cloudron_app_location`, `manifest_title`) |
| Smoke-test base URL             | `scripts/smoke-test.ts`                                                                                                          |
| Project intro & domain notes    | `CLAUDE.md`, `docs/agents/domain.md`                                                                                             |
| Issue-tracker team placeholders | `docs/agents/linear-issues.md`, `issue-tracker.md`, `triage-labels.md`                                                           |

The GHCR image name is derived automatically from the GitHub repository — no
edit needed.

### Agent skills config

The agent config under `docs/agents/` (issue tracker, triage labels, domain doc
layout) ships **pre-filled for Linear**, so the engineering skills work out of
the box once you replace `<YOUR_TEAM>`.

- **Keeping Linear** → just swap the `<YOUR_TEAM>` placeholders above. Nothing
  else to run.
- **Switching tracker, labels, or domain layout** → run
  `/setup-matt-pocock-skills` to regenerate
  `docs/agents/{issue-tracker,triage-labels,domain}.md`. It defaults to GitHub
  (this repo's remote) — pick **Other** to keep Linear, or GitHub/GitLab/local
  to switch.

### Repo & infra setup (one-time, can't be scripted)

- **Branches**: make `develop` the default branch; create `staging`. Protect all
  three. Configure `develop→staging` and `staging→main` promote PRs to **merge
  (not squash)** — see
  [docs/agents/git-workflow.md](docs/agents/git-workflow.md).
- **GitHub secrets**: `CLOUDRON_SERVER`, `CLOUDRON_TOKEN`,
  `CLOUDRON_APP_STAGING`, `CLOUDRON_APP_PROD`, `RELEASE_PLEASE_TOKEN`.
- **GHCR**: enable GitHub Packages and let Actions publish the image.
- **Cloudron**: provision a staging and a production app.

## Design pipeline

Feature design stays grounded in the real component system instead of a parallel
mockup. The living `/styleguide` route (dev-only) is the source of truth;
publish it to [Claude Design](https://claude.ai/design) with
`pnpm styleguide:snapshot` → `/design-sync`. Per feature:

```
/grill-with-docs → /to-prd → /to-design → [Claude Design] → /to-grounded-design → /to-issues
```

`/to-design` seeds the exploration from the real components and tokens;
`/to-grounded-design` reconciles the handoff back against them. See
[docs/agents/styleguide.md](docs/agents/styleguide.md).

## Docs

- [docs/agents/](docs/agents/) — how to work in this repo (conventions, git
  workflow, issue + design pipeline)
- [docs/claude/](docs/claude/) — deployment, database ops, environment
- [docs/decisions/](docs/decisions/) — architecture decision records
- [Upstream Epic Stack docs](https://github.com/epicweb-dev/epic-stack/blob/main/docs)

## Credits

Built on [The Epic Stack](https://www.epicweb.dev/epic-stack) by
[Kent C. Dodds](https://kentcdodds.com) and
[contributors](https://github.com/epicweb-dev/epic-stack/graphs/contributors).
