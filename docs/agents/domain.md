# Domain

> **Stub.** Replace this with your project's domain notes — the single-context
> glossary, core entities, business rules, and invariants an agent needs to work
> in this codebase without re-deriving them from the schema each time.

Keep this file focused on *what the product is and the rules it obeys*, not how
the code is structured (that's [code-conventions.md](code-conventions.md)) and
not architectural decisions (those are ADRs under `docs/decisions/`).

## Suggested sections

- **Core entities** — the nouns of the domain and how they relate.
- **Key workflows** — the important end-to-end flows.
- **Business rules / invariants** — constraints that must always hold.
- **Glossary** — terms with precise meanings in this project.

## Glossary

### Content (Blog / CMS)

> The canonical content domain. This **replaces the retired `Note` example
> domain** (per-user notes) with an admin-authored blog/changelog. See the ADR
> under [`docs/decisions/`](../decisions/README.md) for the rationale.

- **Post** — the unit of published content: an admin-authored blog article with
  a title, a URL **slug**, a Markdown **body** (rendered with syntax-highlighted
  code blocks), an optional **excerpt**, a **cover image**, **tags**, an
  **author**, and a publication state. Replaces the legacy `Note`. Authored only
  by users with the `post` authoring permission; it is **not** per-user content —
  there is one canonical feed, not one feed per user. Because a Post is canonical
  content and **not owned** by its author, deleting the author does **not** delete
  the Post: the author credit blanks (the `author` link is `SetNull`), the Post
  stands. (Contrast the retired `Note`, which cascade-deleted with its owner.)
- **Slug** — a Post's (and a Tag's) URL identifier, globally unique within its
  kind. Auto-suggested from the title but editable while the Post is a Draft. It
  is **permanently frozen on first publish** — once a URL has been public it never
  changes, even if the Post is later unpublished back to Draft. (No redirect/slug-
  history machinery: links to a published Post stay stable because the slug can't
  move.)
- **Excerpt** — an optional short summary on a Post, used for the index-card
  blurb and the per-post SEO/Open-Graph description. When empty it falls back to a
  derived first paragraph of the body; authors may override it.
- **Draft** — a Post in the unpublished state. Visible only in the admin
  authoring surface; never appears on the public feed or via public URLs.
- **Published** — a Post that has been released: it has a `publishedAt` instant
  and is readable by the public (unauthenticated) at its slug. Publishing is the
  transition Draft → Published; it can be reversed (unpublish) back to Draft.
- **Author** — the user credited on a Post. Only users holding the `post`
  authoring permission (admins, via RBAC) can author or edit Posts. Regular
  logged-in users are **readers only** — they have no content-creation ability
  (account management only).
- **Tag** — a **canonical, shared** taxonomy label that Posts are grouped under.
  Authors create tags on demand (free-form entry), but each tag is a single
  shared entity (its own name + URL **slug**), not per-post free text — many
  Posts reference the same Tag (Post↔Tag is many-to-many). Tags are
  **browseable** on the public feed: each has its own route listing every
  Published Post under it. Renaming a tag updates it everywhere; it is not a
  find-replace over post bodies.
- **Cover image** — the lead image of a Post, designated by an explicit
  `coverImageId`. A Post may hold 0..n `PostImage`s (reusing the Stack's existing
  image-upload/storage machinery, formerly `NoteImage`); the cover is the one
  singled out by `coverImageId`, leaving the rest available for body images later.

> **Retired:** **Note** / **NoteImage** — the upstream Epic Stack per-user notes
> example. Removed in this template; the `note` RBAC entity becomes `post`.

### Access Control (RBAC)

> See [ADR-028](../decisions/028-permissions-rbac.md) for the role/permission
> model and [ADR-056](../decisions/056-permission-match-rule-and-vocabulary.md)
> for where the vocabulary and the match rule live.

