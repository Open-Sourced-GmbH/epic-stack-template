/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import AdminLayout, { type AdminHeader } from './_layout.tsx'

/**
 * Render the admin shell with a stub root that supplies the `requestInfo` the
 * AppShell navbar (theme + accent controls) reads, plus two child surfaces
 * (Blog / Cache) so the sidebar's active state and the handle-fed `PageHeader`
 * can be exercised.
 */
function renderAdmin(
	initialPath = '/admin/blog',
	handles: { blog?: { adminHeader: AdminHeader }; cache?: { adminHeader: AdminHeader } } = {},
	user: unknown = null,
) {
	const Stub = createRoutesStub([
		{
			id: 'root',
			path: '/',
			loader: () => ({
				requestInfo: {
					hints: { theme: 'light', timeZone: 'UTC' },
					userPrefs: { theme: 'light' },
				},
				user,
			}),
			HydrateFallback: () => null,
			children: [
				{
					path: 'admin',
					Component: AdminLayout,
					children: [
						{
							path: 'blog',
							Component: () => <p>blog body</p>,
							handle: handles.blog,
						},
						{
							path: 'cache',
							Component: () => <p>cache body</p>,
							handle: handles.cache,
						},
					],
				},
			],
		},
	])
	render(<Stub initialEntries={[initialPath]} />)
}

/** The shared section `Sidebar` exposes its nav under the "Admin" label. */
function adminSidebar() {
	return within(screen.getByRole('navigation', { name: 'Admin' }))
}

test('renders the section sidebar with Blog / Cache around the outlet', async () => {
	renderAdmin('/admin/blog')

	expect(await screen.findByText('blog body')).toBeInTheDocument()
	const sidebar = adminSidebar()
	// The admin rail groups the surfaces under Blog / System.
	expect(sidebar.getByText('System')).toBeInTheDocument()
	expect(sidebar.getByRole('link', { name: 'Blog' })).toHaveAttribute(
		'href',
		'/admin/blog',
	)
	expect(sidebar.getByRole('link', { name: 'Cache' })).toHaveAttribute(
		'href',
		'/admin/cache',
	)
})

/** A user holding `read:user:any` — an access manager — for the gating tests. */
const accessManager = {
	id: 'mgr',
	name: 'Manager',
	username: 'mgr',
	roles: [
		{
			name: 'admin',
			permissions: [{ entity: 'user', action: 'read', access: 'any' }],
		},
	],
}

test('hides the Access group from a viewer without management permission', async () => {
	renderAdmin('/admin/blog')

	await screen.findByText('blog body')
	const sidebar = adminSidebar()
	// Blog/Cache are always there; the access-management group is not.
	expect(sidebar.getByRole('link', { name: 'Blog' })).toBeInTheDocument()
	expect(sidebar.queryByText('Access')).toBeNull()
	expect(sidebar.queryByRole('link', { name: 'Users' })).toBeNull()
})

test('reveals the Access group (Users) to a manager holding read:user:any', async () => {
	renderAdmin('/admin/blog', {}, accessManager)

	await screen.findByText('blog body')
	const sidebar = adminSidebar()
	expect(sidebar.getByText('Access')).toBeInTheDocument()
	expect(sidebar.getByRole('link', { name: 'Users' })).toHaveAttribute(
		'href',
		'/admin/users',
	)
})

test('the bespoke rail lockup is gone — the navbar owns the wordmark', async () => {
	renderAdmin('/admin/blog')

	await screen.findByText('blog body')
	expect(screen.queryByText('Pine Admin')).toBeNull()
})

test('marks the active section with aria-current', async () => {
	renderAdmin('/admin/cache')

	await screen.findByText('cache body')
	const sidebar = adminSidebar()
	expect(sidebar.getByRole('link', { name: 'Cache' })).toHaveAttribute(
		'aria-current',
		'page',
	)
	expect(sidebar.getByRole('link', { name: 'Blog' })).not.toHaveAttribute(
		'aria-current',
	)
})

test('collapses to the navbar hamburger drawer on mobile', async () => {
	renderAdmin('/admin/blog')

	await screen.findByText('blog body')
	// The navbar owns the single mobile menu (the „Menü" hamburger); the section
	// nav rides inside its drawer, so there is no separate sidebar trigger.
	expect(screen.getByRole('button', { name: 'Menü' })).toBeInTheDocument()
	expect(screen.queryByRole('button', { name: /open admin menu/i })).toBeNull()
})

test('renders the branded PageHeader when a routed surface feeds one', async () => {
	renderAdmin('/admin/blog', {
		blog: { adminHeader: { eyebrow: 'Admin', title: 'Posts' } },
	})

	const heading = await screen.findByRole('heading', { name: 'Posts', level: 1 })
	expect(heading).toBeInTheDocument()
})

test('omits the PageHeader when no surface feeds one', async () => {
	renderAdmin('/admin/blog')

	await screen.findByText('blog body')
	expect(screen.queryByRole('heading')).toBeNull()
})
