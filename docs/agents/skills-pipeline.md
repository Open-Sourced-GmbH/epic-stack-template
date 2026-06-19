# Skills

Two kinds of skills are available in this repo: **process skills** that drive the
feature lifecycle, and **domain skills** that carry Epic Stack know-how.

## Setup: `/setup-matt-pocock-skills`

The process skills below read their config from `docs/agents/` (issue tracker,
triage labels, domain layout) and the `## Agent skills` block in
[`../../CLAUDE.md`](../../CLAUDE.md). This template ships those **pre-filled for
Linear**, so nothing needs running to get started — just replace the
`<YOUR_TEAM>` placeholders.

Run `/setup-matt-pocock-skills` only to **reconfigure** — switching issue
tracker, triage-label vocabulary, or domain-doc layout. It regenerates
`docs/agents/{issue-tracker,triage-labels,domain}.md` and the CLAUDE.md block.
It defaults to GitHub (this repo's remote); pick **Other** to keep Linear, or
GitHub/GitLab/local to switch.

## Process skills (feature lifecycle)

```
/grill-with-docs → /to-prd → /to-issues → implement → PR
```

- `/grill-with-docs` stress-tests the idea against the project's domain model and
  documented decisions **first**, before it's written up. Prefer it over the
  generic `/grill-me`, which has no project context.
- `/to-prd` turns the grilled context into a PRD and publishes it to the tracker.
- `/to-issues` breaks the PRD into independently-grabbable, vertical-slice issues.
- `/tdd` slots into the **implement** step (red → green → refactor).
- `/triage` is standalone for bug/feature intake.

### Handoffs (invite the next step)

Always end a lifecycle skill by inviting the user to the correct next step — the
flow lives here, not (for the four core skills) inside the skill text. The
`to-design` / `to-grounded-design` skills are repo-scoped and carry their own
`## Next step`; the four core skills are global (`~/.claude/skills/`) and a
same-name repo copy would **not** override them ([personal overrides
project](https://code.claude.com/docs/en/skills)), so honour these handoffs from
here instead:

| After this skill   | Invite                                                              |
| ------------------ | ------------------------------------------------------------------ |
| `/grill-with-docs` | `/to-prd` (once terms + decisions are settled)                     |
| `/to-prd`          | `/to-design` if the feature has UI; otherwise `/to-issues`         |
| `/to-design`       | export the Claude Design handoff, then `/to-grounded-design`       |
| `/to-grounded-design` | update the PRD with grounding decisions, then `/to-issues`       |
| `/to-issues`       | implement each slice with `/tdd`                                    |
| `/tdd`             | open a PR per [`git-workflow.md`](./git-workflow.md)               |

These skills publish to the issue tracker described in
[`issue-tracker.md`](./issue-tracker.md) and follow the conventions in
[`linear-issues.md`](./linear-issues.md).

## Design foundation (styleguide → Claude Design)

A separate, occasional lane that keeps [Claude Design](https://claude.ai/design)
in sync with the real components, so feature design starts grounded in the
shipping system instead of a parallel mockup:

```
ui/* or token change → pnpm design-sync:prepare → /design-sync (publish, incremental)
```

The living [`/styleguide`](./styleguide.md) route is the source of truth; the
snapshot is its published mirror. Re-run after any `ui/*` component or
`tailwind.css` token change. See [`styleguide.md`](./styleguide.md) for the full
cadence and requirements.

Per feature, design slots into the lifecycle between the PRD and issues:

```
/grill-with-docs → /to-prd → /to-design → [Claude Design: explore + export handoff]
                                → /to-grounded-design → update PRD → /to-issues → implement → PR
```

- `/to-design` — turns the PRD into a design brief seeded with the repo's
  existing tokens + `ui/*` components, so exploration starts grounded.
- `/to-grounded-design` — reconciles the Claude Design handoff against the
  [styleguide](./styleguide.md): maps each element to an existing component and
  every color/space/radius to an existing token, and flags net-new pieces so the
  issues carry concrete component/token references.

Both live in-repo at `.claude/skills/` (alongside the `epic-*` skills) so
template instances inherit them.

## Domain skills (Epic Stack know-how)

Reach for these when working in the matching area — each one carries the Epic
Stack conventions so you don't re-derive them from the code:

| Skill                 | Use when working on                              |
| --------------------- | ------------------------------------------------ |
| `epic-auth`           | authentication, sessions, OAuth, 2FA, passkeys   |
| `epic-permissions`    | the RBAC / permissions system                    |
| `epic-database`       | Prisma, SQLite, database patterns                |
| `epic-routing`        | React Router, `react-router-auto-routes`         |
| `epic-forms`          | forms with Conform, validation with Zod          |
| `epic-caching`        | cachified, SQLite cache, LRU cache               |
| `epic-security`       | CSP, rate limiting, session security             |
| `epic-testing`        | Vitest + Playwright                              |
| `epic-react-patterns` | React patterns, performance, code quality        |
| `epic-ui-guidelines`  | UI/UX, accessibility, component usage            |
| `epic-deployment`     | Cloudron deployment, environment setup, CI/CD    |

These overlap with the operational runbooks under [`../claude/`](../claude/): the
skills are the general how-to guides; `docs/claude/` holds this project's
concrete, deployment-specific procedures. When they disagree, `docs/claude/`
wins for anything Cloudron- or this-deployment-specific.
