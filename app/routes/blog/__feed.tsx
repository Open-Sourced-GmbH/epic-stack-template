import { Link } from 'react-router'
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '#app/components/ui/avatar.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Card, CardContent } from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Skeleton } from '#app/components/ui/skeleton.tsx'
import { cn, getPostImgSrc, getUserImgSrc } from '#app/utils/misc.tsx'
import { type FeedPost } from '#app/utils/post.server.ts'

/**
 * Blog feed compositions — the `PostCard`, hero lead, author chip, cover-art
 * system, empty state, and loading skeleton that the `/blog` index (and later
 * the tag archive) render. These are *feature* compositions built from the
 * `ui/*` primitives (GROUNDED-SPEC §Net-new), so they live with the route, not
 * in the design system.
 */

/** Decorative cover gradients used when a post has no uploaded cover image. */
export const COVER_GRADIENTS = {
	pine: 'radial-gradient(120% 120% at 15% 10%, oklch(0.7 0.13 172) 0%, oklch(0.45 0.11 195) 55%, oklch(0.28 0.06 220) 100%)',
	slate: 'radial-gradient(120% 120% at 85% 0%, oklch(0.5 0.05 255) 0%, oklch(0.32 0.04 262) 55%, oklch(0.2 0.03 264) 100%)',
	amber: 'radial-gradient(120% 120% at 20% 90%, oklch(0.78 0.13 70) 0%, oklch(0.55 0.13 45) 55%, oklch(0.34 0.08 30) 100%)',
} as const
const COVER_KEYS = Object.keys(COVER_GRADIENTS) as Array<
	keyof typeof COVER_GRADIENTS
>

/** Stable per-post art pick so a coverless post always shows the same gradient. */
export function coverArt(seed: string): keyof typeof COVER_GRADIENTS {
	let hash = 0
	for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
	return COVER_KEYS[hash % COVER_KEYS.length]!
}

export function initials(name: string): string {
	return (
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((word) => word[0]?.toUpperCase() ?? '')
			.join('') || '?'
	)
}

export function formatDate(value: Date | string): string {
	return new Date(value).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	})
}

/** The post's cover — an uploaded image, else a deterministic gradient panel. */
function Cover({ post, className }: { post: FeedPost; className?: string }) {
	if (post.coverImage) {
		return (
			<img
				src={getPostImgSrc(post.coverImage.objectKey)}
				alt={post.coverImage.altText ?? ''}
				className={cn('h-full w-full object-cover', className)}
			/>
		)
	}
	return (
		<div
			aria-hidden="true"
			className={cn('flex items-center justify-center', className)}
			style={{ background: COVER_GRADIENTS[coverArt(post.slug)] }}
		>
			<Icon name="file-text" className="size-9 text-white/70" />
		</div>
	)
}

/** Tag pills that link into the tag archive; layered above the card link. */
export function TagPills({ tags }: { tags: FeedPost['tags'] }) {
	if (tags.length === 0) return null
	return (
		<div className="relative z-10 flex flex-wrap gap-1.5">
			{tags.slice(0, 3).map((tag) => (
				<Link
					key={tag.slug}
					to={`/blog/tags/${tag.slug}`}
					className="focus-cosy rounded-full"
				>
					<Badge variant="secondary">{tag.name}</Badge>
				</Link>
			))}
		</div>
	)
}

/** Author credit chip — avatar + name + publication date. */
function AuthorChip({ post, className }: { post: FeedPost; className?: string }) {
	const name = post.author?.name ?? post.author?.username ?? 'Open Sourced'
	return (
		<div className={cn('flex items-center gap-2', className)}>
			<Avatar className="size-7">
				{post.author?.image ? (
					<AvatarImage
						src={getUserImgSrc(post.author.image.objectKey)}
						alt=""
					/>
				) : null}
				<AvatarFallback className="text-body-2xs">
					{initials(name)}
				</AvatarFallback>
			</Avatar>
			<span className="text-muted-foreground text-body-xs">
				{name}
				{post.publishedAt ? (
					<>
						{' · '}
						<time dateTime={new Date(post.publishedAt).toISOString()}>
							{formatDate(post.publishedAt)}
						</time>
					</>
				) : null}
			</span>
		</div>
	)
}

/** A grid card for one post — cover, tags, title, 2-line excerpt, author. */
export function PostCard({ post }: { post: FeedPost }) {
	return (
		<Card className="relative gap-0 overflow-hidden py-0 transition hover:shadow-md">
			<Cover post={post} className="aspect-[16/9]" />
			<CardContent className="flex flex-1 flex-col gap-2 p-5">
				<TagPills tags={post.tags} />
				<h3 className="text-h6 leading-snug">
					<Link
						to={`/blog/${post.slug}`}
						className="focus-cosy rounded-sm after:absolute after:inset-0"
					>
						{post.title}
					</Link>
				</h3>
				{post.excerpt ? (
					<p className="text-muted-foreground text-body-sm line-clamp-2">
						{post.excerpt}
					</p>
				) : null}
				<AuthorChip post={post} className="mt-auto pt-2" />
			</CardContent>
		</Card>
	)
}

/** The featured first post — a wide, two-column hero card (page 1 only). */
export function HeroLead({ post }: { post: FeedPost }) {
	return (
		<Card className="relative grid gap-0 overflow-hidden py-0 md:grid-cols-[1.02fr_1.3fr]">
			<Cover post={post} className="min-h-56 md:h-full" />
			<div className="flex flex-col justify-center gap-3 p-7">
				<div className="flex flex-wrap items-center gap-3">
					<span className="text-brand text-body-2xs font-semibold tracking-wide uppercase">
						Featured
					</span>
					<TagPills tags={post.tags.slice(0, 2)} />
				</div>
				<h2 className="text-h4 leading-tight">
					<Link
						to={`/blog/${post.slug}`}
						className="focus-cosy rounded-sm after:absolute after:inset-0"
					>
						{post.title}
					</Link>
				</h2>
				{post.excerpt ? (
					<p className="text-muted-foreground text-pretty">{post.excerpt}</p>
				) : null}
				<AuthorChip post={post} className="pt-1" />
			</div>
		</Card>
	)
}

/** Centered empty state shown when no posts are published yet. */
export function EmptyFeed() {
	return (
		<div className="flex flex-col items-center gap-4 py-20 text-center">
			<div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-2xl">
				<Icon name="file-text" className="size-6" />
			</div>
			<div className="space-y-1">
				<h2 className="text-h5">No posts published yet</h2>
				<p className="text-muted-foreground max-w-md text-pretty">
					When a post is published it will appear here, newest first. Drafts
					live in the editor until they’re ready.
				</p>
			</div>
			<Button asChild variant="outline">
				<Link to="/admin/blog/new">Write the first post</Link>
			</Button>
		</div>
	)
}

/** Loading placeholder — a hero skeleton above a grid of card skeletons. */
// Default mirrors the public page size (POSTS_PER_PAGE); kept a literal so this
// client-bundled module never imports the server-only read module's runtime.
export function FeedSkeleton({ cards = 6 }: { cards?: number }) {
	return (
		<div data-slot="feed-skeleton" className="flex flex-col gap-8">
			<Skeleton className="h-64 w-full rounded-lg" />
			<div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(20rem,1fr))]">
				{Array.from({ length: cards }, (_, i) => (
					<div key={i} className="flex flex-col gap-3">
						<Skeleton className="aspect-[16/9] w-full rounded-lg" />
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-4 w-1/2" />
					</div>
				))}
			</div>
		</div>
	)
}
