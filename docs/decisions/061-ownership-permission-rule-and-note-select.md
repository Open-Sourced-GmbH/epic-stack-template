# The Ownership→Permission Rule and the Note Read-Shape Each Have One Home

Date: 2026-06-18

Status: accepted

## Context

Two small duplications sat in the Note routes, both of the "a rule/shape with no
home" class the recent ADRs closed elsewhere.

1. **The ownership→permission rule was spelled twice.** Deleting a Note requires
   the narrower `delete:note:own` if you own it, the broader `delete:note:any`
   otherwise — the own-vs-any RBAC idiom ([ADR-028](028-permissions-rbac.md)).
   `app/routes/users/$username/notes/$noteId.tsx` wrote `isOwner ?
   'delete:note:own' : 'delete:note:any'` in two places: the server `action`
   guard and the client component's `canDelete` check. This is the same
   one-rule-two-adapters shape [ADR-056](056-permission-match-rule-and-vocabulary.md)
   resolved for the permission *match* — the server check and its mirroring client
   check re-deriving one rule.

2. **The Note image read-shape was hand-written per loader.** Both read loaders
   (`$noteId.tsx` and `$noteId_.edit.tsx`) inlined the identical image projection
   `{ id, altText, objectKey }`. Adding a field to what a Note image exposes meant
   editing every loader.

## Decision

- **The ownership→permission rule is one helper.** `permissionForOwnership(action,
  entity, isOwner)` in the client-safe `app/utils/user.ts` returns the
  `:own`/`:any` `PermissionString`, built from the permission vocabulary
  registries (ADR-056). Both the server guard and the client check call it, so the
  rule cannot diverge. It lives with the RBAC vocabulary per
  [ADR-049](049-shared-vocabulary-in-util-layer.md).

- **The Note read-shape is a named fragment.** `noteImageSelect` (`satisfies
  Prisma.NoteImageSelect`) in `app/routes/users/$username/notes/+shared/note.server.ts`
  is the one projection both loaders reference. `satisfies` preserves the literal
  so each route's generated loader type is unchanged.

## Consequences

- **Locality.** The ownership→permission rule and the Note image projection each
  have one home; changing either is one edit, not a hunt across loaders and the
  client/server halves of a route.

- **The seam is the test surface.** `permissionForOwnership` is pinned in
  `app/utils/user.test.ts` (owner → `:own`, non-owner → `:any`), extending the
  RBAC unit coverage ADR-056 began.

- **Leverage for the own-vs-any idiom.** Any future ownership-gated guard (and its
  client mirror) builds its `PermissionString` through the same helper rather than
  re-spelling the ternary.

- **Out of scope.** The Note → Post rename ([ADR-050](050-blog-cms-replaces-notes.md))
  is unchanged: the entity is still `note`. The helper's `entity` argument and the
  `noteImageSelect` name make that rename mechanical when it lands, but it is a
  separate migration, not done here.

- **Guard against regression.** Re-spelling `isOwner ? '…:own' : '…:any'` at a
  guard or its client check (instead of `permissionForOwnership`), or re-inlining
  the Note image projection in a loader (instead of `noteImageSelect`), re-opens a
  duplication closed here.
