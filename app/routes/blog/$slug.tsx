import { invariantResponse } from '@epic-web/invariant'
import { Link } from 'react-router'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '#app/components/ui/avatar.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Card } from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { renderPostBody } from '#app/utils/markdown.server.ts'
import {
	cn,
	getDomainUrl,
	getPostImgSrc,
	getUserImgSrc,
} from '#app/utils/misc.tsx'
import {
	type ArticlePost,
	type NavPost,
	deriveDescription,
	getAdjacentPosts,
	getPostBySlug,
} from '#app/utils/post.server.ts'
import { type Route } from './+types/$slug.ts'
import {
	COVER_GRADIENTS,
	TagPills,
	coverArt,
	formatDate,
	initials,
} from './__feed.tsx'

/** The post fields the client renders — the raw `body` stays server-side. */
type ArticleView = Omit<ArticlePost, 'body'>

export async function loader({ params, request }: Route.LoaderArgs) {
	const post = await getPostBySlug(params.slug)
	// A Draft row exists but must 404 publicly just like an unknown slug — the
	// read module already filtered Drafts out, so a `null` here means "404".
	invariantResponse(post, 'Not found', { status: 404 })

	// Render the body through the *same* pipeline + `.prose` ramp as the editor
	// preview, so what an author previews can never diverge from what ships.
	const [bodyHtml, { newer, older }] = await Promise.all([
		renderPostBody(post.body),
		getAdjacentPosts(post),
	])

	const description = deriveDescription(post)
	const ogImage = post.coverImage
		? `${getDomainUrl(request)}${getPostImgSrc(post.coverImage.objectKey)}`
		: null

	// Drop the raw Markdown from the payload — it's already rendered into
	// `bodyHtml`, so shipping it again would just bloat the document.
	const { body: _body, ...view } = post
	return { post: view, bodyHtml, description, ogImage, newer, older }
}

export const meta: Route.MetaFunction = ({ data }) => {
	if (!data?.post) return [{ title: 'Post not found — Open Sourced' }]
	const { post, description, ogImage } = data
	const tags: Array<Record<string, string>> = [
		{ title: `${post.title} — Open Sourced` },
		{ name: 'description', content: description },
		{ property: 'og:title', content: post.title },
		{ property: 'og:description', content: description },
		{ property: 'og:type', content: 'article' },
	]
	if (ogImage) tags.push({ property: 'og:image', content: ogImage })
	return tags
}

/** Full-bleed cover banner with a scrim, the first tag as eyebrow, and the H1. */
function ArticleHero({ post }: { post: ArticleView }) {
	const eyebrow = post.tags[0]?.name
	return (
		<header className="relative overflow-hidden rounded-2xl">
			<div className="aspect-[21/9] w-full">
				{post.coverImage ? (
					<img
						src={getPostImgSrc(post.coverImage.objectKey)}
						alt={post.coverImage.altText ?? ''}
						className="h-full w-full object-cover"
					/>
				) : (
					<div
						aria-hidden="true"
						className="flex h-full w-full items-center justify-center"
						style={{ background: COVER_GRADIENTS[coverArt(post.slug)] }}
					>
						<Icon name="file-text" className="size-10 text-white/40" />
					</div>
				)}
			</div>
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent"
			/>
			<div className="absolute inset-x-0 bottom-0 p-6 md:p-9">
				{eyebrow ? (
					<p className="text-body-2xs font-semibold tracking-wide text-white/80 uppercase">
						{eyebrow}
					</p>
				) : null}
				<h1 className="mt-2 leading-tight font-bold text-balance text-white [font-size:clamp(1.9rem,4vw,3rem)]">
					{post.title}
				</h1>
			</div>
		</header>
	)
}

