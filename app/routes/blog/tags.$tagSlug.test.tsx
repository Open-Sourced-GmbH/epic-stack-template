/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import { prisma } from '#app/utils/db.server.ts'
import TagArchive, { loader, meta } from './tags.$tagSlug.tsx'

let slugCounter = 0
async function publishPost({
	title,
	publishedAt = new Date('2026-01-01'),
	tags = [],
}: {
	title: string
	publishedAt?: Date | null
	tags?: Array<{ name: string; slug: string }>
}) {
	return prisma.post.create({
		select: { id: true, slug: true },
		data: {
			title,
			slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${slugCounter++}`,
			body: 'body',
			excerpt: `Excerpt for ${title}.`,
			publishedAt,
			tags: {
				connectOrCreate: tags.map((t) => ({
					where: { slug: t.slug },
					create: t,
				})),
			},
		},
	})
}

function callLoader(tagSlug: string) {
	return loader({
		params: { tagSlug },
		request: new Request(`http://localhost/blog/tags/${tagSlug}`),
		context: {} as any,
	} as any)
}

/** Render the archive with the loaderData pinned, free of the jsdom DB suite. */
function renderArchive(data: any) {
	const Stub = createRoutesStub([
		{
			path: '/blog/tags/:tagSlug',
			Component: TagArchive,
			loader: () => data,
			HydrateFallback: () => null,
		},
	])
	render(<Stub initialEntries={['/blog/tags/react']} />)
}

test('an unknown tag slug 404s', async () => {
	const response = await callLoader('does-not-exist').catch((r) => r as Response)

	expect(response).toBeInstanceOf(Response)
	expect((response as Response).status).toBe(404)
})

test('a known tag returns its feed (the empty state is not a 404)', async () => {
	// Known tag, but its only post is a Draft → a real feed with total 0.
	await publishPost({
		title: 'Hidden',
		publishedAt: null,
		tags: [{ name: 'React', slug: 'react' }],
	})

	const feed = await callLoader('react')

	expect(feed.tag).toEqual({ name: 'React', slug: 'react' })
	expect(feed.total).toBe(0)
})

test('the header shows the tag label and an accurate post count', async () => {
	renderArchive({
		tag: { name: 'React', slug: 'react' },
		total: 3,
		page: 1,
		pageCount: 1,
		perPage: 6,
		posts: [
			{
				id: '1',
				title: 'First',
				slug: 'first',
				excerpt: 'One.',
				publishedAt: new Date('2026-01-03'),
				coverImage: null,
				author: null,
				tags: [{ name: 'React', slug: 'react' }],
			},
		],
	})

	expect(
		await screen.findByRole('heading', { level: 1, name: 'React' }),
	).toBeInTheDocument()
	expect(screen.getByText('3 posts')).toBeInTheDocument()
	// A card links through to its article.
	expect(screen.getByRole('link', { name: /first/i })).toHaveAttribute(
		'href',
		'/blog/first',
	)
	// The back-link returns to the index.
	expect(screen.getByRole('link', { name: /back to blog/i })).toHaveAttribute(
		'href',
		'/blog',
	)
})

test('the post count reads "1 post" (singular) for a single post', async () => {
	renderArchive({
		tag: { name: 'CSS', slug: 'css' },
		total: 1,
		page: 1,
		pageCount: 1,
		perPage: 6,
		posts: [
			{
				id: '1',
				title: 'Only',
				slug: 'only',
				excerpt: null,
				publishedAt: new Date('2026-01-01'),
				coverImage: null,
				author: null,
				tags: [{ name: 'CSS', slug: 'css' }],
			},
		],
	})

	expect(await screen.findByText('1 post')).toBeInTheDocument()
})

test('a known tag with no published posts renders the empty state, not a 404', async () => {
	renderArchive({
		tag: { name: 'Empty', slug: 'empty' },
		total: 0,
		page: 1,
		pageCount: 1,
		perPage: 6,
		posts: [],
	})

	expect(
		await screen.findByText(/nothing published under this tag yet/i),
	).toBeInTheDocument()
	expect(screen.getByText('0 posts')).toBeInTheDocument()
	expect(
		screen.getByRole('link', { name: /browse all posts/i }),
	).toHaveAttribute('href', '/blog')
})

test('the pager links stay within the tag archive on page 2+', async () => {
	renderArchive({
		tag: { name: 'React', slug: 'react' },
		total: 12,
		page: 2,
		pageCount: 2,
		perPage: 6,
		posts: [
			{
				id: '7',
				title: 'Seventh',
				slug: 'seventh',
				excerpt: null,
				publishedAt: new Date('2026-01-01'),
				coverImage: null,
				author: null,
				tags: [{ name: 'React', slug: 'react' }],
			},
		],
	})

	const pager = await screen.findByRole('navigation', { name: 'Pagination' })
	expect(within(pager).getByRole('link', { name: /previous page/i })).toHaveAttribute(
		'href',
		'/blog/tags/react',
	)
	expect(within(pager).getByRole('link', { current: 'page' })).toHaveTextContent(
		'2',
	)
})

test('meta emits a per-tag title and degrades when the tag is missing', () => {
	const tags = meta({ data: { tag: { name: 'React', slug: 'react' } } } as any)
	const title = tags.find((t) => 'title' in t) as { title: string }
	expect(title.title).toMatch(/React/)
	expect(tags).toContainEqual({ property: 'og:type', content: 'website' })

	const missing = meta({ data: undefined } as any)
	const missingTitle = missing.find((t) => 'title' in t) as { title: string }
	expect(missingTitle.title).toMatch(/not found/i)
})
