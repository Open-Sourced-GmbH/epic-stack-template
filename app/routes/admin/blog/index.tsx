import { invariantResponse } from '@epic-web/invariant'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { useEffect } from 'react'
import { data, Link, useFetcher } from 'react-router'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { DropdownMenuItem } from '#app/components/ui/dropdown-menu.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Pagination } from '#app/components/ui/pagination.tsx'
import { useRowSelection } from '#app/components/ui/row-selection.ts'
import { Table, type TableColumn } from '#app/components/ui/table.tsx'
import { UserAvatar } from '#app/components/user-avatar.tsx'
import { type AdminHeader } from '#app/routes/admin/_layout.tsx'
import { cn, getPostImgSrc, useDoubleCheck } from '#app/utils/misc.tsx'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import {
	bulkPostAction,
	getAllPostsForAdmin,
	type AdminPost,
} from '#app/utils/post.server.ts'
import { createToastHeaders } from '#app/utils/toast.server.ts'
import { COVER_GRADIENTS, coverArt, formatDate } from '../../blog/__feed.tsx'
import { type Route } from './+types/index.ts'

/** The header New post button — fed into the admin shell's `PageHeader`. */
function NewPostButton() {
	return (
		<Button asChild>
			<Link to="/admin/blog/new">
				<Icon name="plus">New post</Icon>
			</Link>
		</Button>
	)
}

export const handle: SEOHandle & { adminHeader: AdminHeader } = {
	// Admin surfaces are never indexed.
	getSitemapEntries: () => null,
	// The admin shell owns the lone PageHeader; this surface feeds it the title
	// and the New post action (the eyebrow defaults to "Admin").
	adminHeader: { title: 'Posts', actions: <NewPostButton /> },
}

export const meta: Route.MetaFunction = () => [{ title: 'Posts — Admin' }]

export async function loader({ request }: Route.LoaderArgs) {
	// Admin-only: reading the full list (Drafts included) requires `read:post:any`,
	// the permission only the authoring role holds.
	await requireUserWithPermission(request, 'read:post:any')
	// The read module owns clamping (a junk/NaN `?page=` resolves to page 1), so
	// the loader just forwards the parsed value — matching the public feeds.
	const page = Number(new URL(request.url).searchParams.get('page'))
	return getAllPostsForAdmin({ page })
}

/**
 * The bulk-action write-path for the list's selection bar. The selected post ids
 * ride as repeated `id` fields and the op as `op`. It is the security boundary:
 * `unpublish` re-checks `update:post:any` and `delete` re-checks
 * `delete:post:any` — the same per-row guards the editor uses, so a non-admin is
 * rejected here regardless of what the client rendered. Returns a success toast
 * (no navigation) so the list revalidates in place and the bar can clear.
 */
export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const op = formData.get('op')
	invariantResponse(
		op === 'unpublish' || op === 'delete',
		'Unknown bulk op',
		{ status: 400 },
	)

	// Map the op to the matching `post` permission before touching any data, so an
	// unauthorized request never reaches the mutation.
	await requireUserWithPermission(
		request,
		op === 'delete' ? 'delete:post:any' : 'update:post:any',
	)

	const ids = formData.getAll('id').map(String).filter(Boolean)
	const count = await bulkPostAction(op, ids)

	const noun = count === 1 ? 'post' : 'posts'
	const toast = {
		delete: { title: 'Posts deleted', description: `Deleted ${count} ${noun}.` },
		unpublish: {
			title: 'Posts unpublished',
			description: `Unpublished ${count} ${noun}.`,
		},
	}[op]
	return data(
		{ status: 'success' } as const,
		{ headers: await createToastHeaders({ type: 'success', ...toast }) },
	)
}

/** The row thumb — the cover image when set, else the post's deterministic art. */
function Thumb({ post }: { post: AdminPost }) {
	if (post.coverImage) {
		return (
			<img
				src={getPostImgSrc(post.coverImage.objectKey)}
				alt={post.coverImage.altText ?? ''}
				className="size-11 shrink-0 rounded-md object-cover"
			/>
		)
	}
	return (
		<div
			aria-hidden="true"
			className="flex size-11 shrink-0 items-center justify-center rounded-md"
			style={{ background: COVER_GRADIENTS[coverArt(post.slug)] }}
		>
			<Icon name="file-text" className="size-4 text-white/70" />
		</div>
	)
}

/** A post's trimmed title — the empty string for a whitespace-only draft. */
function titleOf(post: AdminPost) {
	return post.title.trim()
}

/** The "Post" cell — thumb + click-to-edit title link + author / slug line. */
function PostCell({ post }: { post: AdminPost }) {
	const name = post.author?.name ?? post.author?.username ?? 'Unknown'
	const title = titleOf(post)
	return (
		<div className="flex min-w-0 items-center gap-3">
			<Thumb post={post} />
			<div className="flex min-w-0 flex-col gap-1">
				<Link
					to={`/admin/blog/${post.id}/edit`}
					className={cn(
						'focus-cosy truncate rounded-sm',
						title ? 'font-medium' : 'text-muted-foreground italic',
					)}
				>
					{title || 'Untitled draft'}
				</Link>
				<span className="text-muted-foreground text-body-xs flex items-center gap-1.5">
					<UserAvatar
						name={name}
						imageObjectKey={post.author?.image?.objectKey}
						className="size-5"
						fallbackClassName="bg-accent text-accent-foreground text-[0.6rem]"
					/>
					{name}
					<span className="text-muted-foreground/80 font-mono">
						/{post.slug}
					</span>
				</span>
			</div>
		</div>
	)
}

