# Role Identity Is a Typed Registry, Not a Bare String

Date: 2026-06-18

Status: accepted

## Context

[ADR-056](056-permission-match-rule-and-vocabulary.md) named the permission
vocabulary (actions/entities/access levels) as value-level registries and routed
the permission match through one seam. It recorded one remaining item as out of
scope: **role identity was still a bare string**.

The two role guards — `requireUserWithRole(request, name: string)` in
`app/utils/permissions.server.ts` and `userHasRole(user, role: string)` in
`app/utils/user.ts` — accepted any string. The admin surface calls
`requireUserWithRole(request, 'admin')` in four `app/routes/admin/cache/*`
modules; a typo (`'adminn'`) compiled cleanly and failed at runtime as a silent
403, since the lookup simply matched no Role. This was the same untyped-identity
gap, except for the *coarser, higher-stakes* gate that sits beside the
already-typed `PermissionString`. The set of roles itself (`user`, `admin`,
created by the init migration) had no name in code.

## Decision

Role identity is a **named, typed registry**, mirroring the provider-name
registry (`providerNames` in `app/utils/connections.tsx`) and the permission
vocabulary of ADR-056:

- `roleNames = ['user', 'admin'] as const` and `type RoleName =
  (typeof roleNames)[number]` live in the client-safe `app/utils/user.ts`, beside
  the permission registries (per [ADR-049](049-shared-vocabulary-in-util-layer.md)'s
  direction). The database `Role` rows must mirror it.

- Both guards take a `RoleName`: `requireUserWithRole(request, name: RoleName)`
  and `userHasRole(user, role: RoleName)`. The four admin call sites are
  unchanged but now compile-checked.

The role *connect* sites (`prisma/seed.ts`, `app/utils/auth.server.ts`,
`tests/playwright-utils.ts`) keep their string literals: they write a role name
into a Prisma `connect`, where a bad name fails loudly (the connect finds no
Role), so they carry no silent-failure risk. The registry governs them as
documentation, not types.

## Consequences

- **Leverage.** A mistyped role at a guard is now a compile error, not a silent
  403. The asymmetry ADR-056 left — typed permissions beside an untyped role — is
  closed.

- **Locality.** The set of roles has one home, named in the Access Control
  glossary in [`docs/agents/domain.md`](../agents/domain.md).

- **No registry-iterating consumers, so no schema.** Unlike `providerNames`
  (which builds `Record<ProviderName, …>` label/icon maps) the roles are not
  enumerated anywhere, and unlike the verify types they are not validated from
  user input, so no `z.enum` schema is added. The type is the whole guarantee;
  no runtime test is warranted.

- **Guard against regression.** Re-widening a role guard parameter back to
  `string`, or re-declaring a role name as a standalone literal instead of
  drawing it from `roleNames`, re-opens the gap closed here.
