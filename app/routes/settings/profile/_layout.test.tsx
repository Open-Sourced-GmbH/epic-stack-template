/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import AccountLayout from './_layout.tsx'

/**
 * Render the account shell with a stub root that supplies the `requestInfo` the
 * AppShell navbar (theme + accent controls) reads, plus a handful of child
 * surfaces (General / Email / Connections) so the sidebar's active state and the
 * `<main>` landmark can be exercised.
 */
function renderAccount(initialPath = '/settings/profile') {
	const Stub = createRoutesStub([
		{
			id: 'root',
			path: '/',
			loader: () => ({
				requestInfo: {
					hints: { theme: 'light', timeZone: 'UTC' },
					userPrefs: { theme: 'light' },
				},
			}),
			HydrateFallback: () => null,
			children: [
				{
					path: 'settings/profile',
					Component: AccountLayout,
					children: [
						{ index: true, Component: () => <p>general body</p> },
						{ path: 'change-email', Component: () => <p>email body</p> },
						{ path: 'connections', Component: () => <p>connections body</p> },
					],
				},
			],
		},
	])
	render(<Stub initialEntries={[initialPath]} />)
}

/** The shared section `Sidebar` exposes its nav under the "Account" label. */
function accountSidebar() {
	return within(screen.getByRole('navigation', { name: 'Account' }))
}

test('renders an Account + Security sidebar around the outlet', async () => {
	renderAccount('/settings/profile')

	expect(await screen.findByText('general body')).toBeInTheDocument()
	const sidebar = accountSidebar()
	expect(sidebar.getByText('Account')).toBeInTheDocument()
	expect(sidebar.getByText('Security')).toBeInTheDocument()
	expect(sidebar.getByRole('link', { name: 'General' })).toHaveAttribute(
		'href',
		'/settings/profile',
	)
	expect(sidebar.getByRole('link', { name: 'Email' })).toHaveAttribute(
		'href',
		'/settings/profile/change-email',
	)
	expect(sidebar.getByRole('link', { name: 'Password' })).toHaveAttribute(
		'href',
		'/settings/profile/password',
	)
	expect(sidebar.getByRole('link', { name: 'Two-Factor' })).toHaveAttribute(
		'href',
		'/settings/profile/two-factor',
	)
	expect(sidebar.getByRole('link', { name: 'Connections' })).toHaveAttribute(
		'href',
		'/settings/profile/connections',
	)
	expect(sidebar.getByRole('link', { name: 'Passkeys' })).toHaveAttribute(
		'href',
		'/settings/profile/passkeys',
	)
})

test('lands on General inside a <main> landmark, with no breadcrumb trail', async () => {
	renderAccount('/settings/profile')

	expect(await screen.findByText('general body')).toBeInTheDocument()
	expect(screen.getByRole('main')).toBeInTheDocument()
	// The old breadcrumb trail rooted a "Profile" link — the sidebar replaces it.
	expect(screen.queryByRole('link', { name: 'Profile' })).toBeNull()
})

test('marks the active Security section with aria-current', async () => {
	renderAccount('/settings/profile/change-email')

	await screen.findByText('email body')
	const sidebar = accountSidebar()
	expect(sidebar.getByRole('link', { name: 'Email' })).toHaveAttribute(
		'aria-current',
		'page',
	)
	expect(sidebar.getByRole('link', { name: 'General' })).not.toHaveAttribute(
		'aria-current',
	)
})

test('General lights up only on the index, never under a Security child', async () => {
	renderAccount('/settings/profile/connections')

	await screen.findByText('connections body')
	const sidebar = accountSidebar()
	expect(sidebar.getByRole('link', { name: 'Connections' })).toHaveAttribute(
		'aria-current',
		'page',
	)
	expect(sidebar.getByRole('link', { name: 'General' })).not.toHaveAttribute(
		'aria-current',
	)
})

test('collapses to a hamburger drawer trigger on mobile', async () => {
	renderAccount('/settings/profile')

	await screen.findByText('general body')
	expect(
		screen.getByRole('button', { name: /open account menu/i }),
	).toBeInTheDocument()
})
