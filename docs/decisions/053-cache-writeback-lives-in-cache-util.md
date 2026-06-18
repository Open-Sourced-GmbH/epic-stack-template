# The Cache Write-Back Path Lives in the Cache Util, the Admin Route Is Its Inbound Adapter

Date: 2026-06-18

Status: accepted

## Context

The SQLite cache is single-writer: only the primary instance may write the cache
database. On a non-primary instance, `cache.set`/`cache.delete` (in
`app/utils/cache.server.ts`) instead forward the write over the internal network
to the primary's `/admin/cache/sqlite` route action, which applies it locally.

That handoff has two halves: an **outbound** half (build the request, POST it to
the primary) and an **inbound** half (the route action that receives the request
and calls `cache.set`/`cache.delete` on the primary). The outbound half —
`updatePrimaryCacheValue` — was defined in the route module
`app/routes/admin/cache/sqlite.server.ts`, but its only caller was
`cache.server.ts`. So the util imported it *up* from the route, while the route
imported `cache` *down* from the util: a circular import across the layer line,
and the same dependency-direction smell that [ADR-049](049-shared-vocabulary-in-util-layer.md),
[ADR-051](051-verify-dispatch-registry.md), and [ADR-052](052-verify-session-handshake-and-2fa-lifecycle-in-util.md)
closed elsewhere.

## Decision

- **The outbound write-back belongs to the cache.** `updatePrimaryCacheValue`
  moves *down* into `app/utils/cache.server.ts` as a module-private function next
  to the `cache` adapter that calls it. It is the outbound half of the
  primary-write handoff and has no caller outside the cache, so it is not
  exported.

- **The admin route is the inbound adapter only.**
  `app/routes/admin/cache/sqlite.server.ts` keeps just its `action` — the inbound
  HTTP endpoint that authenticates the internal request and applies the write via
  `cache` (imported *down* from util). The route no longer exports anything the
  util reaches back into.

## Consequences

- **The import cycle is gone.** `cache.server.ts` no longer imports from
  `routes/`; no util module does. The dependency direction is uniformly
  routes → utils, completing the line ADR-049/051/052 drew.

- **Locality.** Both halves of "how a cache write reaches the primary" now read in
  one place: the outbound POST sits beside the `cache.set`/`cache.delete` that
  fire it, and the inbound action is the lone thing left in the admin route.

- **Guard against regression.** Re-exporting the write-back from the route (so the
  util imports it back up), or adding any other `routes/` import to a util, re-opens
  the seam closed here. A util importing from `#app/routes/` is the smell to watch
  for.
