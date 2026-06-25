/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import { type AdminRole } from '#app/utils/rbac-admin.server.ts'
import AdminRolesIndex from './index.tsx'

function makeRole(overrides: Partial<AdminRole> = {}): AdminRole {
	return {
		id: 'r1',
		name: 'editor',
		description: 'Curates the blog',
		system: false,
		userCount: 3,
		...overrides,
	}
}

/**
 * Render the admin roles list with a pinned loader payload (no DB) — route render
 * tests assert what the component does with a known list, not DB-global facts.
 */
function renderRoles(roles: AdminRole[]) {
	const Stub = createRoutesStub([
		{
			path: '/admin/roles',
			Component: AdminRolesIndex,
			loader: () => ({ roles }),
			HydrateFallback: () => null,
		},
	])
	render(<Stub initialEntries={['/admin/roles']} />)
}

test('renders each role with name, description, type marker, count and a footer summary', async () => {
	renderRoles([
		makeRole({ id: 'a', name: 'admin', description: 'Full access', system: true, userCount: 1 }),
		makeRole({ id: 'e', name: 'editor', description: 'Curates the blog', system: false, userCount: 3 }),
	])

	expect(await screen.findByText('admin')).toBeInTheDocument()
	expect(screen.getByText('Curates the blog')).toBeInTheDocument()
	// The System/Custom markers and the (unique) custom-role count.
	expect(screen.getByText('System')).toBeInTheDocument()
	expect(screen.getByText('Custom')).toBeInTheDocument()
	expect(screen.getByText('3')).toBeInTheDocument()
	// The footer summarises the split.
	expect(
		screen.getByText(/2 roles · 1 system, 1 custom/i),
	).toBeInTheDocument()
})

test('a system role exposes View only — no rename/delete affordance', async () => {
	const user = userEvent.setup()
	renderRoles([makeRole({ id: 'a', name: 'admin', system: true })])

	await user.click(
		await screen.findByRole('button', { name: /actions for admin/i }),
	)
	const menu = await screen.findByRole('menu')
	expect(within(menu).getByRole('menuitem', { name: /view/i })).toBeInTheDocument()
	expect(within(menu).queryByRole('menuitem', { name: /edit/i })).toBeNull()
})

test('a custom role exposes an Edit affordance into the editor', async () => {
	const user = userEvent.setup()
	renderRoles([makeRole({ id: 'e', name: 'editor', system: false })])

	await user.click(
		await screen.findByRole('button', { name: /actions for editor/i }),
	)
	const menu = await screen.findByRole('menu')
	expect(within(menu).getByRole('menuitem', { name: /edit/i })).toHaveAttribute(
		'href',
		'/admin/roles/e',
	)
})

test('shows the "no roles yet" empty state with an empty list', async () => {
	renderRoles([])

	expect(await screen.findByText(/no roles yet/i)).toBeInTheDocument()
})
