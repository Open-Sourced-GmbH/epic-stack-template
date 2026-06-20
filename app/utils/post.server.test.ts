import { expect, test } from 'vitest'
import { prisma } from '#app/utils/db.server.ts'
import { createUser } from '#tests/db-utils.ts'
import {
	deriveDescription,
	getAdjacentPosts,
	getPostBySlug,
	getPublishedPosts,
} from './post.server.ts'

/**
 * Create a Post with control over its publication instant. A `publishedAt` of
 * `null` is a Draft; a Date is the publication moment. The slug is salted so
 * repeated calls in one test stay globally unique.
 */
async function makePost({
	title,
	publishedAt,
	slug,
	body,
	excerpt,
	authorId,
}: {
	title: string
	publishedAt: Date | null
	slug?: string
	body?: string
	excerpt?: string
	authorId?: string
}) {
	return prisma.post.create({
		select: { id: true, slug: true },
		data: {
			title,
			slug:
				slug ??
				`${title.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 8)}`,
			body: body ?? 'body',
			excerpt,
			publishedAt,
			authorId,
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

// getPostBySlug owns the same "public never returns a Draft" invariant for the
// single-article read (GROUNDED-SPEC §/blog/$slug): drafts must 404 publicly.
test('getPostBySlug returns a Published post by its slug with body and tags', async () => {
	await prisma.post.create({
		data: {
			title: 'Hello',
			slug: 'hello-world',
			body: '# Heading\n\nReal body text.',
			excerpt: 'A short dek.',
			publishedAt: new Date('2026-01-01'),
			tags: { create: [{ name: 'React', slug: 'react' }] },
		},
		select: { id: true },
	})

	const post = await getPostBySlug('hello-world')

	expect(post?.title).toBe('Hello')
	expect(post?.body).toContain('Real body text.')
	expect(post?.tags.map((t) => t.slug)).toEqual(['react'])
})

test('getPostBySlug returns null for an unknown slug', async () => {
	expect(await getPostBySlug('does-not-exist')).toBeNull()
})

test('getPostBySlug returns null for a Draft slug (draft-safety)', async () => {
	const draft = await makePost({
		title: 'Secret Draft',
		slug: 'secret-draft',
		publishedAt: null,
	})

	expect(draft.slug).toBe('secret-draft')
	expect(await getPostBySlug('secret-draft')).toBeNull()
})

test('getPostBySlug surfaces the author RBAC roles for the byline pill', async () => {
	const author = await prisma.user.create({
		select: { id: true },
		data: {
			...createUser(),
			roles: { create: { name: 'editor', description: '' } },
		},
	})
	await makePost({
		title: 'Bylined',
		slug: 'bylined',
		publishedAt: new Date('2026-01-01'),
		authorId: author.id,
	})

	const post = await getPostBySlug('bylined')

	expect(post?.author?.roles.map((r) => r.name)).toEqual(['editor'])
})

test('getAdjacentPosts returns the neighbouring Published posts, null at the ends', async () => {
	await makePost({ title: 'Older', publishedAt: new Date('2026-01-01') })
	await makePost({ title: 'Middle', publishedAt: new Date('2026-02-01') })
	await makePost({ title: 'Newer', publishedAt: new Date('2026-03-01') })
	// A Draft published "between" must never appear in prev/next.
	await makePost({ title: 'Draft', publishedAt: null })

	const mid = await getAdjacentPosts({ publishedAt: new Date('2026-02-01') })
	expect(mid.newer?.title).toBe('Newer')
	expect(mid.older?.title).toBe('Older')

	const newest = await getAdjacentPosts({ publishedAt: new Date('2026-03-01') })
	expect(newest.newer).toBeNull()
	expect(newest.older?.title).toBe('Middle')
})

test('deriveDescription prefers the excerpt, else the first body paragraph', async () => {
	expect(
		deriveDescription({ excerpt: '  A hand-written dek.  ', body: 'Body.' }),
	).toBe('A hand-written dek.')

	// Empty excerpt → first real paragraph, skipping the heading and fence.
	expect(
		deriveDescription({
			excerpt: '',
			body: '# Title\n\n```ts\ncode\n```\n\nThe lede paragraph.',
		}),
	).toBe('The lede paragraph.')
})
