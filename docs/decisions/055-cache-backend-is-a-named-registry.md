# The Cache Backends Are a Named Seam Behind a Registry

Date: 2026-06-18

Status: accepted

## Context

The cache subsystem has two backends: the in-process `lruCache` and the
distributed SQLite `cache` (`app/utils/cache.server.ts`). Both already satisfied
the cachified `Cache` interface (`get`/`set`/`delete`) — two adapters, one
interface, a real seam. But the seam was only expressed by the upstream
`@epic-web/cachified` type, and the *set* of backends had no name.

The tell was duplication every time the admin surface needed to act on "all
backends":

- `getAllCacheKeys` / `searchCacheKeys` hand-listed each backend
  (`{ sqlite: …, lru: … }`), reaching into `getAllKeysStatement` and `lru.keys()`
  directly.
- The admin delete action (`app/routes/admin/cache/index.tsx`) carried a
  `switch (type)` mapping `'sqlite' → cache.delete`, `'lru' → lruCache.delete` —
  the backend→adapter mapping living in a route rather than with the backends.

Adding a third backend would have meant editing both enumerate functions, the
route switch, and the render. The backend list was folklore, scattered.

A second, smaller smell hid in the enumerate functions: the SQLite side applied
the `limit`, the LRU side ignored it (`[...lru.keys()]` with no slice). The
Vitest stub already sliced both. So `limit` meant different things per backend.

## Decision

The cache backends are a **named seam behind a registry**:

- **`CacheBackend`** = the cachified `Cache` plus the `keys(limit)` /
  `search(query, limit)` capability the admin UI needs. Both `lruCache` and
  `cache` `satisfies CacheBackend`, so key-listing is part of the backend, not a
  per-call reach-in.

- **`cacheBackends`** = `{ lru, sqlite } satisfies Record<CacheBackendName,
  CacheBackend>` — the one place the set of backends is named.
  `getAllCacheKeys`/`searchCacheKeys` iterate it (`collectBackendKeys`); the
  delete action resolves `cacheBackends[type]` instead of switching. Adding a
  backend is one registry entry.

- **`keys(limit)` honors `limit` uniformly.** Both backends now slice to the
  limit, matching the stub. This is a small behavior tightening: the admin list
  previously returned every LRU key regardless of the limit field.

## Consequences

- **Leverage.** A new cache backend is one `cacheBackends` entry — the enumerate
  functions and the delete action pick it up with no edit. Previously it was four
  edits.

- **Locality.** The backend→adapter mapping lives with the backends, not in a
  route `switch`. `CacheBackendName` is the shared vocabulary for backend
  identity, owned by the cache util (per [ADR-049](049-shared-vocabulary-in-util-layer.md)'s
  direction).

- **The seam is the test surface.** `keys`/`search` are now methods on the
  backend, so the stub mirrors them and the limit semantics are uniform across
  real and test backends.

- **The "fail vs forward" primary policies stay separate.** This registry is
  about *which backend*, orthogonal to the single-writer fork named in
  [ADR-054](054-single-writer-cache-fork-is-one-seam.md).

- **Guard against regression.** Re-introducing a per-backend `switch` in a route,
  or hand-listing `{ sqlite, lru }` instead of iterating `cacheBackends`,
  re-opens the scattering closed here. Adding a backend without a `cacheBackends`
  entry is the smell to watch for.
