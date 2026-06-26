import { Pagination } from '#app/components/ui/pagination.tsx'
import { getPublishedPosts } from '#app/utils/post.server.ts'
import { type Route } from './+types/index.ts'
import { EmptyFeed, FeedSkeleton, HeroLead, PostCard } from './__feed.tsx'

const TITLE = 'Blog — Open Sourced'
const DESCRIPTION =
	'Notes on product engineering, design systems, and shipping production web apps.'

export const meta: Route.MetaFunction = () => [
	{ title: TITLE },
	{ name: 'description', content: DESCRIPTION },
	{ property: 'og:title', content: TITLE },
	{ property: 'og:description', content: DESCRIPTION },
	{ property: 'og:type', content: 'website' },
]

export async function loader({ request }: Route.LoaderArgs) {
	// The read module owns clamping (a junk/NaN `?page=` resolves to page 1), so
	// the loader just forwards the parsed value.
	const page = Number(new URL(request.url).searchParams.get('page'))
	return getPublishedPosts({ page })
}

/** Shown during client-side hydration before the feed data resolves. */
export function HydrateFallback() {
	return (
		<main className="container py-16 md:py-24">
			<FeedSkeleton />
		</main>
	)
}

/** The href for a given page — page 1 is the bare `/blog` (no `?page=1`). */
function pageHref(page: number) {
	return page > 1 ? `/blog?page=${page}` : '/blog'
}

/**
 * Public blog index. The feed comes from the Post read module
 * (`getPublishedPosts`), which owns the "public never returns a Draft"
 * invariant. Page 1 promotes the newest post into a hero lead above the card
 * grid; page 2+ is grid-only. Pagination is link-based so deep pages stay
 * crawlable and shareable.
 */
export default function BlogIndex({ loaderData }: Route.ComponentProps) {
	const { posts, page, pageCount } = loaderData
	const isFirstPage = page === 1
	const lead = isFirstPage ? posts[0] : undefined
	const gridPosts = isFirstPage ? posts.slice(1) : posts

	return (
		<main className="container py-16 md:py-24">
			<header className="mb-10 max-w-2xl">
				<p className="text-brand text-body-xs font-semibold tracking-wide uppercase">
					The Open Sourced journal
				</p>
				<h1 className="text-h2 mt-3 tracking-tight text-balance">
					Notes on building the boring, durable web
				</h1>
				<p className="text-muted-foreground mt-4 text-pretty">
					Field notes on SSR, type-safety, accessibility, and the design system
					that keeps it all on-brand.
				</p>
			</header>

			{posts.length === 0 ? (
				<EmptyFeed />
			) : (
				<>
					{lead ? (
						<div className="mb-8">
							<HeroLead post={lead} />
						</div>
					) : null}
					{gridPosts.length > 0 ? (
						<div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(20rem,1fr))]">
							{gridPosts.map((post) => (
								<PostCard key={post.id} post={post} />
							))}
						</div>
					) : null}
					<Pagination
						className="mt-12"
						page={page}
						pageCount={pageCount}
						getPageHref={pageHref}
					/>
				</>
			)}
		</main>
	)
}
