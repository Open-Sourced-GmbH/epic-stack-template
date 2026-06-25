/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import { UserDropdown } from './user-dropdown.tsx'

/**
 * Render the dropdown with a logged-in user supplied by a stub `root` loader
 * (`useUser` reads it from there). `roles` decides whether the Admin item shows.
 */
function renderDropdown({
	roles = [],
}: {
	roles?: Array<{ name: string; permissions: never[] }>
} = {}) {
	const Stub = createRoutesStub([
		{
			id: 'root',
			path: '/',
			loader: () => ({
				user: {
					id: 'u1',
					name: 'Anna Keller',
					username: 'anna',
					email: 'anna@epic.dev',
					image: null,
					roles,
				},
			}),
			HydrateFallback: () => null,
			children: [{ index: true, Component: () => <UserDropdown /> }],
		},
	])
	render(<Stub initialEntries={['/']} />)
}

test('shows a name + email identity header above the menu items when opened', async () => {
	const user = userEvent.setup()
	renderDropdown()

	await user.click(await screen.findByRole('link', { name: /user menu/i }))

	const menu = await screen.findByRole('menu')
	// Identity header carries the name and the (truncated) email…
	expect(within(menu).getByText('Anna Keller')).toBeInTheDocument()
	expect(within(menu).getByText('anna@epic.dev')).toBeInTheDocument()
	// …and the existing items and logout behavior are unchanged.
	expect(
		within(menu).getByRole('menuitem', { name: /account/i }),
	).toHaveAttribute('href', '/settings/profile')
	expect(
		within(menu).getByRole('menuitem', { name: /logout/i }),
	).toBeInTheDocument()
})

test('surfaces the Admin item only for admins', async () => {
	const user = userEvent.setup()
	renderDropdown({ roles: [{ name: 'admin', permissions: [] }] })

	await user.click(await screen.findByRole('link', { name: /user menu/i }))

	const menu = await screen.findByRole('menu')
	expect(within(menu).getByRole('menuitem', { name: /admin/i })).toHaveAttribute(
		'href',
		'/admin/blog',
	)
})
