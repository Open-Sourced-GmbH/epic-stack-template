# Per-Entity Access Scoping: Posts Are Never Owner-Scoped

Date: 2026-06-20

Status: accepted (amends [059](059-seed-derives-permission-matrix-from-registry.md))

## Context

[ADR-050](050-blog-cms-replaces-notes.md) replaced the per-user **Note** domain
with an admin-authored **Post**. The retired `note` entity was owner-scoped: the
RBAC vocabulary granted both `:own` and `:any`, and the `user` role held every
`:own` permission so a signup could CRUD their own notes.

A Post is **not** owner-scoped. It is canonical content authored only by admins;
regular logged-in users are readers only (no content creation). So there must be
**no `post:own`** permission at all, and the `user` role must hold **no** post
permission.

[ADR-059](059-seed-derives-permission-matrix-from-registry.md) derived the
`Permission` matrix as the *full* `entity × action × access` cross product, with
`roleGrantedAccess = { admin: 'any', user: 'own' }`. Under that uniform matrix a
renamed `post` entity would still mint `post:own` rows and the `user` role would
pick them up — exactly the readers-only rule we must not violate. The uniformity
that made ADR-059 clean is what breaks here: not every entity is scoped by every
access level.

## Decision

Access is scoped **per entity**, named once as a registry beside the vocabulary.

- `entityAccesses` in `app/utils/user.ts` maps each `PermissionEntity` to the
  access levels it is scoped by: `user → ['own', 'any']`, `post → ['any']`. It is
  `satisfies Record<PermissionEntity, ReadonlyArray<PermissionAccess>>`, so a new
  entity without an entry is a compile error — the same exhaustive-registry move
  as `roleGrantedAccess` (ADR-059).

- `getPermissionMatrix()` expands each entity over **its** access levels
  (`entityAccesses[entity]`), not the full `permissionAccesses` cross product. So
  `post` yields only `*:post:any`; there is no `post:own` row to mint.

- **No new seed or role logic.** `roleGrantedAccess` is unchanged. Because the
  `user` role is granted only `:own` permissions and `post` has no `:own` access,
  the user role receives no post permission as a *consequence of the registry* —
  the readers-only rule falls out of the data, not a special case in the seed.

## Consequences

- **The readers-only invariant has a home and a test.** "Posts are admin-only" is
  now `entityAccesses.post === ['any']`, pinned in `app/utils/user.test.ts`
  (no `post:own` in the matrix; admin holds every `post` action, the user role
  none) rather than living implicitly in seed wiring.

- **Adding an entity is two edits, not one.** ADR-059's "one `permissionEntities`
  edit" becomes: add the entity *and* its `entityAccesses` row. The compile error
  on a missing row makes the second edit unmissable.

- **The matrix is no longer the full cross product.** This narrows ADR-059's
  invariant: the matrix is the sum over entities of `actions × entityAccesses`.
  The `user.test.ts` length assertion is updated to derive from `entityAccesses`.

- **Guard against regression.** Re-expanding the matrix over `permissionAccesses`
  (instead of `entityAccesses[entity]`), or hand-granting/denying a role's post
  permission in the seed, re-opens the `post:own` leak closed here.
