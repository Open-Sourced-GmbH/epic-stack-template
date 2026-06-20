import { expect, test } from 'vitest'
import { prisma } from '#app/utils/db.server.ts'
import { getPublishedPosts } from './post.server.ts'

/**
 * Create a Post with control over its publication instant. A `publishedAt` of
 * `null` is a Draft; a Date is the publication moment. The slug is salted so
 * repeated calls in one test stay globally unique.
 */
async function makePost({
	title,
	publishedAt,
}: {
	title: string
	publishedAt: Date | null
}) {
	return prisma.post.create({
		select: { id: true },
		data: {
			title,
			slug: `${title.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 8)}`,
			body: 'body',
			publishedAt,
		},
	})
}

// The read module is the single place the "public never returns a Draft"
// invariant lives (GROUNDED-SPEC §read module; echoes ADR 061's read-shape).
test('the public feed excludes Drafts', async () => {
	await makePost({ title: 'Published', publishedAt: new Date('2026-01-01') })
	await makePost({ title: 'Draft', publishedAt: null })

	const { posts, total } = await getPublishedPosts()

	expect(total).toBe(1)
	expect(posts.map((p) => p.title)).toEqual(['Published'])
})

test('posts are ordered newest-first by publication instant', async () => {
	await makePost({ title: 'Older', publishedAt: new Date('2026-01-01') })
	await makePost({ title: 'Newest', publishedAt: new Date('2026-03-01') })
	await makePost({ title: 'Middle', publishedAt: new Date('2026-02-01') })

	const { posts } = await getPublishedPosts()

	expect(posts.map((p) => p.title)).toEqual(['Newest', 'Middle', 'Older'])
})

test('the feed paginates with stable total and pageCount across pages', async () => {
	for (let i = 0; i < 5; i++) {
		await makePost({
			title: `Post ${i}`,
			publishedAt: new Date(2026, 0, i + 1),
		})
	}

	const first = await getPublishedPosts({ page: 1, perPage: 2 })
	expect(first.total).toBe(5)
	expect(first.pageCount).toBe(3)
	expect(first.page).toBe(1)
	expect(first.posts).toHaveLength(2)

	const last = await getPublishedPosts({ page: 3, perPage: 2 })
	expect(last.total).toBe(5)
	expect(last.pageCount).toBe(3)
	expect(last.posts).toHaveLength(1) // the remainder

	// no overlap between pages
	const firstIds = first.posts.map((p) => p.id)
	const lastIds = last.posts.map((p) => p.id)
	expect(firstIds.some((id) => lastIds.includes(id))).toBe(false)
})

test('an out-of-range page is clamped to a valid page number', async () => {
	await makePost({ title: 'Only', publishedAt: new Date('2026-01-01') })

	const { page, posts } = await getPublishedPosts({ page: 0, perPage: 6 })

	expect(page).toBe(1)
	expect(posts).toHaveLength(1)
})
