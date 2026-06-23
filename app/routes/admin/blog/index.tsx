import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { Link } from 'react-router'
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '#app/components/ui/avatar.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button, buttonVariants } from '#app/components/ui/button.tsx'
import { Card } from '#app/components/ui/card.tsx'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Skeleton } from '#app/components/ui/skeleton.tsx'
import { cn, getPostImgSrc, getUserImgSrc } from '#app/utils/misc.tsx'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { getAllPostsForAdmin, type AdminPost } from '#app/utils/post.server.ts'
import {
	COVER_GRADIENTS,
	coverArt,
	formatDate,
	initials,
} from '../../blog/__feed.tsx'
import { type Route } from './+types/index.ts'

export const handle: SEOHandle = {
	// Admin surfaces are never indexed.
	getSitemapEntries: () => null,
}

export const meta: Route.MetaFunction = () => [{ title: 'Posts — Admin' }]

export async function loader({ request }: Route.LoaderArgs) {
	// Admin-only: reading the full list (Drafts included) requires `read:post:any`,
	// the permission only the authoring role holds.
	await requireUserWithPermission(request, 'read:post:any')
	return getAllPostsForAdmin()
}

/** The row thumb — the cover image when set, else the post's deterministic art. */
function Thumb({ post }: { post: AdminPost }) {
	if (post.coverImage) {
		return (
			<img
				src={getPostImgSrc(post.coverImage.objectKey)}
				alt={post.coverImage.altText ?? ''}
				className="size-11 rounded-md object-cover"
			/>
		)
	}
	return (
		<div
			aria-hidden="true"
			className="flex size-11 items-center justify-center rounded-md"
			style={{ background: COVER_GRADIENTS[coverArt(post.slug)] }}
		>
			<Icon name="file-text" className="size-4 text-white/70" />
		</div>
	)
}

/** Title cell — the post title (or an untitled placeholder) + an author line. */
function TitleCell({ post }: { post: AdminPost }) {
	const name = post.author?.name ?? post.author?.username ?? 'Unknown'
	const title = post.title.trim()
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<Link
				to={`/admin/blog/${post.id}/edit`}
				className={cn(
					'focus-cosy truncate rounded-sm after:absolute after:inset-0',
					title ? 'font-medium' : 'text-muted-foreground italic',
				)}
			>
				{title || 'Untitled draft'}
			</Link>
			<span className="text-muted-foreground flex items-center gap-1.5 text-body-xs">
				<Avatar className="size-5">
					{post.author?.image ? (
						<AvatarImage
							src={getUserImgSrc(post.author.image.objectKey)}
							alt=""
						/>
					) : null}
					<AvatarFallback className="bg-accent text-accent-foreground text-[0.6rem]">
						{initials(name)}
					</AvatarFallback>
				</Avatar>
				{name}
				<span className="text-muted-foreground/80 font-mono">/{post.slug}</span>
			</span>
		</div>
	)
}

