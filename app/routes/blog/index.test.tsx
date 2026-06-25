/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { prisma } from '#app/utils/db.server.ts'
import { createUser } from '#tests/db-utils.ts'
import BlogLayout from './_layout.tsx'
import BlogIndex, { loader, meta } from './index.tsx'

beforeEach(() => {
	// The shared chrome mounts the theme customizer, which reads matchMedia.
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: query.includes('reduce'),
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}))
})

afterEach(() => {
	vi.unstubAllGlobals()
})

let slugCounter = 0
async function publishPost({
	title,
	publishedAt,
	tags = [],
	authorId,
}: {
	title: string
	publishedAt: Date
	tags?: Array<{ name: string; slug: string }>
	authorId?: string
}) {
	return prisma.post.create({
		select: { id: true, slug: true },
		data: {
			title,
			slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${slugCounter++}`,
			body: 'body',
			excerpt: `Excerpt for ${title}.`,
			publishedAt,
			authorId,
			tags: {
				connectOrCreate: tags.map((t) => ({
					where: { slug: t.slug },
					create: t,
				})),
			},
		},
	})
}

function renderBlog(initialEntries: string[], withChrome = false) {
	const indexRoute = {
		index: true as const,
		Component: BlogIndex,
		loader,
		HydrateFallback: () => null,
	}
	const Stub = createRoutesStub([
		withChrome
			? // The AppShell navbar mounts the cookie-backed accent + theme switches,
				// which read `requestInfo` from the root loader, so the chrome path
				// needs a stub `root` route supplying it (mirrors the admin shell test).
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
						{ path: 'blog', Component: BlogLayout, children: [indexRoute] },
					],
				}
			: {
					path: '/blog',
					Component: BlogIndex,
					loader,
					HydrateFallback: () => null,
				},
	])
	render(<Stub initialEntries={initialEntries} />)
}

test('meta sets a title for the blog index', () => {
	const tags = meta({} as any)
	const title = tags.find((t) => 'title' in t) as { title: string }
	expect(title?.title).toMatch(/blog/i)
})

test('with no published posts it shows the empty state with a link to the editor', async () => {
	renderBlog(['/blog'])

	await screen.findByText(/no posts published yet/i)
	const cta = screen.getByRole('link', { name: /write|first post|new post/i })
	expect(cta).toHaveAttribute('href', expect.stringContaining('/admin/blog'))
})

test('page 1 promotes the newest post as the hero and grids the rest', async () => {
	const author = await prisma.user.create({
		select: { id: true },
		data: { ...createUser() },
	})
	await publishPost({
		title: 'Oldest Post',
		publishedAt: new Date('2026-01-01'),
		authorId: author.id,
	})
	const newest = await publishPost({
		title: 'Newest Post',
		publishedAt: new Date('2026-03-01'),
		tags: [{ name: 'React', slug: 'react' }],
		authorId: author.id,
	})

	renderBlog(['/blog'])

	// The hero lead is the newest post, surfaced as the lead heading.
	await screen.findByRole('heading', { name: 'Newest Post' })
	// Every post links to its article page.
	const newestLink = screen.getByRole('link', { name: /Newest Post/i })
	expect(newestLink).toHaveAttribute('href', `/blog/${newest.slug}`)
	expect(screen.getByText('Oldest Post')).toBeInTheDocument()
	// Tags are their own links into the tag archive.
	const tagLink = screen.getByRole('link', { name: /react/i })
	expect(tagLink).toHaveAttribute('href', '/blog/tags/react')
})

test('page 2 hides the hero and shows the pager', async () => {
	for (let i = 0; i < 8; i++) {
		await publishPost({
			title: `Post ${i}`,
			publishedAt: new Date(2026, 0, i + 1),
		})
	}

	renderBlog(['/blog?page=2'])

	// 8 posts at 6/page → page 2 has 2 posts; the newest (Post 7) is NOT the hero.
	const pager = await screen.findByRole('navigation', { name: 'Pagination' })
	expect(pager).toBeInTheDocument()
	// page 2 link is marked current
	expect(within(pager).getByRole('link', { current: 'page' })).toHaveTextContent(
		'2',
	)
	// the global newest post (the page-1 hero) does not appear on page 2
	expect(screen.queryByText('Post 7')).toBeNull()
})

test('renders inside the unified AppShell navbar (marketing variant)', async () => {
	renderBlog(['/blog'], true)

	const nav = await screen.findByRole('navigation', { name: 'Primary' })
	expect(nav).toBeInTheDocument()
	// Marketing variant, logged out: the Über + Blog product links and the
	// guest CTA (→ signup), not the `full` Log In button.
	expect(within(nav).getByRole('link', { name: 'Über' })).toHaveAttribute(
		'href',
		'/about',
	)
	expect(within(nav).getByRole('link', { name: 'Blog' })).toHaveAttribute(
		'href',
		'/blog',
	)
	expect(screen.getByRole('link', { name: /los geht's/i })).toHaveAttribute(
		'href',
		'/signup',
	)
	expect(screen.queryByRole('link', { name: 'Log In' })).toBeNull()
})
