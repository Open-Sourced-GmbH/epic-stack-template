/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import AdminLayout, { type AdminHeader } from './_layout.tsx'

/**
 * Render the admin shell with a stub root that supplies the `requestInfo` the
 * in-shell theme toggle reads, plus two child surfaces (Blog / Cache) so the
 * rail's active state and the handle-fed `PageHeader` can be exercised.
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

test('renders the Pine Admin lockup and a Blog / Cache nav rail around the outlet', async () => {
	renderAdmin('/admin/blog')

	expect(await screen.findByText('blog body')).toBeInTheDocument()
	expect(screen.getByText('Pine Admin')).toBeInTheDocument()
	expect(screen.getByRole('link', { name: /blog/i })).toHaveAttribute(
		'href',
		'/admin/blog',
	)
	expect(screen.getByRole('link', { name: /cache/i })).toHaveAttribute(
		'href',
		'/admin/cache',
	)
})

test('marks the active section with aria-current', async () => {
	renderAdmin('/admin/cache')

	await screen.findByText('cache body')
	expect(screen.getByRole('link', { name: /cache/i })).toHaveAttribute(
		'aria-current',
		'page',
	)
	expect(screen.getByRole('link', { name: /blog/i })).not.toHaveAttribute(
		'aria-current',
	)
})

test('exposes a binary dark-mode toggle but never the accent customizer (ADR-066)', async () => {
	renderAdmin('/admin/blog')

	await screen.findByText('blog body')
	expect(
		screen.getByRole('switch', { name: /toggle dark mode/i }),
	).toBeInTheDocument()
	// The accent customizer is a hue slider — it must not be mounted here.
	expect(screen.queryByRole('slider')).toBeNull()
})

test('renders the branded PageHeader when a routed surface feeds one', async () => {
	renderAdmin('/admin/blog', {
		blog: { adminHeader: { eyebrow: 'Admin', title: 'Posts' } },
	})

	const heading = await screen.findByRole('heading', { name: 'Posts', level: 1 })
	expect(heading).toBeInTheDocument()
	expect(screen.getByText('Admin')).toBeInTheDocument()
})

test('omits the PageHeader when no surface feeds one', async () => {
	renderAdmin('/admin/blog')

	await screen.findByText('blog body')
	expect(screen.queryByRole('heading')).toBeNull()
})
