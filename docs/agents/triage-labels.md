# Triage Labels

The skills speak in terms of five canonical triage roles. Linear (your team)
expresses these through a mix of **labels** and **statuses**. This file maps the
roles to what's actually configured - adjust the table to your team's labels.

| Canonical role    | Linear expression                   | Meaning                                  |
| ----------------- | ----------------------------------- | ---------------------------------------- |
| `needs-triage`    | Status `Backlog` (no `Ralph Ready`) | Maintainer needs to evaluate this issue  |
| `needs-info`      | Status `Backlog` + comment with ask | Waiting on reporter for more information |
| `ready-for-agent` | Status `Todo` + label `Ralph Ready` | Fully specified, AFK-ready for an LLM    |
| `ready-for-human` | Status `Todo` (no `Ralph Ready`)    | Needs human implementation               |
| `wontfix`         | Status `Cancelled`                  | Will not be actioned                     |

## How to apply

- `Backlog` is the default status on creation; do not set anything higher
  without confirming the issue is concrete and self-contained.
- `Ralph Ready` requires a detailed implementation plan in the description
  (files to touch, approach, edge cases) - see
  [`linear-issues.md`](./linear-issues.md). Apply it whenever the issue is
  well-scoped enough for an LLM to implement autonomously, and pair it with
  `Todo`.
- For `needs-info`, leave status at `Backlog` and post a comment asking the
  reporter for what's missing; do not invent a `needs-info` label unless one is
  added to the team later.
- Use `mcp__linear__list_issue_labels` and `mcp__linear__list_issue_statuses` to
  verify these values still exist before applying them. If a status has been
  renamed (e.g. `Cancelled` → `Canceled`), update this file rather than
  guessing.

## Labels

The label set (`Bug` / `Feature` / `Improvement` / `Audit` / `Ralph Ready`) is
defined once in [`linear-issues.md`](./linear-issues.md#labels) — that's the
single source of truth, so it isn't re-documented here. A triaged issue
typically carries one of `Bug`/`Feature`/`Improvement`/`Audit`, plus optionally
`Ralph Ready`.
