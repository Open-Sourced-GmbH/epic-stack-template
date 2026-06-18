import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import {
	cachified as baseCachified,
	verboseReporter,
	mergeReporters,
	type CacheEntry,
	type Cache as CachifiedCache,
	type CachifiedOptions,
	type Cache,
	totalTtl,
	type CreateReporter,
} from '@epic-web/cachified'
import { remember } from '@epic-web/remember'
import { LRUCache } from 'lru-cache'
import { z } from 'zod'
import {
	getInstanceInfo,
	getInstanceInfoSync,
	getInternalInstanceDomain,
} from './litefs.server.ts'
import { cachifiedTimingReporter, type Timings } from './timing.server.ts'

const CACHE_DATABASE_PATH = process.env.CACHE_DATABASE_PATH

const cacheDb = remember('cacheDb', createDatabase)

function createDatabase(tryAgain = true): DatabaseSync {
	const databasePath = CACHE_DATABASE_PATH
	if (!databasePath) {
		throw new Error('CACHE_DATABASE_PATH is not set')
	}

	const parentDir = path.dirname(databasePath)
	fs.mkdirSync(parentDir, { recursive: true })

	const db = new DatabaseSync(databasePath)
	const { currentIsPrimary } = getInstanceInfoSync()
	if (!currentIsPrimary) return db

	try {
		// create cache table with metadata JSON column and value JSON column if it does not exist already
		db.exec(`
			CREATE TABLE IF NOT EXISTS cache (
				key TEXT PRIMARY KEY,
				metadata TEXT,
				value TEXT
			)
		`)
	} catch (error: unknown) {
		try {
			fs.rmSync(databasePath, { force: true })
		} catch (unlinkError) {
			if (
				typeof unlinkError !== 'object' ||
				unlinkError === null ||
				!('code' in unlinkError) ||
				unlinkError.code !== 'ENOENT'
			) {
				throw unlinkError
			}
		}
		if (tryAgain) {
			console.error(
				`Error creating cache database, deleting the file at "${databasePath}" and trying again...`,
			)
			return createDatabase(false)
		}
		throw error
	}

	return db
}

const lru = remember(
	'lru-cache',
	() => new LRUCache<string, CacheEntry<unknown>>({ max: 5000 }),
)

export const lruCache = {
	name: 'app-memory-cache',
	set: (key, value) => {
		const ttl = totalTtl(value?.metadata)
		lru.set(key, value, {
			ttl: ttl === Infinity ? undefined : ttl,
			start: value?.metadata?.createdTime,
		})
		return value
	},
	get: (key) => lru.get(key),
	delete: (key) => lru.delete(key),
} satisfies Cache

const isBuffer = (obj: unknown): obj is Buffer =>
	Buffer.isBuffer(obj) || obj instanceof Uint8Array

function bufferReplacer(_key: string, value: unknown) {
	if (isBuffer(value)) {
		return {
			__isBuffer: true,
			data: value.toString('base64'),
		}
	}
	return value
}

function bufferReviver(_key: string, value: unknown) {
	if (
		value &&
		typeof value === 'object' &&
		'__isBuffer' in value &&
		(value as any).data
	) {
		return Buffer.from((value as any).data, 'base64')
	}
	return value
}

const cacheEntrySchema = z.object({
	metadata: z.object({
		createdTime: z.number(),
		ttl: z.number().nullable().optional(),
		swr: z.number().nullable().optional(),
	}),
	value: z.unknown(),
})
const cacheQueryResultSchema = z.object({
	metadata: z.string(),
	value: z.string(),
})

const getStatement = cacheDb.prepare(
	'SELECT value, metadata FROM cache WHERE key = ?',
)
const setStatement = cacheDb.prepare(
	'INSERT OR REPLACE INTO cache (key, value, metadata) VALUES (?, ?, ?)',
)
const deleteStatement = cacheDb.prepare('DELETE FROM cache WHERE key = ?')
const getAllKeysStatement = cacheDb.prepare('SELECT key FROM cache LIMIT ?')
const searchKeysStatement = cacheDb.prepare(
	'SELECT key FROM cache WHERE key LIKE ? LIMIT ?',
)