/** Per-row overflow actions — a native kebab trigger (Button is not forwardRef). */
function RowActions({ post }: { post: AdminPost }) {
	const isPublished = Boolean(post.publishedAt)
	return (
		// `relative z-10` lifts the cell above the title link's row overlay so its
		// controls click through to themselves, not the edit link; the explicit
		// stopPropagation keeps that contract obvious.
		<div
			className="relative z-10 flex items-center justify-end gap-1"
			onClick={(event) => event.stopPropagation()}
		>
			<Button asChild variant="ghost" size="sm">
				<Link to={`/admin/blog/${post.id}/edit`}>Edit</Link>
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger
					aria-label={`Actions for ${post.title.trim() || 'untitled draft'}`}
					className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
				>
					<Icon name="dots-horizontal" className="size-4" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem asChild>
						<Link to={`/admin/blog/${post.id}/edit`}>
							<Icon name="pencil-1" className="mr-2 size-4" />
							Edit
						</Link>
					</DropdownMenuItem>
					{isPublished ? (
						<DropdownMenuItem asChild>
							<Link to={`/blog/${post.slug}`}>
								<Icon name="link-2" className="mr-2 size-4" />
								View live
							</Link>
						</DropdownMenuItem>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}

function PostRow({ post }: { post: AdminPost }) {
	const updated = new Date(post.updatedAt)
	return (
		<tr className="hover:bg-accent/60 relative border-t transition-colors">
			<td className="w-px py-3 pr-3 pl-4">
				<Thumb post={post} />
			</td>
			<td className="py-3 pr-3">
				<TitleCell post={post} />
			</td>
			<td className="px-3 py-3">
				{post.publishedAt ? (
					<Badge>Published</Badge>
				) : (
					<Badge variant="outline">Draft</Badge>
				)}
			</td>
			<td className="text-muted-foreground px-3 py-3 text-body-sm whitespace-nowrap">
				<time dateTime={updated.toISOString()}>{formatDate(updated)}</time>
			</td>
			<td className="py-3 pr-4 pl-3">
				<RowActions post={post} />
			</td>
		</tr>
	)
}

/** Centred empty state shown when no posts exist yet. */
function EmptyPosts() {
	return (
		<div className="flex flex-col items-center gap-4 py-20 text-center">
			<div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-2xl">
				<Icon name="pencil-2" className="size-6" />
			</div>
			<div className="space-y-1">
				<h2 className="text-h5">No posts yet</h2>
				<p className="text-muted-foreground max-w-md text-pretty">
					Drafts and published posts will show up here. Start writing to fill
					this list.
				</p>
			</div>
			<Button asChild>
				<Link to="/admin/blog/new">
					<Icon name="plus">New post</Icon>
				</Link>
			</Button>
		</div>
	)
}

function PostTable({ posts }: { posts: AdminPost[] }) {
	return (
		<Card className="overflow-hidden py-0">
			<table className="w-full text-left">
				<thead className="sr-only">
					<tr>
						<th scope="col">Thumbnail</th>
						<th scope="col">Title</th>
						<th scope="col">Status</th>
						<th scope="col">Updated</th>
						<th scope="col">Actions</th>
					</tr>
				</thead>
				<tbody>
					{posts.map((post) => (
						<PostRow key={post.id} post={post} />
					))}
				</tbody>
			</table>
		</Card>
	)
}

/** Loading placeholder — a card of skeleton rows mirroring the real table. */
function PostListSkeleton() {
	return (
		<Card data-slot="post-list-skeleton" className="overflow-hidden py-0">
			<div className="divide-border divide-y">
				{Array.from({ length: 6 }, (_, i) => (
					<div key={i} className="flex items-center gap-3 px-4 py-3">
						<Skeleton className="size-11 rounded-md" />
						<div className="flex flex-1 flex-col gap-2">
							<Skeleton className="h-4 w-1/3" />
							<Skeleton className="h-3 w-1/4" />
						</div>
						<Skeleton className="h-5 w-16 rounded-full" />
					</div>
				))}
			</div>
		</Card>
	)
}

export function HydrateFallback() {
	return (
		<main className="container max-w-(--shell-max) py-10">
			<PostListSkeleton />
		</main>
	)
}

/**
 * The admin post list (`/admin/blog`): every post (Drafts + Published) in one
 * managed table. Reuses `getAllPostsForAdmin` (the one Draft-returning read) and
 * is admin-only at the loader. Rows are click-to-edit via a title-link overlay;
 * the actions cell sits above it so its controls stay independently operable.
 * Publish/unpublish + delete kebab actions land with the publish lifecycle
 * (EPT-49); this slice ships the list, navigation kebab, and states.
 */
export default function AdminBlogIndex({ loaderData }: Route.ComponentProps) {
	const { posts, total, publishedCount } = loaderData

	return (
		<>
			{/* Admin bar — a faint brand strip marking the authoring surface. Uses
			    the shared `--brand-soft` wash rather than a one-off color-mix. */}
			<div className="bg-brand-soft border-b">
				<div className="container max-w-(--shell-max) py-2">
					<span className="text-brand text-body-xs font-semibold tracking-wide uppercase">
						Admin · Blog
					</span>
				</div>
			</div>

			<main className="container max-w-(--shell-max) py-10">
				<header className="mb-8 flex flex-wrap items-end justify-between gap-4">
					<div>
						<h1 className="text-h3 tracking-tight">Posts</h1>
						<p className="text-muted-foreground mt-1 text-body-sm">
							{total} total · {publishedCount} published
						</p>
					</div>
					<Button asChild>
						<Link to="/admin/blog/new">
							<Icon name="plus">New post</Icon>
						</Link>
					</Button>
				</header>

				{posts.length === 0 ? (
					<EmptyPosts />
				) : (
					<PostTable posts={posts} />
				)}
			</main>
		</>
	)
}
