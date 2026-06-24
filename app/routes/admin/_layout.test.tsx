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

test('renders a Manage sidebar with Blog / Cache around the outlet', async () => {
	renderAdmin('/admin/blog')

	expect(await screen.findByText('blog body')).toBeInTheDocument()
	const sidebar = adminSidebar()
	expect(sidebar.getByText('Manage')).toBeInTheDocument()
	expect(sidebar.getByRole('link', { name: 'Blog' })).toHaveAttribute(
		'href',
		'/admin/blog',
	)
	expect(sidebar.getByRole('link', { name: 'Cache' })).toHaveAttribute(
		'href',
		'/admin/cache',
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

test('collapses to a hamburger drawer trigger on mobile', async () => {
	renderAdmin('/admin/blog')

	await screen.findByText('blog body')
	expect(
		screen.getByRole('button', { name: /open admin menu/i }),
	).toBeInTheDocument()
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