- **Permission** — a granted capability stored as a row of three columns:
  **action** (`create`/`read`/`update`/`delete`), **entity** (the noun acted on,
  e.g. `user`, `note`), and **access** (`own` = only the actor's own rows, `any`
  = anyone's). The set of valid actions/entities/access levels is the **RBAC
  vocabulary**, named once as value-level registries (`permissionActions`,
  `permissionEntities`, `permissionAccesses`) in `app/utils/user.ts`; the
  database `Permission` rows must mirror it. The **own-vs-any idiom** — acting on
  a resource needs `:own` if you own it, `:any` otherwise — is the helper
  `permissionForOwnership(action, entity, isOwner)`, used by both a server guard
  and its client check (see
  [ADR-061](../decisions/061-ownership-permission-rule-and-note-select.md)).
- **Permission String** — the textual form a guard names, `action:entity` or
  `action:entity:access` (e.g. `delete:note:own`). The access segment may be
  comma-joined (`own,any`) to mean "any of these satisfy the requirement";
  omitting it means any access satisfies. `parsePermissionString` turns it into a
  **Required Permission** `{ action, entity, access? }`.
- **Match rule** — the single predicate `permissionSatisfies(granted, required)`
  in `app/utils/user.ts`: a granted Permission satisfies a Required Permission
  when entity and action match and the granted access is among those required (or
  none is required). Both the server guard (`requireUserWithPermission`) and the
  client check (`userHasPermission`) go through it, so the two cannot diverge.
- **Role** — a named bundle of Permissions a user holds. The set is the typed
  registry `roleNames` (`user`, `admin`) in `app/utils/user.ts`; guards take a
  `RoleName`, so a mistyped role is a compile error (see
  [ADR-058](../decisions/058-role-name-is-a-typed-registry.md)). Each role's
  grant is the **role→access policy** `roleGrantedAccess` (admin → `any`,
  user → `own`); the seed derives the `Permission` matrix and role grants from
  these registries, so the database rows cannot drift from the vocabulary (see
  [ADR-059](../decisions/059-seed-derives-permission-matrix-from-registry.md)).

### Identity & Verification

- **Verification** — an *ephemeral, one-time* proof of control over an
  identifier (email/username), backed by a row in the `verification` table and a
  TOTP code. Created by `prepareVerification`, emailed, then **consumed**
  (validated and deleted) on use. Types: `onboarding`, `reset-password`,
  `change-email`. A Verification is always deleted once consumed — it never
  persists past a single successful use. The `/verify` dispatcher
  (`validateRequest`) owns this: it consumes the row for every type flagged in
  `consumedOnVerify` (`app/utils/verification.ts`) *before* the per-type handler
  runs, so consumption is the seam's job, not each handler's.
- **Two-Factor Authenticator** — a *permanent credential* belonging to a user
  who has enabled 2FA. It shares the `verification` table and TOTP machinery
  with Verifications (type `2fa`, target = user id) but is **never deleted on
  verify** — it is a standing credential, re-checked on login and after a 2-hour
  recency window. Distinct concept from a Verification despite the shared table;
  conflating the two is what made the `2fa` case the lone switch arm that skips
  deletion. The **login↔2FA handshake** — stash the unverified session and
  redirect to `/verify` when 2FA is enabled — is *written* by `handleNewSession`
  in `two-factor.server.ts` (beside the handshake keys) and *read* by the login
  route's 2FA `handleVerification` (see
  [ADR-060](../decisions/060-new-session-finalization-in-util.md)).
- **Pending Two-Factor Authenticator** — the *in-progress* row written while a
  user is enabling 2FA (type `2fa-verify`, target = user id). It is **not** a
  `VerificationTypes` member: it never flows through `/verify`, and is exercised
  only by the 2FA settings route. Once the user confirms a code it is
  **promoted** in place into a Two-Factor Authenticator (its `type` flips to
  `2fa`); abandoning setup deletes it. Naming it separately is what lets the
  permanent and pending states stay distinct rather than being one fuzzy "2fa"
  row.
