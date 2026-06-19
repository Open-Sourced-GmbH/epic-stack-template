# Shared Auth Vocabulary Lives in the Util Layer

Date: 2026-06-18

Status: accepted

## Context

The auth flows share a small vocabulary of constants and types: the `/verify`
query-param names (`code`, `target`, `type`, `redirectTo`), the set of
Verification types (`VerificationTypes`, `VerifySchema`), and the two-factor
discriminants (`twoFAVerificationType` = `'2fa'`, `twoFAVerifyVerificationType`
= `'2fa-verify'`). See the domain glossary in
[`docs/agents/domain.md`](../agents/domain.md) for Verification, Two-Factor
Authenticator, and Pending Two-Factor Authenticator.

Following the Epic Stack default of co-locating constants with the route that
introduces them, this vocabulary originally lived in route modules —
`app/routes/_auth/verify.tsx` and `app/routes/settings/profile/two-factor/*`.

When the verification logic was split into the `app/utils/verification.server.ts`
and `app/utils/two-factor.server.ts` modules, those server utilities ended up
importing their core vocabulary *up* from route files (e.g.
`verification.server.ts` importing `VerificationTypes` and the query-param names
from `verify.tsx`; `two-factor.server.ts` importing `twoFAVerificationType` from
a route `_layout.tsx`).

This inverts the dependency direction. The stable util layer should not depend
on the volatile routing layer: it forces a maintainer to bounce from a
`.server.ts` util out to a `.tsx` route to learn what a Verification *is*, and
it means the util modules cannot be reasoned about (or imported) without
dragging route modules along.

## Decision

Shared auth vocabulary lives in **client-safe util modules**, and the util layer
**never imports from route modules**. Routes import this vocabulary *down* from
the util layer; the dependency direction is always `routes → utils`.

Concretely:

- `app/utils/verification.ts` owns the query-param constants,
  `VerificationTypeSchema`, `VerificationTypes`, and `VerifySchema`.
- `app/utils/two-factor.ts` owns `twoFAVerificationType` and
  `twoFAVerifyVerificationType`.

These are plain `.ts` modules (not `.server.ts`) because the constants are used
by both client components and server code. The server-side logic that acts on
them stays in the sibling `verification.server.ts` / `two-factor.server.ts`
modules.

## Consequences

- **Restored dependency direction**: `app/utils/*` no longer imports from
  `app/routes/*`. The vocabulary defining what a Verification is lives next to
  the code that acts on it.
- **Departs from co-location**: this overrides the Epic Stack default of keeping
  a constant in the route that uses it. The trade-off is deliberate — layering
  direction wins over co-location for vocabulary that crosses the route/util
  seam.
- **Guard against regression**: re-introducing one of these constants in a route
  file (and importing it from a util) silently re-opens the seam leak. A util
  importing from `#app/routes/*` is the smell to watch for.
- **Out of scope**: `app/utils/cache.server.ts` still imports from
  `app/routes/admin/cache/sqlite.server.ts` — a separate, pre-existing instance
  of the same class of leak in the cache domain, not addressed here.
