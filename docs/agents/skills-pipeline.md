# Skills

Two kinds of skills are available in this repo: **process skills** that drive the
feature lifecycle, and **domain skills** that carry Epic Stack know-how.

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

These skills publish to the issue tracker described in
[`issue-tracker.md`](./issue-tracker.md) and follow the conventions in
[`linear-issues.md`](./linear-issues.md).

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
