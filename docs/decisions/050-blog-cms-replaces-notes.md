# Replace the Notes Example Domain with an Admin-Authored Blog/CMS

Date: 2026-06-18

Status: accepted

## Context

The Epic Stack ships a per-user **Notes** feature (`Note` / `NoteImage` models,
`note` RBAC entity, the `users/$username` profile that lists a user's notes,
seed data, search, and tests) as its canonical example domain. It demonstrates
owner-scoped CRUD, image upload, search, and permissions.

This template is being turned into a branded **showcase for the Epic Stack
itself** — a "clone this and ship" marketing site with a real product behind it.
As part of that, we want:

- a real content surface for the marketing site (a blog/changelog), and
- a real admin dashboard with an authoring (CMS) surface.

A per-user notes feature does not serve either goal: a showcase wants one
canonical, curated content feed, and the authoring belongs to the site
operators, not to every signup. We considered keeping notes (rename only),
making the blog per-user/multi-author, and giving regular users content
abilities (comments, bookmarks). We chose the leanest coherent option.

## Decision

Retire the Notes domain and replace it with an **admin-authored blog**:

- Replace `Note` / `NoteImage` with `Post` / `PostImage` (adding `slug`,
  publication state with `publishedAt`, Markdown body, and `Tag` taxonomy).
- Rename the RBAC entity `note` → `post`. Authoring is admin-only via existing
  RBAC; there is **one canonical public feed** at `/blog`, not one per user.
- Regular (non-admin) logged-in users are **readers only** — account management
  only, no content creation (no notes, no comments, no bookmarks). See
  [`docs/agents/domain.md`](../agents/domain.md) for the term definitions.
- `users/$username` reverts to a plain profile (no per-user content listing).
- Remove the notes routes, seed data, and tests; reseed with sample posts.

## Consequences

- **Positive:** the template gains a real product domain (a CMS-backed blog) and
  a genuine admin authoring surface, which is what a Stack showcase needs. The
  scope stays lean — no comment/moderation/bookmark machinery.
- **Negative — upstream drift:** this is the single biggest divergence from
  upstream Epic Stack. The notes feature is load-bearing in upstream examples,
  docs, and tests, so future upstream merges that touch notes will conflict and
  must be reconciled by hand. This is the cost a future reader will wonder about.
- **Negative — lost example:** we lose the per-user owner-scoped-content example
  (`own` vs `any` access on a user-generated entity). The remaining owner-scoped
  example is admin Posts (`post:any`), which is a thinner demonstration of the
  RBAC `own`/`any` split.
- **Reversible-ish:** the model swap and routes are recoverable from git history,
  but once real posts exist in production databases, reversing means a data
  migration, not just a code revert.
