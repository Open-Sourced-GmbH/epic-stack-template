# The Single-Writer Fork for Cache Writes Lives in One Seam

Date: 2026-06-18

Status: accepted

## Context

The SQLite cache is single-writer: only the primary instance may write the cache
database. A replica's `cache.set`/`cache.delete` (in
`app/utils/cache.server.ts`) instead forward the write to the primary's
`/admin/cache/sqlite` action. [ADR-053](053-cache-writeback-lives-in-cache-util.md)
pulled the outbound half of that handoff (`updatePrimaryCacheValue`) down into
the cache util, beside the adapter that fires it.

But the *decision* that handoff hinges on — "am I the primary; if so write
locally, if not forward" — was still folklore. `cache.set` and `cache.delete`
each independently called `getInstanceInfo()` and hand-rolled the same
`if (currentIsPrimary) { write locally } else { forward }` fork, with their own
copy of the fire-and-forget error logging. The single-writer rule was enforced
only by "both operations happen to branch the same way" — the same
folklore-invariant smell [ADR-051](051-verify-dispatch-registry.md) closed for
the `/verify` consume policy ("three handlers happen to call
`consumeVerification`"). Two copies of a rule is one rule with nowhere to live.

## Decision

The primary-vs-replica fork for cache writes is **one module-private seam**.
`writeToPrimary({ key, cacheValue, writeLocally })` in `cache.server.ts` owns the
single-writer decision: it resolves `getInstanceInfo()` once, runs the caller's
`writeLocally` thunk on the primary, and forwards via `updatePrimaryCacheValue`
on a replica. `cache.set` and `cache.delete` each pass their local SQLite write
as the thunk and the forwarded payload as `cacheValue` (the entry for `set`,
`undefined` for `delete` — the discriminant the inbound action already reads).

It stays in `cache.server.ts`, module-private, beside `updatePrimaryCacheValue` —
honoring ADR-053's locality (both halves of the handoff, and now the decision
between them, read in one place) and its dependency direction (no new
cross-layer import).

## Consequences

- **Locality.** The single-writer rule has one home. `cache.set`/`cache.delete`
  collapse to the write that is actually theirs (the SQLite statement); the
  fork, the `getInstanceInfo()` call, and the forward-error logging are written
  once, not per operation.

- **Leverage.** A future primary-only cache write goes through `writeToPrimary`
  rather than re-deriving the branch.

- **The "fail-fast" idiom is intentionally separate.** Two other sites guard on
  the primary — the inbound `/admin/cache/sqlite` action and
  `auth.$provider/callback.ts` — but their policy is *fail if not primary*
  (`ensurePrimary`-style), not *forward if not primary*. They are a different
  rule and are deliberately **not** folded into `writeToPrimary`. Collapsing the
  two policies into one would be a miscategorization, not a deepening.

- **Testability is bounded by the cache stub.** Per
  [ADR-047](047-mock-cache-server-in-tests.md), Vitest resolves the whole
  `cache.server.ts` to an in-memory stub, so the real fork is not reachable from
  the unit suite. Naming the fork makes its interface explicit, but exercising it
  would require an integration test or un-stubbing — out of scope here. No new
  test is added; the stub already models replica-blind in-memory writes.

- **Guard against regression.** Re-inlining the `getInstanceInfo()` +
  `if (currentIsPrimary)` fork into a cache write (rather than routing it through
  `writeToPrimary`) re-opens the duplicated-rule smell closed here.
