# The Permission Match Rule Lives in One Seam, the RBAC Vocabulary Is a Named Registry

Date: 2026-06-18

Status: accepted

## Context

The RBAC system (see [ADR-028](028-permissions-rbac.md) and the Access Control
glossary in [`docs/agents/domain.md`](../agents/domain.md)) checks whether a user
holds a Permission. That check had two weaknesses of the same class the recent
seam ADRs closed elsewhere ([ADR-049](049-shared-vocabulary-in-util-layer.md),
[ADR-051](051-verify-dispatch-registry.md),
[ADR-055](055-cache-backend-is-a-named-registry.md)).

1. **The match rule was duplicated across two adapters.** "Does a granted
   Permission satisfy a requirement" was implemented twice: the server guard
   `requireUserWithPermission` (`app/utils/permissions.server.ts`) hand-rolled it
   as a Prisma `where` clause (`permissions: { some: { ...data, access: { in }}}`),
   while the client `userHasPermission` (`app/utils/user.ts`) re-derived the same
   semantics in memory (`access.includes(permission.access)`). Two copies of one
   rule, kept equivalent only by "both happen to branch the same way" — the
   folklore-invariant smell ADR-051 named for the `/verify` consume policy.
   Neither copy was unit-tested; there was no `user.test.ts`.

2. **The RBAC vocabulary was type-only folklore.** The valid actions, entities,
   and access levels lived solely as private template-literal types (`type
   Action`, `type Entity`, `type Access`) in `user.ts`. The runtime source of
   truth is the `Permission` rows (seeded by the init migration), and the type
   had to mirror them by hand — the same "the set has no name" tell ADR-055
   recorded for the cache backends.

## Decision

- **The match rule is one seam.** `permissionSatisfies(granted, required)` in
  `app/utils/user.ts` is the single home of the rule. `userHasPermission`
  (client) calls it; `requireUserWithPermission` (server) stops hand-rolling a
  Prisma `where` clause and instead loads the user's roles/permissions and
  applies `userHasPermission`. The match cannot diverge between server and client
  because there is only one. The predicate depends only on the three columns it
  reads (a minimal structural input type), so both the root loader's user and the
  guard's lookup satisfy it.

- **The vocabulary is a named registry.** `permissionActions`,
  `permissionEntities`, and `permissionAccesses` are value-level `as const`
  arrays in the client-safe `app/utils/user.ts`; `PermissionAction` /
  `PermissionEntity` / `PermissionAccess` and `PermissionString` are derived from
  them. The vocabulary lives down in the util layer per ADR-049.

## Consequences

- **Locality.** The permission-match rule has one home, named in the glossary as
  the **Match rule**. Adding or changing how access is matched is one edit, not
  two adapters to keep in lockstep.

- **The seam is the test surface.** `app/utils/user.test.ts` pins the semantics
  the two adapters used to encode implicitly: no-access-means-any, single-access
  exactness, and the comma-joined "any of these" set. ADR-051's "the invariant
  has one home and a test" now holds for permission matching too.

- **The server load is broader, deliberately.** The guard now reads the user's
  roles/permissions and filters in memory rather than asking the database for a
  scoped existence check. RBAC data is a handful of rows — the root loader
  already loads exactly this shape on every request — so the cost is negligible
  and buys a single rule.

- **Out of scope (since resolved by [ADR-059](059-seed-derives-permission-matrix-from-registry.md)).**
  The runtime `Permission`/`Role` rows were still created by the init migration
  and connected by name in `prisma/seed.ts`; deriving that matrix from the
  registry was a follow-up, since done — the seed now generates it from
  `getPermissionMatrix()` and `roleGrantedAccess`. Role identity was
  also still a bare string at `requireUserWithRole` — a typed role registry was
  the natural next deepening, since resolved by
  [ADR-058](058-role-name-is-a-typed-registry.md). The `note` entity is unchanged; the
  Note → Post rename ([ADR-050](050-blog-cms-replaces-notes.md)) is a separate
  migration and adding `'post'` here is a one-line registry edit when it lands.

- **Guard against regression.** Re-introducing a Prisma `where`-clause permission
  match in a guard (rather than routing through `userHasPermission`), or
  re-declaring the action/entity/access sets as standalone types instead of
  deriving them from the registries, re-opens a seam closed here.
