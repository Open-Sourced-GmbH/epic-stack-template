import { invariantResponse } from '@epic-web/invariant'
import { Link } from 'react-router'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Pagination } from '#app/components/ui/pagination.tsx'
import { getPostsByTag } from '#app/utils/post.server.ts'
import { type Route } from './+types/tags.$tagSlug.ts'
import { PostCard } from './__feed.tsx'

export async function loader({ params, request }: Route.LoaderArgs) {
	// The read module owns clamping (a junk/NaN `?page=` resolves to page 1), so
	// the loader just forwards the parsed value.
	const page = Number(new URL(request.url).searchParams.get('page'))
	const feed = await getPostsByTag(params.tagSlug, { page })
	// `null` means no tag owns this slug — an unknown tag 404s, just like an
	// unknown post slug. A *known* tag with no published posts is a real feed
	// (`total: 0`) and renders the empty state below, not a 404.
	invariantResponse(feed, 'Tag not found', { status: 404 })
	return feed
}

export const meta: Route.MetaFunction = ({ data }) => {
	if (!data?.tag) return [{ title: 'Tag not found — Open Sourced' }]
	const title = `Posts tagged “${data.tag.name}” — Open Sourced`
	const description = `Every published post tagged ${data.tag.name} on the Open Sourced journal.`
	return [
		{ title },
		{ name: 'description', content: description },
		{ property: 'og:title', content: title },
		{ property: 'og:description', content: description },
		{ property: 'og:type', content: 'website' },
	]
}

/** The href for a page within this tag — page 1 drops the `?page=1` query. */
function tagPageHref(slug: string, page: number) {
	const base = `/blog/tags/${slug}`
	return page > 1 ? `${base}?page=${page}` : base
}

/** Known tag, nothing published — point back at the full journal. */
function TagEmpty() {
	return (
		<div className="flex flex-col items-center gap-4 py-20 text-center">
			<div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-xl">
				<Icon name="file-text" className="size-6" />
			</div>
			<div className="space-y-1">
				<h2 className="text-h5">Nothing published under this tag yet</h2>
				<p className="text-muted-foreground max-w-md text-pretty">
					This tag exists, but none of its posts are live yet. Browse the rest
					of the journal in the meantime.
				</p>
			</div>
			<Button asChild variant="outline">
				<Link to="/blog">Browse all posts</Link>
			</Button>
		</div>
	)
}

/**
 * The tag archive: every **Published** post carrying one tag, reusing the
 * index's card grid and pager (no net-new surface). The read module
 * (`getPostsByTag`) owns the draft-safety invariant; the header shows the tag
 * label and an accurate post count, and a known tag with no live posts renders
 * an empty state rather than a 404 (that's reserved for an unknown tag).
 */
export default function TagArchive({ loaderData }: Route.ComponentProps) {
	const { tag, posts, total, page, pageCount } = loaderData

	return (
		<main className="container py-16 md:py-24">
			<header className="mb-10 max-w-2xl">
				<Button
					asChild
					variant="link"
					className="text-muted-foreground mb-4 -ml-3"
				>
					<Link to="/blog">
						<Icon name="arrow-left">Back to blog</Icon>
					</Link>
				</Button>
				<p className="text-brand text-body-xs font-semibold tracking-wide uppercase">
					Tag
				</p>
				<h1 className="text-h2 mt-3 tracking-tight text-balance">{tag.name}</h1>
				<p className="text-muted-foreground mt-4">
					{total === 1 ? '1 post' : `${total} posts`}
				</p>
			</header>

			{posts.length === 0 ? (
				<TagEmpty />
			) : (
				<>
					<div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(20rem,1fr))]">
						{posts.map((post) => (
							<PostCard key={post.id} post={post} />
						))}
					</div>
					<Pagination
						className="mt-12"
						page={page}
						pageCount={pageCount}
						getPageHref={(p) => tagPageHref(tag.slug, p)}
					/>
				</>
			)}
		</main>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: () => (
					<main className="container flex flex-col items-center gap-6 py-24 text-center">
						<p className="text-brand leading-none font-bold [font-size:clamp(4rem,12vw,8rem)]">
							404
						</p>
						<div className="space-y-1">
							<h1 className="text-h4">Tag not found</h1>
							<p className="text-muted-foreground max-w-md text-pretty">
								This tag doesn’t exist — it may have been renamed or removed.
							</p>
						</div>
						<Button asChild variant="outline">
							<Link to="/blog">Browse all posts</Link>
						</Button>
					</main>
				),
			}}
		/>
	)
}
