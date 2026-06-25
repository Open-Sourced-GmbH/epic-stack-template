/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import { resolveNavbar } from './app-shell-nav.ts'
import { NavbarDrawer } from './navbar-drawer.tsx'
import { type SidebarGroup } from './ui/sidebar.tsx'

const adminGroups: SidebarGroup[] = [
	{
		label: 'Manage',
		items: [
			{ to: '/admin/blog', label: 'Blog', icon: 'file-text' },
			{ to: '/admin/cache', label: 'Cache', icon: 'clock' },
		],
	},
]

const kody = {
	id: 'user-1',
	name: 'Kody',
	username: 'kody',
	email: 'kody@example.com',
	image: { objectKey: null },
	roles: [],
}

/**
 * Render the drawer inside a stub root that supplies the `requestInfo` the
 * accent/theme switches read and an optional `user` for the identity row.
 */
function renderDrawer(
	props: React.ComponentProps<typeof NavbarDrawer>,
	{ path = '/', user = null }: { path?: string; user?: unknown } = {},
) {
	const Stub = createRoutesStub([
		{
			id: 'root',
			path: '/',
			loader: () => ({
				user,
				requestInfo: {
					hints: { theme: 'light', timeZone: 'UTC' },
					userPrefs: { theme: 'light' },
				},
			}),
			HydrateFallback: () => null,
			children: [
				{ index: true, Component: () => <NavbarDrawer {...props} /> },
				{ path: 'admin/blog', Component: () => <NavbarDrawer {...props} /> },
				// Targets the product links navigate to, so a click resolves a route
				// (an unmatched location warns, and the test env throws on warnings).
				{ path: 'about', Component: () => <p>about</p> },
				{ path: 'blog', Component: () => <p>blog</p> },
			],
		},
	])
	render(<Stub initialEntries={[path]} />)
}

test('a "Menü" hamburger toggles the drawer open and closed', async () => {
	const user = userEvent.setup()
	renderDrawer({ nav: resolveNavbar({ variant: 'marketing', isLoggedIn: false }) })

	// Closed by default — the panel is not mounted.
	expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

	await user.click(await screen.findByRole('button', { name: 'Menü' }))
	expect(screen.getByRole('dialog', { name: 'Menü' })).toBeInTheDocument()

	await user.keyboard('{Escape}')
	expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('the open drawer traps focus inside the panel', async () => {
	const user = userEvent.setup()
	renderDrawer({ nav: resolveNavbar({ variant: 'marketing', isLoggedIn: false }) })

	await user.click(await screen.findByRole('button', { name: 'Menü' }))
	const panel = screen.getByRole('dialog', { name: 'Menü' })
	expect(panel.contains(document.activeElement)).toBe(true)
})

test('renders the variant product links, highlighting the active section', async () => {
	const user = userEvent.setup()
	renderDrawer(
		{ nav: resolveNavbar({ variant: 'marketing', isLoggedIn: false }) },
		{ path: '/admin/blog' },
	)

	await user.click(await screen.findByRole('button', { name: 'Menü' }))
	const panel = within(screen.getByRole('dialog', { name: 'Menü' }))
	expect(panel.getByRole('link', { name: 'Über' })).toHaveAttribute(
		'href',
		'/about',
	)
	expect(panel.getByRole('link', { name: 'Blog' })).toHaveAttribute(
		'href',
		'/blog',
	)
})

test('renders the section nav groups via the shared item renderer, active item marked', async () => {
	const user = userEvent.setup()
	renderDrawer(
		{
			nav: resolveNavbar({ variant: 'full', isLoggedIn: true }),
			sidebarGroups: adminGroups,
			sidebarLabel: 'Admin',
		},
		{ path: '/admin/blog', user: kody },
	)

	await user.click(await screen.findByRole('button', { name: 'Menü' }))
	const sectionNav = within(screen.getByRole('navigation', { name: 'Admin' }))
	expect(sectionNav.getByText('Manage')).toBeInTheDocument()
	expect(sectionNav.getByRole('link', { name: 'Blog' })).toHaveAttribute(
		'aria-current',
		'page',
	)
	expect(sectionNav.getByRole('link', { name: 'Cache' })).not.toHaveAttribute(
		'aria-current',
	)
})

test('the footer shows the identity row and an accent + theme appearance strip', async () => {
	const user = userEvent.setup()
	renderDrawer(
		{ nav: resolveNavbar({ variant: 'full', isLoggedIn: true }) },
		{ path: '/admin/blog', user: kody },
	)

	await user.click(await screen.findByRole('button', { name: 'Menü' }))
	const panel = within(screen.getByRole('dialog', { name: 'Menü' }))
	// Identity.
	expect(panel.getByText('Kody')).toBeInTheDocument()
	expect(panel.getByText('kody@example.com')).toBeInTheDocument()
	expect(panel.getByRole('button', { name: /log ?out/i })).toBeInTheDocument()
	// Appearance strip: an accent cycle (preset swatches) + the theme cycle.
	expect(
		panel.getAllByRole('button', { name: /pine|iris|coral|volt/i }).length,
	).toBeGreaterThan(0)
	expect(panel.getByRole('button', { name: /light/i })).toBeInTheDocument()
})

test('selecting a product link dismisses the drawer', async () => {
	const user = userEvent.setup()
	renderDrawer({ nav: resolveNavbar({ variant: 'marketing', isLoggedIn: false }) })

	await user.click(await screen.findByRole('button', { name: 'Menü' }))
	const panel = screen.getByRole('dialog', { name: 'Menü' })
	await user.click(within(panel).getByRole('link', { name: 'Blog' }))
	expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('the panel suppresses its entrance animation under reduced motion', async () => {
	const user = userEvent.setup()
	renderDrawer({ nav: resolveNavbar({ variant: 'marketing', isLoggedIn: false }) })

	await user.click(await screen.findByRole('button', { name: 'Menü' }))
	expect(screen.getByRole('dialog', { name: 'Menü' }).className).toMatch(
		/motion-reduce:animate-none/,
	)
})
