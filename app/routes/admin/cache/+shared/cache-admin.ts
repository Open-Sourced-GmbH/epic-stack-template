import { type CacheBackendName } from '#app/utils/cache.server.ts'

/** A flattened cache entry the admin `Table` renders one row per. */
export type CacheRow = {
	/** Stable row id (`type:key`) — drives React keys, selection, and delete. */
	id: string
	type: CacheBackendName
	key: string
}

/**
 * The cache backends, in display order — the single source the row encoder and
 * the id validator both read. Kept a file-local literal (not derived from the
 * `cacheBackends` registry) so this module stays free of the server-only
 * `node:sqlite` import and can run in the jsdom render test.
 */
const BACKEND_NAMES = ['lru', 'sqlite'] as const satisfies ReadonlyArray<CacheBackendName>

const backendNames = new Set<CacheBackendName>(BACKEND_NAMES)

function isBackendName(value: string): value is CacheBackendName {
	return backendNames.has(value as CacheBackendName)
}

/**
 * Encode a backend + key into the opaque row id the selection and delete paths
 * pass around. The backend prefix is unambiguous (`lru`/`sqlite`), so the key is
 * appended verbatim — {@link parseCacheEntryId} splits it back off the first
 * colon, leaving colons inside the key intact.
 */
export function cacheEntryId(type: CacheBackendName, key: string): string {
	return `${type}:${key}`
}

/**
 * Decode a row id back into its backend + key, or `null` when the prefix is not a
 * known backend (a malformed/forged id). Splits on the first colon only, so a key
 * containing colons survives the round-trip.
 */
export function parseCacheEntryId(
	id: string,
): { type: CacheBackendName; key: string } | null {
	const colon = id.indexOf(':')
	if (colon === -1) return null
	const type = id.slice(0, colon)
	if (!isBackendName(type)) return null
	return { type, key: id.slice(colon + 1) }
}

/** Flatten the per-backend key lists into one ordered list of typed rows. */
export function toCacheRows(cacheKeys: {
	lru: Array<string>
	sqlite: Array<string>
}): Array<CacheRow> {
	return BACKEND_NAMES.flatMap((type) =>
		cacheKeys[type].map((key) => ({ id: cacheEntryId(type, key), type, key })),
	)
}
