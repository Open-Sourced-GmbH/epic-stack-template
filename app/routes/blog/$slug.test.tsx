/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import { prisma } from '#app/utils/db.server.ts'
import { createUser } from '#tests/db-utils.ts'
import Article, { loader, meta } from './$slug.tsx'

let slugCounter = 0
async function publishPost({
	title,
	body = 'body',
	excerpt,
	publishedAt = new Date('2026-01-01'),
	authorId,
	tags = [],
}: {
	title: string
	body?: string
	excerpt?: string
	publishedAt?: Date | null
	authorId?: string
	tags?: Array<{ name: string; slug: string }>
}) {
	return prisma.post.create({
		select: { id: true, slug: true },
		data: {
			title,
			slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${slugCounter++}`,
			body,
			excerpt,
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

function renderArticle(slug: string) {
	const Stub = createRoutesStub([
		{
			path: '/blog/:slug',
			Component: Article,
			// The typed loader requires `params.slug`; the stub's loader type is
			// generic, so cast to bridge the two in the test harness.
			loader: loader as any,
			HydrateFallback: () => null,
		},
	])
	render(<Stub initialEntries={[`/blog/${slug}`]} />)
}

test('an unknown slug 404s', async () => {
	const response = await loader({
		params: { slug: 'nope' },
		request: new Request('http://localhost/blog/nope'),
		context: {} as any,
	} as any).catch((r) => r as Response)

	expect(response).toBeInstanceOf(Response)
	expect((response as Response).status).toBe(404)
})

test("a Draft's slug 404s publicly", async () => {
	const draft = await publishPost({ title: 'Hidden', publishedAt: null })

	const response = await loader({
		params: { slug: draft.slug },
		request: new Request(`http://localhost/blog/${draft.slug}`),
		context: {} as any,
	} as any).catch((r) => r as Response)

	expect((response as Response).status).toBe(404)
})

test('a Published post renders its hero, dek, body, tags and byline', async () => {
	const author = await prisma.user.create({
		select: { id: true, name: true },
		data: { ...createUser(), name: 'Ada Lovelace' },
	})
	const post = await publishPost({
		title: 'Durable Web',
		excerpt: 'Why boring tech wins.',
		body: '## A section\n\nThe lede paragraph of the article body.',
		authorId: author.id,
		tags: [{ name: 'React', slug: 'react' }],
	})

	renderArticle(post.slug)

	// Single <h1> with the post title.
	const h1 = await screen.findByRole('heading', { level: 1, name: 'Durable Web' })
	expect(h1).toBeInTheDocument()
	// Dek (excerpt as standfirst) and rendered prose body.
	expect(screen.getByText('Why boring tech wins.')).toBeInTheDocument()
	expect(
		screen.getByText(/The lede paragraph of the article body\./),
	).toBeInTheDocument()
	// Byline shows the author's name; tag links into the archive.
	expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
	const tagLink = screen.getByRole('link', { name: /react/i })
	expect(tagLink).toHaveAttribute('href', '/blog/tags/react')
})

test('a post whose author was deleted renders the "Unknown" byline (SetNull)', async () => {
	const author = await prisma.user.create({
		select: { id: true },
		data: { ...createUser() },
	})
	const post = await publishPost({
		title: 'Orphaned',
		authorId: author.id,
	})
	// SetNull: deleting the author blanks the credit but the post stands.
	await prisma.user.delete({ where: { id: author.id } })

	renderArticle(post.slug)

	await screen.findByRole('heading', { level: 1, name: 'Orphaned' })
	expect(screen.getByText(/unknown/i)).toBeInTheDocument()
})

// The DB-driven adjacency (which posts are newer/older) is covered by the
// node-env `getAdjacentPosts` test. Here we pin the loader output so the
// component's prev/next rendering is asserted deterministically — free of the
// jsdom-suite's best-effort DB isolation.
test('prev/next cards render links to the adjacent posts from loaderData', async () => {
	const data = {
		post: {
			title: 'Current',
			slug: 'current',
			excerpt: null,
			publishedAt: new Date('2026-02-01'),
			coverImage: null,
			author: null,
			tags: [],
		},
		bodyHtml: '<p>Body.</p>',
		description: '',
		ogImage: null,
		newer: { title: 'Newer One', slug: 'newer-one' },
		older: { title: 'Older One', slug: 'older-one' },
	}
	const Stub = createRoutesStub([
		{ path: '/blog/:slug', Component: Article, loader: () => data },
	])
	render(<Stub initialEntries={['/blog/current']} />)

	const nav = await screen.findByRole('navigation', { name: /more posts/i })
	expect(within(nav).getByRole('link', { name: /Newer One/i })).toHaveAttribute(
		'href',
		'/blog/newer-one',
	)
	expect(within(nav).getByRole('link', { name: /Older One/i })).toHaveAttribute(
		'href',
		'/blog/older-one',
	)
})

test('meta emits a per-post title, article OG type and description fallback', async () => {
	const data = {
		post: { title: 'Durable Web', slug: 'durable-web' },
		description: 'Why boring tech wins.',
		ogImage: 'http://localhost/resources/images?objectKey=cover',
	} as any

	const tags = meta({ data } as any)
	const title = tags.find((t) => 'title' in t) as { title: string }
	expect(title.title).toMatch(/Durable Web/)
	expect(tags).toContainEqual({ property: 'og:type', content: 'article' })
	expect(tags).toContainEqual({
		name: 'description',
		content: 'Why boring tech wins.',
	})
	expect(tags).toContainEqual({
		property: 'og:image',
		content: 'http://localhost/resources/images?objectKey=cover',
	})
})

test('meta degrades to a not-found title when the post is missing', () => {
	const tags = meta({ data: undefined } as any)
	const title = tags.find((t) => 'title' in t) as { title: string }
	expect(title.title).toMatch(/not found/i)
})
