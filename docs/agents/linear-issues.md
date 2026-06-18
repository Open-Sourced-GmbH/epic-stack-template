# Linear issue conventions

> Assumes the [Linear MCP server](https://linear.app/docs) is connected. Replace
> `<YOUR_TEAM>` below with your Linear team name. If you don't use Linear, adapt
> these conventions to your tracker (or delete the Linear agent docs).

Team: **`<YOUR_TEAM>`**. Use the `mcp__linear__*` MCP tools, not `gh`. For the
tool mapping itself see [`issue-tracker.md`](./issue-tracker.md); this file is
the content conventions.

## Labels

| Label           | When                                                  |
| --------------- | ----------------------------------------------------- |
| **Bug**         | Something is broken or behaves incorrectly            |
| **Feature**     | Net-new functionality                                 |
| **Improvement** | Enhancement to existing functionality (perf, UX, DX)  |
| **Audit**       | Auto-discovered by audit scans (a11y, perf, SEO)      |
| **Ralph Ready** | Issue is fully planned and LLM-actionable (see below) |

## Priority

- **Urgent (1)** - blocks deployment / breaks prod
- **High (2)** - significant user-facing issue
- **Medium (3)** - default for planned work
- **Low (4)** - nice-to-have, polish

## Defaults

- **Status**: `Backlog` on creation. Set to `Todo` directly only if the issue is
  clear, self-contained, and doable without human input.
- **Ralph Ready**: Add the label (exact spelling: `Ralph Ready` - space, not
  hyphen, not underscore) whenever the issue is well-scoped enough for an LLM to
  implement autonomously. Pair with `Todo` status. The issue description must
  contain a detailed implementation plan (files to touch, approach, edge cases).
- **Project**: assign only when clearly belonging to one; don't guess.

## PRDs and projects

- A **PRD is always a Linear Project**, never an Issue. The PRD body lives in
  the project description; implementation slices are Issues under the project.
- **Every project must have milestones.** When creating a project from a PRD,
  define milestones up front (`mcp__linear__save_milestone`) before publishing
  slice issues, and attach each issue to its milestone. A project without
  milestones is not done.

## Issue structure

1. **Title** - imperative, conventional-commit prefixed:
   `fix: broken cart total`, `feat: add order confirmation email`
2. **Problem / Context** - what's wrong or missing
3. **Goal** - what the fix or feature should achieve
4. **Acceptance criteria** - concrete, checkable items (critical for Ralph Ready
   issues)
5. **Out of scope** - explicit boundaries to prevent over-engineering

## Don'ts

- Don't write the label as `Ralph-Ready` or `Ralph_Ready` - it's `Ralph Ready`.
- Don't leave a `Ralph Ready` issue in `Backlog` - it must be `Todo`.
- Don't create a PRD as an Issue.
- Don't publish a Project without milestones.
- Don't create duplicates - search existing issues first.
