# Issue tracker: Linear

Issues and PRDs for this repo live in **Linear**, team **`<YOUR_TEAM>`**. Use
the `mcp__linear__*` MCP tools for all operations - do not create or update
issues in GitHub. (Assumes the Linear MCP server is connected; adapt or delete
these docs if you use a different tracker.)

The detailed conventions (labels, priorities, status rules, issue structure) are
documented in [`linear-issues.md`](./linear-issues.md). This file is the
operational glue between the engineering skills and that workflow.

## Tool mapping

| Operation                 | MCP tool                                         |
| ------------------------- | ------------------------------------------------ |
| Create an issue           | `mcp__linear__save_issue` (omit `id`)            |
| Update an issue           | `mcp__linear__save_issue` (with `id`)            |
| Read an issue             | `mcp__linear__get_issue`                         |
| List / search issues      | `mcp__linear__list_issues`                       |
| Comment on an issue       | `mcp__linear__save_comment`                      |
| List comments             | `mcp__linear__list_comments`                     |
| Available labels          | `mcp__linear__list_issue_labels` (your team)     |
| Available statuses        | `mcp__linear__list_issue_statuses`               |
| Available projects        | `mcp__linear__list_projects`                     |
| Create / update a project | `mcp__linear__save_project`                      |
| Create / update milestone | `mcp__linear__save_milestone`                    |
| List milestones           | `mcp__linear__list_milestones`                   |
| Resolve current user      | `mcp__linear__get_user` (`me`)                   |

When passing markdown bodies, send real newlines - not literal `\n` escape
sequences.

## When a skill says "publish to the issue tracker"

Create a Linear issue in your team. Follow the issue structure,
label, priority, and status rules in [`linear-issues.md`](./linear-issues.md).
Default status is `Backlog`; set to `Todo` only when the issue is fully scoped.

If the slice carries the `Ralph Ready` label (exact spelling - space, not
hyphen), it MUST be in `Todo`, never `Backlog`. The label and the status travel
together.

## When a skill says "publish a PRD"

A PRD is **always a Linear Project**, never an Issue. The PRD body goes in the
project description (`mcp__linear__save_project`). Implementation slices are
Issues attached to that project.

Every project **must have milestones**. Before publishing any slice issues:

1. Create the project with `mcp__linear__save_project`.
2. Define the milestones for it with `mcp__linear__save_milestone` (each
   milestone references the project `id`).
3. When creating each slice issue, attach it to the appropriate milestone.

If `to-issues` (or any sibling skill) is converting a PRD into work, run all
three steps - a project without milestones is incomplete.

## When a skill says "fetch the relevant ticket"

Call `mcp__linear__get_issue` with the issue identifier (e.g. `TEAM-123`) and
`mcp__linear__list_comments` for its discussion thread.

## When a skill says "apply label X" or "transition to state Y"

Translate via [`triage-labels.md`](./triage-labels.md), which maps the canonical
triage roles to the Linear labels and statuses actually configured for this
team. Never invent labels - list them first with
`mcp__linear__list_issue_labels` and reuse what exists.

## Cross-references

Some operational runbooks (cutover plans, deployment checklists) live on their
executing Linear issue rather than in the repo. When asked about ticket-scoped
operational docs, look on the issue itself, not in `docs/`.
