# Epic App

> Rename this and the description below for your project.

An application built on the [Epic Stack](https://www.epicweb.dev/epic-stack),
deployed to [Cloudron](https://cloudron.io/).

Package manager: **pnpm**.

## Commands

```bash
pnpm dev               # Dev server with mocks (localhost:3000)
pnpm typecheck         # react-router typegen + tsc
pnpm test              # Vitest (watch mode)
pnpm test:e2e:run      # Playwright headless
pnpm validate          # test + lint + typecheck + e2e (full CI check)
```

## Working in this repo

- [Code conventions](docs/agents/code-conventions.md) - path aliases, file
  naming, SSR, design tokens
- [Git workflow](docs/agents/git-workflow.md) - conventional commits,
  develop → staging → main promote flow, release-please
- [Issue conventions](docs/agents/linear-issues.md) - labels, priorities, PRDs
- [Skills pipeline](docs/agents/skills-pipeline.md) - PRD → grill → issues →
  implement → PR

## Operational references

- [Issue tracker tooling](docs/agents/issue-tracker.md) - Linear MCP tool
  mapping
- [Triage label mapping](docs/agents/triage-labels.md) - canonical roles ↔
  Linear statuses/labels
- [Domain docs](docs/agents/domain.md) - project domain notes (ADRs live in
  `docs/decisions/`)
- [docs/claude/](docs/claude/) - Epic Stack conventions, deployment, database
