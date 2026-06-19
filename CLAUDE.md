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
- [Git workflow](docs/agents/git-workflow.md) - conventional commits, develop →
  staging → main promote flow, release-please
- [Issue conventions](docs/agents/linear-issues.md) - labels, priorities, PRDs
- [Skills](docs/agents/skills-pipeline.md) - process skills (PRD → grill →
  issues → implement → PR) and the `epic-*` domain skills
- [Styleguide & Claude Design](docs/agents/styleguide.md) - the design-system
  source of truth and the `/to-design` → `/to-grounded-design` design lane

## Operational references

- [Issue tracker tooling](docs/agents/issue-tracker.md) - Linear MCP tool
  mapping
- [Triage label mapping](docs/agents/triage-labels.md) - canonical roles ↔
  Linear statuses/labels
- [Domain docs](docs/agents/domain.md) - project domain notes
- [Operational runbooks](docs/claude/README.md) - deployment, database, and
  environment specifics for this Cloudron app
- [Architecture decisions](docs/decisions/README.md) - indexed ADRs

## Agent skills

Config the engineering skills (`to-issues`, `to-prd`, `triage`, `tdd`,
`grill-with-docs`, `to-design`, `to-grounded-design`, …) read to learn this
repo's conventions. Re-run `/setup-matt-pocock-skills` to regenerate these (see
[skills-pipeline.md](docs/agents/skills-pipeline.md)).

When you finish running any lifecycle skill, always end your reply by inviting
the user to the correct next step per the **Handoffs** table in
[skills-pipeline.md](docs/agents/skills-pipeline.md) (e.g. `/to-prd` → `/to-design`
or `/to-issues`). The four core skills are global and can't carry this in-skill,
so the invitation comes from here.

The design lane (`to-design` → [Claude Design](https://claude.ai/design) →
`to-grounded-design`) grounds feature design in the living `/styleguide` route;
see [styleguide.md](docs/agents/styleguide.md).

### Issue tracker

Issues and PRDs live in **Linear** (`mcp__linear__*` tools, not `gh`). See
[`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md).

### Triage labels

Canonical triage roles map to this repo's Linear statuses/labels. See
[`docs/agents/triage-labels.md`](docs/agents/triage-labels.md).

### Domain docs

Single-context, flat: domain notes plus `docs/decisions/` ADRs. See
[`docs/agents/domain.md`](docs/agents/domain.md).
