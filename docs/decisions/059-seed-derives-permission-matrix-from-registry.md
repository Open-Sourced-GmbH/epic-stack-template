# The Seed Derives the Permission Matrix and Role Grants from the Registry

Date: 2026-06-18

Status: accepted

## Context

[ADR-056](056-permission-match-rule-and-vocabulary.md) named the permission
vocabulary as value-level registries and [ADR-058](058-role-name-is-a-typed-registry.md)
did the same for role identity. Both ADRs stated the requirement "the database
`Permission` / `Role` rows must mirror the registry" but left the mirroring
unenforced — a possible follow-up ADR-056 recorded as out of scope.

Two pieces of folklore remained:

1. **The permission matrix was frozen in immutable SQL.** The init migration
   (`prisma/migrations/20250221233640_init/migration.sql`) creates the full
   entity × action × access matrix as hand-written `INSERT INTO Permission`
   statements. Adding `'post'` to `permissionEntities` would not create its rows;
   the matrix could silently drift from the vocabulary.

2. **The role→access grant policy had no home.** The rule "admin holds every
   `:any` permission, user every `:own`" existed only as *commented-out* SQL at
   the top of that migration. Nothing in the live codebase expressed it.

The seed (`prisma/seed.ts`) only *connected* users to roles by name; it assumed
the migration had already created the permissions and roles.

## Decision

The vocabulary registry is the generator for the RBAC rows.

- **The grant policy is named and exhaustive.** `roleGrantedAccess` in
  `app/utils/user.ts` is `{ admin: 'any', user: 'own' } satisfies
  Record<RoleName, PermissionAccess>` — a role without a grant is a compile error,
  the same exhaustive-registry move as [ADR-051](051-verify-dispatch-registry.md)
  and [ADR-055](055-cache-backend-is-a-named-registry.md).

- **The matrix is derived.** `getPermissionMatrix()` returns every
  entity × action × access from the vocabulary registries; it is pure and
  client-safe, so it sits with the vocabulary it expands (per
  [ADR-049](049-shared-vocabulary-in-util-layer.md)).

- **The seed generates the rows, idempotently.** `prisma/seed.ts` upserts every
  matrix permission and upserts each role connecting the permissions whose access
  matches `roleGrantedAccess[name]`. Re-running the seed reconciles existing rows
  to the registry (`update: { permissions: { set } }`), so it is safe to run over
  a database the migration already populated.

The init migration is **not** edited — migrations are immutable history. The seed
is the live derivation point; the migration's hand-written INSERTs remain as the
first-deploy bootstrap, now reconciled by the seed.

## Consequences

- **Locality / leverage.** Adding an entity is one `permissionEntities` edit: the
  matrix, both role grants, and (on the next seed) the database rows follow. The
  matrix and grant policy each have one home instead of being scattered between a
  type, the seed, and frozen SQL.

- **The invariant has a test.** `app/utils/user.test.ts` pins the matrix (full,
  unique cross product drawn from the vocabulary) and that every role has a
  granted access level — the ADR-051 "invariant has a test" ethos applied to the
  RBAC rows.

- **Production still needs a migration for new rows.** `prisma migrate deploy`
  does not run the seed, so a new entity reaches a production database via a data
  migration, not the seed alone. The seed keeps dev/test honest and is the
  authored source the matrix derives from; closing the production gap (e.g. a
  reconcile step on deploy) is a further follow-up, not done here.

- **Guard against regression.** Re-introducing a hand-listed permission set in
  the seed (rather than `getPermissionMatrix()`), or encoding the admin/user
  access policy anywhere but `roleGrantedAccess`, re-opens the drift closed here.
