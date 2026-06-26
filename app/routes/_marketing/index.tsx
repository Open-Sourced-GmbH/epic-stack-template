import { type Route } from './+types/index.ts'
import { CodeSample } from './__code-sample.tsx'
import { CommandShowpiece } from './__command-palette.tsx'
import { Faq } from './__faq.tsx'
import { FinalCta } from './__final-cta.tsx'
import { Hero } from './__hero.tsx'
import { HowItWorks } from './__how-it-works.tsx'
import { MarketingLayout } from './__layout.tsx'
import { Playground } from './__playground.tsx'
import { Pricing } from './__pricing.tsx'
import { navSections } from './__sections.ts'
import { Services } from './__services.tsx'
import { Work } from './__work.tsx'

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
			<h2 id={`${id}-heading`} className="text-body-lg font-semibold">
				{title}
			</h2>
			<p className="text-muted-foreground mt-2">Coming soon.</p>
		</section>
	)
}

/**
 * Real section components, keyed by their `navSections` id. Ids absent here fall
 * back to `SectionStub`, so each slice ships a section by adding one entry — no
 * edits to the render loop. Each component owns its own `id`/landmark markup.
 */
const sectionComponents: Partial<
	Record<(typeof navSections)[number]['id'], React.ComponentType>
> = {
	services: Services,
	pricing: Pricing,
	faq: Faq,
}

export default function Index() {
	return (
		<MarketingLayout>
			<Hero />
			{/*
			 * Showpiece + narrative sections are mounted explicitly here in their
			 * settled page order: the work proof, the process timeline, the ⌘K
			 * command palette, the live design system, then the code sample.
			 * `Work` is a `navSections` target but leads the page, so it's rendered
			 * here and skipped in the loop below (which handles the remaining nav
			 * sections in their declared order).
			 */}
			<Work />
			<HowItWorks />
			<CommandShowpiece />
			<Playground />
			<CodeSample />
			{navSections.map((section) => {
				if (section.id === 'work') return null
				const Section = sectionComponents[section.id]
				return Section ? (
					<Section key={section.id} />
				) : (
					<SectionStub key={section.id} id={section.id} title={section.label} />
				)
			})}
			{/*
			 * The closing CTA is the `#contact` anchor the hero/header CTAs point
			 * to. It isn't a `navSections` target, so it's mounted explicitly after
			 * the nav sections, just before the footer.
			 */}
			<FinalCta />
		</MarketingLayout>
	)
}
