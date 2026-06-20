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

/**
 * The shape the single-article surface (`/blog/$slug`) reads: everything the
 * feed card needs plus the full Markdown `body` and the author's RBAC role (for
 * the byline role pill). `author` is nullable — a deleted author (`SetNull`)
 * leaves the post standing with no credit, which the byline renders as
 * "Unknown" rather than crashing.
 */
const articlePostSelect = {
	id: true,
	title: true,
	slug: true,
	excerpt: true,
	body: true,
	publishedAt: true,
	coverImage: { select: { objectKey: true, altText: true } },
	author: {
		select: {
			name: true,
			username: true,
			image: { select: { objectKey: true } },
			roles: { select: { name: true }, orderBy: { name: 'asc' } },
		},
	},
	tags: { select: { name: true, slug: true }, orderBy: { name: 'asc' } },
} satisfies Prisma.PostSelect

export type ArticlePost = Prisma.PostGetPayload<{
	select: typeof articlePostSelect
}>

/**
 * Read one **Published** post by slug, or `null` when the slug is unknown **or**
 * names a Draft. This is the article-page half of the "public never returns a
 * Draft" invariant (GROUNDED-SPEC §/blog/$slug): a Draft row exists but must be
 * indistinguishable from a missing one to the public, so the route 404s on both.
 */
export async function getPostBySlug(slug: string): Promise<ArticlePost | null> {
	return prisma.post.findFirst({
		where: { slug, publishedAt: { not: null } },
		select: articlePostSelect,
	})
}

/** A prev/next navigation card — just enough to render the adjacent post link. */
const navPostSelect = {
	title: true,
	slug: true,
} satisfies Prisma.PostSelect

export type NavPost = Prisma.PostGetPayload<{ select: typeof navPostSelect }>

/**
 * The Published posts immediately adjacent to `post` in the feed's newest-first
 * order: `newer` was published just after it, `older` just before. Either is
 * `null` at the ends of the timeline. Drafts never appear, so prev/next walks
 * the same public timeline as the index.
 */
export async function getAdjacentPosts(post: {
	publishedAt: Date | null
}): Promise<{ newer: NavPost | null; older: NavPost | null }> {
	const at = post.publishedAt
	if (!at) return { newer: null, older: null }

	const [newer, older] = await Promise.all([
		prisma.post.findFirst({
			where: { publishedAt: { gt: at } },
			orderBy: { publishedAt: 'asc' },
			select: navPostSelect,
		}),
		prisma.post.findFirst({
			where: { publishedAt: { lt: at } },
			orderBy: { publishedAt: 'desc' },
			select: navPostSelect,
		}),
	])

	return { newer, older }
}

/**
 * The per-post meta description: a trimmed excerpt when the author wrote one,
 * else the post's first body paragraph (GROUNDED-SPEC §/blog/$slug SEO). Pure
 * so the loader can pass the result straight to `meta`. Headings, fenced code,
 * and blank lines are skipped so the fallback reads like a real sentence; the
 * result is collapsed to one line and clamped to a meta-friendly length.
 */
export function deriveDescription({
	excerpt,
	body,
}: {
	excerpt?: string | null
	body: string
}): string {
	const trimmedExcerpt = excerpt?.trim()
	if (trimmedExcerpt) return trimmedExcerpt

	const paragraph =
		body
			.split(/\n\s*\n/)
			.map((block) => block.trim())
			.find((block) => block && !block.startsWith('#') && !block.startsWith('```')) ?? ''
	const oneLine = paragraph.replace(/\s+/g, ' ')
	return oneLine.length > 200 ? `${oneLine.slice(0, 197).trimEnd()}…` : oneLine
}
