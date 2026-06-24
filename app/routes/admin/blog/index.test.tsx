/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import { type AdminPost, type AdminPostList } from '#app/utils/post.server.ts'
import AdminBlogIndex from './index.tsx'

function makeAdminPost(overrides: Partial<AdminPost> = {}): AdminPost {
	return {
		id: 'p1',
		title: 'A Published Post',
		slug: 'a-published-post',
		publishedAt: new Date('2026-02-01'),
		updatedAt: new Date('2026-02-10'),
		coverImage: null,
		author: { name: 'Ada Lovelace', username: 'ada', image: null },
		...overrides,
	}
}

/**
 * Render the admin list with a pinned loader payload (no DB) — route render
 * tests assert what the component does with a known feed, not DB-global facts.
 */
function renderAdminBlog(data: AdminPostList) {
	const Stub = createRoutesStub([
		{
			path: '/admin/blog',
			Component: AdminBlogIndex,
			loader: () => data,
			HydrateFallback: () => null,
		},
	])
	render(<Stub initialEntries={['/admin/blog']} />)
}

test('lists drafts and published posts with status badges, author line and counts', async () => {
	renderAdminBlog({
		posts: [
			makeAdminPost({ id: 'pub', title: 'Shipped Post', slug: 'shipped' }),
			makeAdminPost({
				id: 'draft',
				title: 'Work In Progress',
				slug: 'wip',
				publishedAt: null,
			}),
		],
		total: 2,
		publishedCount: 1,
		page: 1,
		pageCount: 1,
	})

	// Header counts reflect the full list (Drafts included) and the live subset.
	expect(await screen.findByText(/2 total · 1 published/i)).toBeInTheDocument()

	// Each row is click-to-edit: the title links into the editor.
	const shipped = screen.getByRole('link', { name: 'Shipped Post' })
	expect(shipped).toHaveAttribute('href', '/admin/blog/pub/edit')

	// Status badges: Published vs Draft.
	expect(screen.getByText('Published')).toBeInTheDocument()
	expect(screen.getByText('Draft')).toBeInTheDocument()

	// Author line carries the name and the monospace slug.
	expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0)
	expect(screen.getByText('/shipped')).toBeInTheDocument()
})

test('an untitled draft shows the italic placeholder, not an empty title', async () => {
	renderAdminBlog({
		posts: [
			makeAdminPost({
				id: 'd',
				title: '   ',
				slug: 'untitled',
				publishedAt: null,
			}),
		],
		total: 1,
		publishedCount: 0,
		page: 1,
		pageCount: 1,
	})

	const placeholder = await screen.findByRole('link', {
		name: /untitled draft/i,
	})
	expect(placeholder).toHaveAttribute('href', '/admin/blog/d/edit')
	expect(placeholder).toHaveClass('italic')
})

test('the kebab is a labelled native trigger that opens its actions menu', async () => {
	const user = userEvent.setup()
	renderAdminBlog({
		posts: [
			makeAdminPost({ id: 'pub', title: 'Shipped Post', slug: 'shipped' }),
		],
		total: 1,
		publishedCount: 1,
		page: 1,
		pageCount: 1,
	})

	const kebab = await screen.findByRole('button', {
		name: /actions for shipped post/i,
	})
	// A native <button> trigger (Button is not forwardRef), not an asChild Button.
	expect(kebab.tagName).toBe('BUTTON')

	await user.click(kebab)

	const menu = await screen.findByRole('menu')
	// A published post can be viewed live at its public slug.
	const viewLive = within(menu).getByRole('menuitem', { name: /view live/i })
	expect(viewLive).toHaveAttribute('href', '/blog/shipped')
})

test('a draft kebab omits "View live" (no public URL yet)', async () => {
	const user = userEvent.setup()
	renderAdminBlog({
		posts: [
			makeAdminPost({
				id: 'd',
				title: 'Draft Post',
				slug: 'draft',
				publishedAt: null,
			}),
		],
		total: 1,
		publishedCount: 0,
		page: 1,
		pageCount: 1,
	})

	await user.click(
		await screen.findByRole('button', { name: /actions for draft post/i }),
	)

	const menu = await screen.findByRole('menu')
	expect(
		within(menu).queryByRole('menuitem', { name: /view live/i }),
	).toBeNull()
	expect(
		within(menu).getByRole('menuitem', { name: /edit/i }),
	).toBeInTheDocument()
})

test('renders a Pagination footer linking to the next page when there is more than one', async () => {
	renderAdminBlog({
		posts: [
			makeAdminPost({ id: 'pub', title: 'Shipped Post', slug: 'shipped' }),
		],
		total: 24,
		publishedCount: 12,
		page: 1,
		pageCount: 3,
	})

	const pager = await screen.findByRole('navigation', { name: /pagination/i })
	expect(within(pager).getByRole('link', { name: '2' })).toHaveAttribute(
		'href',
		'/admin/blog?page=2',
	)
})

test('omits the Pagination footer on a single page', async () => {
	renderAdminBlog({
		posts: [
			makeAdminPost({ id: 'pub', title: 'Shipped Post', slug: 'shipped' }),
		],
		total: 1,
		publishedCount: 1,
		page: 1,
		pageCount: 1,
	})

	await screen.findByRole('link', { name: 'Shipped Post' })
	expect(screen.queryByRole('navigation', { name: /pagination/i })).toBeNull()
})

test('with no posts it shows the empty state and a New post link', async () => {
	renderAdminBlog({
		posts: [],
		total: 0,
		publishedCount: 0,
		page: 1,
		pageCount: 1,
	})

	expect(await screen.findByText(/no posts yet/i)).toBeInTheDocument()
	// Both the always-present header action and the empty-state CTA point to the
	// editor (the header New post button stays even with zero posts).
	const ctas = screen.getAllByRole('link', { name: /new post/i })
	expect(ctas.length).toBeGreaterThanOrEqual(1)
	for (const cta of ctas) {
		expect(cta).toHaveAttribute('href', '/admin/blog/new')
	}
})
