import { expect, test } from 'vitest'
import {
	cacheEntryId,
	parseCacheEntryId,
	toCacheRows,
} from './cache-admin.ts'

test('cacheEntryId round-trips through parseCacheEntryId', () => {
	const id = cacheEntryId('sqlite', 'user:123')
	expect(parseCacheEntryId(id)).toEqual({ type: 'sqlite', key: 'user:123' })
})

test('parseCacheEntryId splits on the first colon so keys may contain colons', () => {
	// The backend prefix is unambiguous; everything after the first colon is the
	// key verbatim, even when it itself contains colons.
	expect(parseCacheEntryId('lru:a:b:c')).toEqual({ type: 'lru', key: 'a:b:c' })
})

test('parseCacheEntryId returns null for an unknown backend prefix', () => {
	expect(parseCacheEntryId('redis:foo')).toBeNull()
	expect(parseCacheEntryId('no-colon')).toBeNull()
})

test('toCacheRows flattens both backends into typed rows with stable ids', () => {
	const rows = toCacheRows({ lru: ['a', 'b'], sqlite: ['c'] })
	expect(rows).toEqual([
		{ id: 'lru:a', type: 'lru', key: 'a' },
		{ id: 'lru:b', type: 'lru', key: 'b' },
		{ id: 'sqlite:c', type: 'sqlite', key: 'c' },
	])
})