/** Tonal status pill — brand wash for live posts, a quiet outline for Drafts. */
function StatusBadge({ post }: { post: AdminPost }) {
	const live = Boolean(post.publishedAt)
	return (
		<Badge variant={live ? 'brand' : 'outline'} dot>
			{live ? 'Published' : 'Draft'}
		</Badge>
	)
}

const columns: Array<TableColumn<AdminPost>> = [
	{ key: 'post', header: 'Post', cell: (post) => <PostCell post={post} /> },
	{
		key: 'status',
		header: 'Status',
		cell: (post) => <StatusBadge post={post} />,
	},
	{
		key: 'updated',
		header: 'Updated',
		headerClassName: 'text-right',
		className:
			'text-muted-foreground text-body-sm text-right whitespace-nowrap',
		cell: (post) => {
			const updated = new Date(post.updatedAt)
			return <time dateTime={updated.toISOString()}>{formatDate(updated)}</time>
		},
	},
]

/** `grid-template-columns` for the data cells: Post flexes, the rest hug. */
const columnTemplate = 'minmax(0,1fr) max-content max-content'

/** Per-row overflow menu — Edit, plus View live for a published post. */
function rowActions(post: AdminPost) {
	return (
		<>
			<DropdownMenuItem asChild>
				<Link to={`/admin/blog/${post.id}/edit`}>
					<Icon name="pencil-1" className="mr-2 size-4" />
					Edit
				</Link>
			</DropdownMenuItem>
			{post.publishedAt ? (
				<DropdownMenuItem asChild>
					<Link to={`/blog/${post.slug}`}>
						<Icon name="link-2" className="mr-2 size-4" />
						View live
					</Link>
				</DropdownMenuItem>
			) : null}
		</>
	)
}

/** The slice of {@link useRowSelection} the bulk-action bar drives. */
type BarSelection = Pick<
	ReturnType<typeof useRowSelection>,
	'count' | 'selected' | 'clear'
>

/**
 * The selection toolbar shown above the Table once a row is checked: the count
 * plus bulk Unpublish / Delete. It submits the selected ids + op to this route's
 * `action` via a fetcher (no navigation), then clears the selection on success.
 * Delete is destructive, so it uses the double-check confirm pattern.
 */
function BulkActionBar({ selection }: { selection: BarSelection }) {
	const fetcher = useFetcher<typeof action>()
	const deleteCheck = useDoubleCheck()
	const { count, selected, clear } = selection
	const ids = [...selected]
	const busy = fetcher.state !== 'idle'

	// Drop the selection once a bulk op lands, so the bar collapses and the
	// freshly revalidated list shows through.
	useEffect(() => {
		if (fetcher.state === 'idle' && fetcher.data?.status === 'success') {
			clear()
		}
	}, [fetcher.state, fetcher.data, clear])

	if (count === 0) return null

	return (
		<div className="bg-card border-border mb-4 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3">
			<span className="text-body-sm font-medium" aria-live="polite">
				{count} selected
			</span>
			<fetcher.Form method="post" className="ml-auto flex items-center gap-2">
				{ids.map((id) => (
					<input key={id} type="hidden" name="id" value={id} />
				))}
				<Button
					type="submit"
					name="op"
					value="unpublish"
					variant="outline"
					size="sm"
					disabled={busy}
				>
					Unpublish
				</Button>
				<Button
					variant="destructive"
					size="sm"
					disabled={busy}
					{...deleteCheck.getButtonProps({
						type: 'submit',
						name: 'op',
						value: 'delete',
					})}
				>
					{deleteCheck.doubleCheck ? 'Confirm delete' : 'Delete'}
				</Button>
			</fetcher.Form>
		</div>
	)
}

export function HydrateFallback() {
	return (
		<main className="container max-w-(--shell-max) py-8">
			<Table
				aria-label="Posts"
				columns={columns}
				data={[]}
				getRowId={(post) => post.id}
				columnTemplate={columnTemplate}
				rowActions={rowActions}
				loading
				loadingRows={6}
			/>
		</main>
	)
}

/**
 * The admin post list (`/admin/blog`): every post (Drafts + Published) in one
 * managed `Table` inside the admin shell (the shell owns the PageHeader, fed via
 * `handle.adminHeader`). Reuses `getAllPostsForAdmin` (the one Draft-returning
 * read) and is admin-only at the loader. Rows are click-to-edit via the title
 * link; the Table's per-row kebab carries Edit / View live. A `Pagination`
 * footer walks the pages once there is more than one.
 */
export default function AdminBlogIndex({ loaderData }: Route.ComponentProps) {
	const { posts, total, publishedCount, page, pageCount } = loaderData
	// Selection lives here (not in the Table) so the bulk-action bar can read it
	// too; it's keyed on the current page's ids and prunes itself across pages.
	const selection = useRowSelection(posts.map((post) => post.id))

	return (
		<main className="container max-w-(--shell-max) py-8">
			<p className="text-muted-foreground text-body-sm mb-4">
				{total} total · {publishedCount} published
			</p>

			<BulkActionBar selection={selection} />

			<Table
				aria-label="Posts"
				columns={columns}
				data={posts}
				getRowId={(post) => post.id}
				columnTemplate={columnTemplate}
				selection={selection}
				getRowLabel={(post) => titleOf(post) || 'untitled draft'}
				rowActions={rowActions}
				getRowActionsLabel={(post) =>
					`Actions for ${titleOf(post) || 'untitled draft'}`
				}
				emptyState={{
					icon: <Icon name="pencil-2" className="size-6" />,
					title: 'No posts yet',
					description:
						'Drafts and published posts will show up here. Start writing to fill this list.',
					action: <NewPostButton />,
				}}
				footer={
					pageCount > 1 ? (
						<Pagination
							page={page}
							pageCount={pageCount}
							getPageHref={(p) => `/admin/blog?page=${p}`}
						/>
					) : undefined
				}
			/>
		</main>
	)
}
