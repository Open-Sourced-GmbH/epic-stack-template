# New-Session Finalization Lives in the Util Layer, Beside Its Handshake Keys

Date: 2026-06-18

Status: accepted

## Context

`handleNewSession` is the operation every login entrypoint converges on once a
user is authenticated: given a fresh session, it either commits the auth session
cookie, or — if the user has a Two-Factor Authenticator — stashes the unverified
session id and remember flag in the verify session and redirects to the 2FA
`/verify` step. Three flows call it: password login (`login.tsx`), OAuth callback
(`auth.$provider/callback.ts`), and passkey auth (`webauthn/authentication.ts`).

It was defined in the route module `app/routes/_auth/login.server.ts`, so the
OAuth and passkey flows imported it *across* into `_auth/login.server.ts`. This
is the same cross-route leak the recent ADR line closed elsewhere — a `.server`
route exporting something sibling routes reach into
([ADR-049](049-shared-vocabulary-in-util-layer.md),
[ADR-051](051-verify-dispatch-registry.md),
[ADR-052](052-verify-session-handshake-and-2fa-lifecycle-in-util.md),
[ADR-053](053-cache-writeback-lives-in-cache-util.md)). It was the one shared
login operation still living in a route.

`handleNewSession` is the **writer** of the login↔2FA handshake whose session
keys [ADR-052](052-verify-session-handshake-and-2fa-lifecycle-in-util.md) placed
in `app/utils/two-factor.server.ts` (`unverifiedSessionIdKey`, `rememberKey`),
and it branches on `isTwoFactorEnabled`, which is defined there too.

## Decision

`handleNewSession` moves *down* into `app/utils/two-factor.server.ts`, beside the
handshake keys it writes and the `isTwoFactorEnabled` gate it branches on. The
three login flows import it down from the util layer; no route imports it from
another route.

It is **not** placed in `auth.server.ts`: that module would have to import
`isTwoFactorEnabled` and the handshake keys from `two-factor.server.ts`, which
already imports `getUserId`/`requireUserId`/`sessionKey` from `auth.server.ts` —
a util-layer import cycle, the very smell [ADR-053](053-cache-writeback-lives-in-cache-util.md)
removed. It is **not** placed in `session.server.ts` either: that is the
low-level cookie-storage leaf everything imports, and putting a function that
depends on auth/two-factor/verification there would invert the layering. Placing
it in `two-factor.server.ts` adds no new cross-module import edge.

The reader of the handshake — the login flow's 2FA `handleVerification` — stays
in `app/routes/_auth/login.server.ts`, since per
[ADR-051](051-verify-dispatch-registry.md) each `/verify` handler lives in its
flow's route module and is wired into the dispatch registry from there.

## Consequences

- **Locality.** The writer of the login↔2FA handshake now sits with the keys it
  writes and the gate it reads; "how a new session is finalized, and when 2FA
  intervenes" reads in one place.

- **Restored dependency direction.** No route module exports `handleNewSession`
  for siblings to reach into; the direction is uniformly routes → utils,
  continuing the line ADR-049/051/052/053 drew. No util-layer cycle is
  introduced.

- **The login route shrinks to its own concern.** `login.server.ts` keeps only
  its 2FA `handleVerification` (the handshake reader) and sheds the imports
  `handleNewSession` needed (`combineResponseInits`, `isTwoFactorEnabled`,
  `getRedirectToUrl`, `twoFAVerificationType`).

- **Guard against regression.** Re-defining `handleNewSession` (or any shared
  login operation) in a route module that sibling routes import across, rather
  than down from the util layer, re-opens the seam closed here.