/**
 * Propagate a cache write to the primary instance. On a non-primary instance the
 * SQLite cache is read-only, so `cache.set`/`cache.delete` forward the write over
 * the internal network to the primary's `/admin/cache/sqlite` action, which
 * applies it locally. This is the outbound half of that handoff; the route action
 * is the inbound half.
 */
async function updatePrimaryCacheValue({
	key,
	cacheValue,
}: {
	key: string
	cacheValue: any
}) {
	const { currentIsPrimary, primaryInstance } = await getInstanceInfo()
	if (currentIsPrimary) {
		throw new Error(
			`updatePrimaryCacheValue should not be called on the primary instance (${primaryInstance})}`,
		)
	}
	const domain = getInternalInstanceDomain(primaryInstance)
	const token = process.env.INTERNAL_COMMAND_TOKEN
	return fetch(`${domain}/admin/cache/sqlite`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ key, cacheValue }),
	})
}

/**
 * Apply a cache write under the single-writer rule: the SQLite cache may only be
 * written on the primary instance. On the primary we run `writeLocally`; on a
 * replica the cache database is read-only, so the write is forwarded to the
 * primary's `/admin/cache/sqlite` action via `updatePrimaryCacheValue`
 * (fire-and-forget). This is the one place the primary-vs-replica fork for cache
 * writes lives — `cache.set` and `cache.delete` both go through it.
 */
async function writeToPrimary({
	key,
	cacheValue,
	writeLocally,
}: {
	key: string
	cacheValue: any
	writeLocally: () => void
}) {
	const { currentIsPrimary, primaryInstance } = await getInstanceInfo()
	if (currentIsPrimary) {
		writeLocally()
		return
	}
	void updatePrimaryCacheValue({ key, cacheValue }).then((response) => {
		if (!response.ok) {
			console.error(
				`Error forwarding cache write for key "${key}" to primary instance (${primaryInstance}): ${response.status} ${response.statusText}`,
				{ cacheValue },
			)
		}
	})
}

export const cache: CachifiedCache = {
	name: 'SQLite cache',
	async get(key) {
		const result = getStatement.get(key)
		const parseResult = cacheQueryResultSchema.safeParse(result)
		if (!parseResult.success) return null

		const parsedEntry = cacheEntrySchema.safeParse({
			metadata: JSON.parse(parseResult.data.metadata),
			value: JSON.parse(parseResult.data.value, bufferReviver),
		})
		if (!parsedEntry.success) return null
		const { metadata, value } = parsedEntry.data
		if (!value) return null
		return { metadata, value }
	},
	async set(key, entry) {
		await writeToPrimary({
			key,
			cacheValue: entry,
			writeLocally: () => {
				const value = JSON.stringify(entry.value, bufferReplacer)
				setStatement.run(key, value, JSON.stringify(entry.metadata))
			},
		})
	},
	async delete(key) {
		await writeToPrimary({
			key,
			cacheValue: undefined,
			writeLocally: () => {
				deleteStatement.run(key)
			},
		})
	},
}

export async function getAllCacheKeys(limit: number) {
	return {
		sqlite: getAllKeysStatement
			.all(limit)
			.map((row) => (row as { key: string }).key),
		lru: [...lru.keys()],
	}
}

export async function searchCacheKeys(search: string, limit: number) {
	return {
		sqlite: searchKeysStatement
			.all(`%${search}%`, limit)
			.map((row) => (row as { key: string }).key),
		lru: [...lru.keys()].filter((key) => key.includes(search)),
	}
}

export async function cachified<Value>(
	{
		timings,
		...options
	}: CachifiedOptions<Value> & {
		timings?: Timings
	},
	reporter: CreateReporter<Value> = verboseReporter<Value>(),
): Promise<Value> {
	return baseCachified(
		options,
		mergeReporters(cachifiedTimingReporter(timings), reporter),
	)
}
