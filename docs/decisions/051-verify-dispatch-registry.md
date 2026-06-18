# The `/verify` Dispatch Is an Exhaustive Registry with the Consume Policy in the Seam

Date: 2026-06-18

Status: accepted

## Context

Every Verification flow (`onboarding`, `reset-password`, `change-email`, and the
`2fa` login finalization) converges on `validateRequest` in
`app/routes/_auth/verify.server.ts`: the code is validated once, then dispatched
to a per-type `handleVerification` adapter living in that flow's route module.
See the domain glossary in [`docs/agents/domain.md`](../agents/domain.md) for
Verification and Two-Factor Authenticator, and [ADR-049](049-shared-vocabulary-in-util-layer.md)
for the rule that shared auth vocabulary lives *down* in the util layer.

The dispatch had three weaknesses:

1. **The mapping was unenforced.** `validateRequest` was a bare `switch` over the
   Verification type with no `default` and no exhaustiveness check. Adding a
   member to `VerificationTypes` (`app/utils/verification.ts`) compiled cleanly
   but made `validateRequest` silently return `undefined` for that type at
   runtime — a real behaviour with nothing guarding it.

2. **The handler contract lived inside a participant.** `VerifyFunctionArgs` was
   defined in the route `verify.server.ts`, so every handler imported it back
   *up* — including `app/routes/settings/profile/change-email.server.tsx`
   reaching across into `app/routes/_auth/`. This is the same dependency-direction
   smell ADR-049 fixed for vocabulary, except for the handler *contract*.

3. **The consume invariant was folklore.** The glossary's central distinction —
   an ephemeral Verification is deleted on consume, the permanent Two-Factor
   Authenticator is never deleted — was enforced only by "three handlers happen
   to call `consumeVerification`, and the `2fa` one happens not to." Nothing in
   the interface expressed it.

## Decision

The `/verify` dispatch is a **seam** that owns the dispatch table and the consume
policy. Concretely:

- **Exhaustive registry.** `verify.server.ts` holds a `verifyHandlers` object
  typed `satisfies Record<VerificationTypes, VerifyHandler>`. Adding a
  Verification type without a handler is a compile error; `satisfies` (not an
  annotated `Record`) preserves each handler's precise return type for the
  route's `actionData`.

- **Contract lives in the util layer.** `VerifyFunctionArgs` and `VerifyHandler`
  live in the client-safe `app/utils/verification.ts`. Route handlers import the
  contract *down* from util; no route imports it from another route. The unused
  `body` field was dropped from the contract.

- **Consume policy in the seam.** `consumedOnVerify: Record<VerificationTypes,
  boolean>` (in `verification.ts`) encodes which types are consumed. The
  dispatcher consumes the Verification *before* invoking the handler for every
  flagged type; the `2fa` Authenticator is the lone `false` entry and is never
  consumed. Handlers no longer call `consumeVerification` themselves.

## Consequences

- **Completeness is a compile-time guarantee.** A new Verification type cannot be
  added without both a handler and a consume-policy entry — both are
  `Record<VerificationTypes, …>` and fail the build if a key is missing.

- **Restored dependency direction.** The handler contract no longer lives in a
  route module, so `change-email.server.tsx` (and the others) stop importing
  upward/across into `_auth/`. Extends ADR-049 from constants to the contract.

- **The invariant has one home and a test.** `consumedOnVerify` is the single
  source of truth for ephemeral-vs-permanent, pinned by `verification.test.ts`
  (only `2fa` is never consumed). The glossary points at it.

- **Guard against regression.** Collapsing `verifyHandlers` back into a `switch`,
  moving `VerifyFunctionArgs` back into a route, or re-introducing a per-handler
  `consumeVerification` call each re-open one of the seams closed here. A route
  importing `VerifyFunctionArgs` from another route is the smell to watch for.

- **Out of scope (since resolved by [ADR-052](052-verify-session-handshake-and-2fa-lifecycle-in-util.md)).**
  The per-flow session keys (`onboardingEmailSessionKey`,
  `resetPasswordUsernameSessionKey`, `newEmailAddressSessionKey`) were still
  defined in route `.tsx` files and imported by sibling `.server` handlers — the
  same class of leak in the cross-step session handshake, not addressed here.
  ADR-052 moved them into the util layer.
