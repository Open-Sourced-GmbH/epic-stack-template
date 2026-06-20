import { type Route } from './+types/index.ts'

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

/**
 * Placeholder blog index. Proves `/blog` resolves inside the shared marketing
 * chrome; the real feed (read module + card grid + pagination) ships in the
 * index slice. Mirrors the landing's section-stub idiom: a landmark + heading so
 * the page outline is correct while the body is still pending.
 */
export default function BlogIndex() {
	return (
		<section
			aria-labelledby="blog-heading"
			className="container scroll-mt-20 py-24"
		>
			<p className="text-brand text-sm font-semibold tracking-wide uppercase">
				Blog
			</p>
			<h1
				id="blog-heading"
				className="mt-3 text-3xl font-semibold tracking-tight text-balance"
			>
				The blog is on its way
			</h1>
			<p className="text-muted-foreground mt-4 text-pretty">Coming soon.</p>
		</section>
	)
}
