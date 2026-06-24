/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import CacheAdminRoute, { type CacheAdminData } from './index.tsx'

function makeData(overrides: Partial<CacheAdminData> = {}): CacheAdminData {
	return {
		cacheKeys: { lru: [], sqlite: [] },
		instance: 'local',
		instances: { local: 'local' },
		currentInstanceInfo: {
			currentInstance: 'local',
			primaryInstance: 'local',
		},
		...overrides,
	}
}

/**
 * Render the cache admin with a pinned loader payload (no cache DB / litefs) —
 * the render test asserts what the component does with a known key list.
 */
function renderCacheAdmin(
	data: CacheAdminData,
	initialPath = '/admin/cache',
) {
	const Stub = createRoutesStub([
		{
			path: '/admin/cache',
			Component: CacheAdminRoute,
			loader: () => data,
			HydrateFallback: () => null,
		},
	])
	render(<Stub initialEntries={[initialPath]} />)
}

test('lists keys from both backends as rows linking to their value pages', async () => {
	renderCacheAdmin(
		makeData({ cacheKeys: { lru: ['mem-key'], sqlite: ['db-key'] } }),
	)

	const lru = await screen.findByRole('link', { name: 'mem-key' })
	expect(lru).toHaveAttribute('href', '/admin/cache/lru/mem-key?instance=local')
	const sqlite = screen.getByRole('link', { name: 'db-key' })
	expect(sqlite).toHaveAttribute(
		'href',
		'/admin/cache/sqlite/db-key?instance=local',
	)
})

test('the toolbar shows a search field and a key count', async () => {
	renderCacheAdmin(
		makeData({ cacheKeys: { lru: ['a', 'b'], sqlite: ['c'] } }),
	)

	expect(await screen.findByRole('searchbox', { name: /search/i })).toBeInTheDocument()
	expect(screen.getByText(/3 keys/i)).toBeInTheDocument()
})

test('selecting rows reveals the bulk-action bar with a count and Delete', async () => {
	const user = userEvent.setup()
	renderCacheAdmin(
		makeData({ cacheKeys: { lru: ['mem-key'], sqlite: ['db-key'] } }),
	)

	await screen.findByRole('link', { name: 'mem-key' })
	expect(screen.queryByText(/selected/i)).toBeNull()

	await user.click(screen.getByRole('checkbox', { name: /select mem-key/i }))
	expect(screen.getByText(/1 selected/i)).toBeInTheDocument()
	expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument()

	await user.click(screen.getByRole('checkbox', { name: /select all rows/i }))
	expect(screen.getByText(/2 selected/i)).toBeInTheDocument()
})

test('the bulk Delete double-checks before it can submit', async () => {
	const user = userEvent.setup()
	renderCacheAdmin(makeData({ cacheKeys: { lru: ['mem-key'], sqlite: [] } }))

	await user.click(
		await screen.findByRole('checkbox', { name: /select mem-key/i }),
	)
	await user.click(screen.getByRole('button', { name: /^delete$/i }))
	expect(
		screen.getByRole('button', { name: /confirm delete/i }),
	).toBeInTheDocument()
})

test('a search with no matches shows the no-results empty state', async () => {
	renderCacheAdmin(
		makeData({ cacheKeys: { lru: [], sqlite: [] } }),
		'/admin/cache?query=ghost',
	)

	expect(await screen.findByText(/no keys match/i)).toBeInTheDocument()
})
