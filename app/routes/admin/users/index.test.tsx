/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import {
	type AdminUser,
	type AdminUserList,
} from '#app/utils/user-admin.server.ts'
import AdminUsersIndex from './index.tsx'

function makeAdminUser(overrides: Partial<AdminUser> = {}): AdminUser {
	return {
		id: 'u1',
		name: 'Ada Lovelace',
		username: 'ada',
		email: 'ada@example.com',
		createdAt: new Date('2026-02-01'),
		deactivatedAt: null,
		image: null,
		roles: [{ name: 'user', privileged: false }],
		...overrides,
	}
}

/**
 * Render the admin user list with a pinned loader payload (no DB) — route render
 * tests assert what the component does with a known list, not DB-global facts.
 */
function renderAdminUsers(data: AdminUserList) {
	const Stub = createRoutesStub([
		{
			path: '/admin/users',
			Component: AdminUsersIndex,
			loader: () => data,
			HydrateFallback: () => null,
		},
	])
	render(<Stub initialEntries={['/admin/users']} />)
}

function listData(overrides: Partial<AdminUserList> = {}): AdminUserList {
	return {
		users: [makeAdminUser()],
		total: 1,
		page: 1,
		pageCount: 1,
		search: '',
		...overrides,
	}
}

test('renders each user with name, email, role chip and a status pill', async () => {
	renderAdminUsers(
		listData({
			users: [
				makeAdminUser({ id: 'a', name: 'Ada Lovelace', email: 'ada@x.com' }),
				makeAdminUser({
					id: 'g',
					name: 'Grace Hopper',
					email: 'grace@x.com',
					roles: [{ name: 'admin', privileged: true }],
				}),
			],
			total: 2,
		}),
	)

	expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
	expect(screen.getByText('grace@x.com')).toBeInTheDocument()
	// Role chips render the role names; both rows read "Active" this slice.
	expect(screen.getByText('admin')).toBeInTheDocument()
	expect(screen.getAllByText('Active')).toHaveLength(2)
	// The count line reflects the whole-table total.
	expect(screen.getByText(/2 users/i)).toBeInTheDocument()
})

test('falls back to the username when a user has no name', async () => {
	renderAdminUsers(
		listData({
			users: [makeAdminUser({ name: null, username: 'nameless' })],
		}),
	)

	expect(await screen.findByText('nameless')).toBeInTheDocument()
})

test('shows the "no users yet" empty state with an unfiltered list', async () => {
	renderAdminUsers(listData({ users: [], total: 0 }))

	expect(await screen.findByText(/no users yet/i)).toBeInTheDocument()
})

test('shows a search-specific empty state naming the query', async () => {
	renderAdminUsers(listData({ users: [], total: 0, search: 'ghost' }))

	expect(await screen.findByText(/no matching users/i)).toBeInTheDocument()
	expect(screen.getByText(/ghost/)).toBeInTheDocument()
})

test('paginates, carrying the active search onto the page links', async () => {
	renderAdminUsers(
		listData({
			users: [makeAdminUser()],
			total: 24,
			page: 1,
			pageCount: 3,
			search: 'ada',
		}),
	)

	const pager = await screen.findByRole('navigation', { name: /pagination/i })
	expect(within(pager).getByRole('link', { name: '2' })).toHaveAttribute(
		'href',
		'/admin/users?page=2&search=ada',
	)
})

test('omits the Pagination footer on a single page', async () => {
	renderAdminUsers(listData())

	await screen.findByText('Ada Lovelace')
	expect(
		screen.queryByRole('navigation', { name: /pagination/i }),
	).toBeNull()
})

test('offers a tri-state select-all and per-row selection checkboxes', async () => {
	renderAdminUsers(
		listData({
			users: [
				makeAdminUser({ id: 'a', name: 'Ada Lovelace' }),
				makeAdminUser({ id: 'g', name: 'Grace Hopper', email: 'grace@x.com' }),
			],
			total: 2,
		}),
	)

	// The header carries the select-all; each row carries its own labelled checkbox.
	expect(
		await screen.findByRole('checkbox', { name: /select all rows/i }),
	).toBeInTheDocument()
	expect(
		screen.getByRole('checkbox', { name: /select ada lovelace/i }),
	).toBeInTheDocument()
})

test('selecting a row reveals the bulk bar with the three offboarding actions', async () => {
	const user = userEvent.setup()
	renderAdminUsers(
		listData({
			users: [makeAdminUser({ id: 'a', name: 'Ada Lovelace' })],
		}),
	)

	// The bar is hidden until something is selected.
	expect(screen.queryByText(/1 selected/i)).toBeNull()

	await user.click(
		await screen.findByRole('checkbox', { name: /select ada lovelace/i }),
	)

	expect(await screen.findByText(/1 selected/i)).toBeInTheDocument()
	expect(screen.getByRole('button', { name: /deactivate/i })).toBeInTheDocument()
	expect(screen.getByRole('button', { name: /force log out/i })).toBeInTheDocument()
	expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument()
	expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
})
