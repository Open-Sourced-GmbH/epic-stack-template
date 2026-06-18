import { ThemeSwitch } from '#app/routes/resources/theme-switch.tsx'
import { useOptionalRequestInfo } from '#app/utils/request-info.ts'
import { type Route } from './+types/index.ts'
import { MarketingFooter } from './__footer.tsx'
import { MarketingHeader, navSections } from './__header.tsx'
import { Hero } from './__hero.tsx'

const SITE_TITLE = 'Open Sourced — Product engineering studio'
const SITE_DESCRIPTION =
	'Open Sourced is a product engineering studio. We design and ship production-grade web apps — from first prototype to launch.'

export const meta: Route.MetaFunction = () => [
	{ title: SITE_TITLE },
	{ name: 'description', content: SITE_DESCRIPTION },
	{ property: 'og:title', content: SITE_TITLE },
	{ property: 'og:description', content: SITE_DESCRIPTION },
	{ property: 'og:type', content: 'website' },
]

// The landing ships its own branded header/footer, so the generic app chrome in
// root.tsx is suppressed here (read via this handle, not a hardcoded route id).
export const handle = { hideChrome: true }

/**
 * Placeholder for a content section that ships in a later slice. Renders the
 * section landmark + heading so anchor links and scrollspy targets resolve and
 * the heading outline is correct; the real content replaces the body later.
 */
function SectionStub({ id, title }: { id: string; title: string }) {
	return (
		<section
			id={id}
			aria-labelledby={`${id}-heading`}
			className="container scroll-mt-20 py-24"
		>
			<h2 id={`${id}-heading`} className="text-2xl font-semibold">
				{title}
			</h2>
			<p className="text-muted-foreground mt-2">Coming soon.</p>
		</section>
	)
}

export default function Index() {
	const requestInfo = useOptionalRequestInfo()
	return (
		<div className="bg-background text-foreground flex min-h-screen flex-col">
			<MarketingHeader
				themeSwitch={
					<ThemeSwitch userPreference={requestInfo?.userPrefs.theme} />
				}
			/>
			<main className="flex-1">
				<Hero />
				{navSections.map((section) => (
					<SectionStub
						key={section.id}
						id={section.id}
						title={section.label}
					/>
				))}
			</main>
			<MarketingFooter />
		</div>
	)
}
