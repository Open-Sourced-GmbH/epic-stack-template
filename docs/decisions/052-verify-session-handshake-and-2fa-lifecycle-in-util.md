# Verify-Session Handshake Keys and the 2FA Enrollment Lifecycle Live in the Util Layer

Date: 2026-06-18

Status: accepted

## Context

Two leaks of the same class as [ADR-049](049-shared-vocabulary-in-util-layer.md)
and [ADR-051](051-verify-dispatch-registry.md) remained after those decisions.

1. **The cross-step verify-session handshake leaked through routes.** Every
   Verification flow is two steps: step 1 (a route action) stashes state in
   `verifySessionStorage`, step 2 (the flow's `/verify` handler, or the
   destination route) reads it back to finalize. The *vehicle* for that state —
   the session-key constants `onboardingEmailSessionKey`, `providerIdKey`,
   `prefilledProfileKey`, `resetPasswordUsernameSessionKey`,
   `newEmailAddressSessionKey` — was defined in route `.tsx` modules and imported
   *up/across* by sibling `.server` handlers and by
   `auth.$provider/callback.ts`. ADR-051 named this its "out of scope" item. The
   2FA login handshake keys already lived correctly in `two-factor.server.ts`, so
   this was an inconsistency: three flows leaked, one did not.

2. **The Two-Factor Authenticator enrollment lifecycle had no home.** The domain
   glossary names the Pending → permanent transition ("promoted in place"), but
   no module owned it. Creating the Pending Two-Factor Authenticator, promoting
   it (flipping `type` `2fa-verify` → `2fa`), abandoning it, and disabling the
   permanent credential were four raw `prisma.verification` writes scattered
   across `two-factor/index.tsx`, `two-factor/verify.tsx`, and
   `two-factor/disable.tsx`.

## Decision

- **Handshake keys live with the session that holds them.** The five verify-session
  handshake keys move to `app/utils/verification.server.ts`, next to
  `verifySessionStorage`. Routes import them *down* from the util layer; no route
  imports a handshake key from another route. This finishes the dependency
  direction ADR-049 set for vocabulary and ADR-051 set for the handler contract.
  They are server-only plumbing, so they live in `verification.server.ts` (not
  the client-safe `verification.ts`) — mirroring the 2FA keys in
  `two-factor.server.ts`.

- **The 2FA enrollment lifecycle is a module in `two-factor.server.ts`.**
  `prepareTwoFactorEnrollment`, `confirmTwoFactorEnrollment`,
  `cancelTwoFactorEnrollment`, and `disableTwoFactor` own every write to the
  `verification` table for the two `2fa*` types. The settings routes call these
  instead of writing columns directly; the loader reads via the existing
  `isTwoFactorEnabled`.

## Consequences

- **Locality.** "What state crosses the two steps of a verify flow" has one home,
  and the Pending-vs-permanent transition is one named operation rather than raw
  column writes in three route files. The glossary's "promoted in place" maps to
  `confirmTwoFactorEnrollment`.

- **Restored dependency direction.** No route module exports a session key or a
  2FA `prisma.verification` write that another route reaches into. Closes the
  "out of scope" item recorded in ADR-051.

- **Tests.** The 2FA enrollment transitions are now exercisable at a util
  interface rather than only end-to-end through the QR-code settings routes.

- **Guard against regression.** Re-introducing a handshake key in a route `.tsx`
  (and importing it from a sibling), or writing a raw `prisma.verification`
  update/delete against a `2fa*` type inside a route, each re-opens a seam closed
  here. A route exporting a session-key constant is the smell to watch for.
