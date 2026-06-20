import { type Prisma } from '@prisma/client'
import { prisma } from './db.server.ts'

/** Default page size for the public feed (GROUNDED-SPEC §/blog: ~6/page). */
export const POSTS_PER_PAGE = 6

/**
 * The shape every public feed surface (index, tag archive) reads. The cover,
 * author chip, and tag pills are all the data a `PostCard`/hero lead needs —
 * nothing more, so the public read never leaks Draft-only or private fields.
 */
const feedPostSelect = {
	id: true,
	title: true,
	slug: true,
	excerpt: true,
	publishedAt: true,
	coverImage: { select: { objectKey: true, altText: true } },
	author: {
		select: {
			name: true,
			username: true,
			image: { select: { objectKey: true } },
		},
	},
	tags: { select: { name: true, slug: true }, orderBy: { name: 'asc' } },
} satisfies Prisma.PostSelect

export type FeedPost = Prisma.PostGetPayload<{ select: typeof feedPostSelect }>

export type PostFeed = {
	posts: FeedPost[]
	/** Total Published posts (not just this page) — drives the pager. */
	total: number
	/** The clamped, 1-based page actually returned. */
	page: number
	perPage: number
	/** Total page count, always ≥ 1 so the UI never divides by zero. */
	pageCount: number
}

/**
 * The single source of the **"public never returns a Draft"** invariant
 * (GROUNDED-SPEC §read module; echoes ADR 061's read-shape). Returns one page of
 * Published posts, newest-first by publication instant, with the total + page
 * count needed to render the pager. `page` is clamped to `[1, …]` so a junk
 * `?page=` query still resolves to a real page. Unauthenticated by design.
 */
export async function getPublishedPosts({
	page = 1,
	perPage = POSTS_PER_PAGE,
}: { page?: number; perPage?: number } = {}): Promise<PostFeed> {
	const where = { publishedAt: { not: null } } satisfies Prisma.PostWhereInput
	const currentPage = Math.max(1, Math.floor(page) || 1)

	const [total, posts] = await Promise.all([
		prisma.post.count({ where }),
		prisma.post.findMany({
			where,
			orderBy: { publishedAt: 'desc' },
			skip: (currentPage - 1) * perPage,
			take: perPage,
			select: feedPostSelect,
		}),
	])

	return {
		posts,
		total,
		page: currentPage,
		perPage,
		pageCount: Math.max(1, Math.ceil(total / perPage)),
	}
}
