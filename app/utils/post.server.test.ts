import { expect, test } from 'vitest'
import { prisma } from '#app/utils/db.server.ts'
import { createUser } from '#tests/db-utils.ts'
import {
	deriveDescription,
	getAdjacentPosts,
	getAllPostsForAdmin,
	getPostBySlug,
	getPostsByTag,
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
	tags = [],
}: {
	title: string
	publishedAt: Date | null
	slug?: string
	body?: string
	excerpt?: string
	authorId?: string
	tags?: Array<{ name: string; slug: string }>
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
			tags: {
				connectOrCreate: tags.map((t) => ({
					where: { slug: t.slug },
					create: t,
				})),
			},
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

// getPostsByTag is the tag-archive half of the "public never returns a Draft"
// invariant (GROUNDED-SPEC §/blog/tags/$tagSlug): only Published posts carrying
// the requested tag, never a Draft and never another tag's posts.
test('getPostsByTag returns only Published posts carrying that tag', async () => {
	const react = { name: 'React', slug: 'react' }
	const css = { name: 'CSS', slug: 'css' }
	await makePost({
		title: 'Published React',
		publishedAt: new Date('2026-01-01'),
		tags: [react],
	})
	await makePost({ title: 'Draft React', publishedAt: null, tags: [react] })
	await makePost({
		title: 'Published CSS',
		publishedAt: new Date('2026-01-02'),
		tags: [css],
	})

	const feed = await getPostsByTag('react')

	expect(feed?.tag).toEqual(react)
	expect(feed?.total).toBe(1)
	expect(feed?.posts.map((p) => p.title)).toEqual(['Published React'])
})

test('getPostsByTag returns null for an unknown tag slug', async () => {
	expect(await getPostsByTag('does-not-exist')).toBeNull()
})

test('getPostsByTag returns an empty feed for a known tag with no Published posts', async () => {
	const draftOnly = { name: 'Draft Only', slug: 'draft-only' }
	await makePost({ title: 'A Draft', publishedAt: null, tags: [draftOnly] })

	const feed = await getPostsByTag('draft-only')

	// Known tag → a real feed (not null), but with zero published posts so the
	// route renders the empty state rather than a 404.
	expect(feed).not.toBeNull()
	expect(feed?.tag).toEqual(draftOnly)
	expect(feed?.total).toBe(0)
	expect(feed?.posts).toEqual([])
})

test('getPostsByTag paginates within a tag with a stable total and pageCount', async () => {
	const ts = { name: 'TypeScript', slug: 'typescript' }
	for (let i = 0; i < 5; i++) {
		await makePost({
			title: `TS ${i}`,
			publishedAt: new Date(2026, 0, i + 1),
			tags: [ts],
		})
	}

	const first = await getPostsByTag('typescript', { page: 1, perPage: 2 })
	expect(first?.total).toBe(5)
	expect(first?.pageCount).toBe(3)
	expect(first?.posts).toHaveLength(2)
	// newest-first within the tag
	expect(first?.posts[0]?.title).toBe('TS 4')

	const last = await getPostsByTag('typescript', { page: 3, perPage: 2 })
	expect(last?.posts).toHaveLength(1)
	const firstIds = first?.posts.map((p) => p.id) ?? []
	const lastIds = last?.posts.map((p) => p.id) ?? []
	expect(firstIds.some((id) => lastIds.includes(id))).toBe(false)
})

// The admin list is the *inverse* of the public feed: it must surface Drafts as
// well as Published posts so an author can manage everything in one place
// (GROUNDED-SPEC §/admin/blog), with the "N total · M published" header counts.
test('getAllPostsForAdmin returns Drafts as well as Published, with counts', async () => {
	await makePost({ title: 'Published', publishedAt: new Date('2026-01-01') })
	await makePost({ title: 'Draft', publishedAt: null })

	const { posts, total, publishedCount } = await getAllPostsForAdmin()

	expect(total).toBe(2)
	expect(publishedCount).toBe(1)
	expect(posts.map((p) => p.title).sort()).toEqual(['Draft', 'Published'])
})

test('getAllPostsForAdmin floats the most recently edited post to the top', async () => {
	const first = await makePost({ title: 'First', publishedAt: null })
	await makePost({ title: 'Second', publishedAt: null })

	// Editing the older post must re-sort it above the newer one.
	await prisma.post.update({
		where: { id: first.id },
		data: { title: 'First (edited)' },
	})

	const { posts } = await getAllPostsForAdmin()
	expect(posts[0]?.title).toBe('First (edited)')
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