/** Byline bar — avatar + name + role pill (on `--brand-soft`) left, tags right. */
function Byline({ post }: { post: ArticleView }) {
	// A `SetNull` author is gone, not anonymous — credit reads "Unknown".
	const name = post.author?.name ?? post.author?.username ?? 'Unknown'
	const role = post.author?.roles[0]?.name
	return (
		<div className="border-border mt-6 flex flex-wrap items-center justify-between gap-3 border-b pb-6">
			<div className="flex items-center gap-3">
				<Avatar className="size-9">
					{post.author?.image ? (
						<AvatarImage
							src={getUserImgSrc(post.author.image.objectKey)}
							alt=""
						/>
					) : null}
					<AvatarFallback>{initials(name)}</AvatarFallback>
				</Avatar>
				<div className="flex flex-col gap-0.5">
					<span className="text-body-sm font-medium">{name}</span>
					<div className="flex items-center gap-2">
						{post.publishedAt ? (
							<time
								className="text-muted-foreground text-body-xs"
								dateTime={new Date(post.publishedAt).toISOString()}
							>
								{formatDate(post.publishedAt)}
							</time>
						) : null}
						{role ? (
							<span className="bg-brand-soft text-brand text-body-2xs rounded-full px-2 py-0.5 font-medium capitalize">
								{role}
							</span>
						) : null}
					</div>
				</div>
			</div>
			<TagPills tags={post.tags} />
		</div>
	)
}

/** One prev/next card linking to an adjacent post in the public timeline. */
function NavCard({
	post,
	direction,
}: {
	post: NavPost
	direction: 'Previous' | 'Next'
}) {
	return (
		<Card
			className={cn(
				'relative p-5 transition hover:shadow-md',
				direction === 'Next' && 'sm:text-right',
			)}
		>
			<p className="text-muted-foreground text-body-2xs font-semibold tracking-wide uppercase">
				{direction}
			</p>
			<h2 className="text-h6 mt-1 leading-snug">
				<Link
					to={`/blog/${post.slug}`}
					className="focus-cosy rounded-sm after:absolute after:inset-0"
				>
					{post.title}
				</Link>
			</h2>
		</Card>
	)
}

/** Prev/next rail — older on the left, newer on the right; hidden if neither. */
function PrevNext({
	newer,
	older,
}: {
	newer: NavPost | null
	older: NavPost | null
}) {
	if (!newer && !older) return null
	return (
		<nav
			aria-label="More posts"
			className="mt-14 grid gap-4 sm:grid-cols-2"
		>
			{older ? (
				<NavCard post={older} direction="Previous" />
			) : (
				<div className="hidden sm:block" />
			)}
			{newer ? <NavCard post={newer} direction="Next" /> : null}
		</nav>
	)
}

/**
 * The public article page. Reads one Published post by slug (404s on an unknown
 * **or** Draft slug), renders an editorial hero, a byline bar, the excerpt as a
 * dek, and the Markdown body through the shared `renderPostBody` + `.prose`
 * ramp, with prev/next navigation. Marketing chrome comes from the blog layout.
 */
export default function Article({ loaderData }: Route.ComponentProps) {
	const { post, bodyHtml, newer, older } = loaderData
	return (
		<main className="container py-12 md:py-16">
			<div className="mx-auto max-w-3xl">
				<Button
					asChild
					variant="link"
					className="text-muted-foreground mb-6 -ml-3"
				>
					<Link to="/blog">
						<Icon name="arrow-left">Back to blog</Icon>
					</Link>
				</Button>

				<ArticleHero post={post} />
				<Byline post={post} />
				{post.excerpt ? (
					<p className="text-muted-foreground mt-6 text-lg text-pretty">
						{post.excerpt}
					</p>
				) : null}
				<div
					className="prose mt-8"
					dangerouslySetInnerHTML={{ __html: bodyHtml }}
				/>
				<PrevNext newer={newer} older={older} />
			</div>
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
							<h1 className="text-h4">Post not found</h1>
							<p className="text-muted-foreground max-w-md text-pretty">
								This post may have moved, or it was never published.
							</p>
						</div>
						<Button asChild variant="outline">
							<Link to="/blog">Back to the blog</Link>
						</Button>
					</main>
				),
			}}
		/>
	)
}
