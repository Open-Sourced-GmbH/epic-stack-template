import { useRef } from 'react'
import livediagShot from './+work/livediag.svg'
import opensourcedShot from './+work/opensourced.svg'
import xiquellShot from './+work/xiquell.svg'
import { useReveal } from './__use-reveal.ts'

/**
 * The three real reference projects. `shot` is a static, optimized preview asset
 * (the handoff's drag-drop `ImageSlot` was dropped — these are committed images).
 * Swap in real screenshots by replacing the files under `+work/`.
 */
const PROJECTS: ReadonlyArray<{
	id: string
	title: string
	tag: string
	domain: string
	url: string
	shot: string
	alt: string
	body: string
}> = [
	{
		id: 'opensourced',
		title: 'Open Sourced',
		tag: 'Hosting & privacy',
		domain: 'opensourced.ch',
		url: 'https://opensourced.ch',
		shot: opensourcedShot,
		alt: 'The Open Sourced hosting dashboard',
		body: 'A Swiss platform for managed Cloudron hosting, websites, and privacy-first devices.',
	},
	{
		id: 'xiquell',
		title: 'Xiquell',
		tag: 'E-commerce',
		domain: 'xiquell.ch',
		url: 'https://xiquell.ch',
		shot: xiquellShot,
		alt: 'The Xiquell product storefront',
		body: 'A product site for a premium water-filtration system — video hero and an education-led story.',
	},
	{
		id: 'livediag',
		title: 'Livediag',
		tag: 'Web app',
		domain: 'livediag.com',
		url: 'https://livediag.com',
		shot: livediagShot,
		alt: 'The Livediag real-time diagnostics interface',
		body: 'A real-time diagnostics web app — live readings and instant feedback, built to feel as fast as the data.',
	},
]

/**
 * "Selected work" — three project cards, each a static preview image over a
 * title/tag row, blurb, and an external domain link whose arrow nudges on hover.
 * Cards reveal in a stagger on scroll via `useReveal` (progressive enhancement —
 * the resting state renders server-side). One column on mobile, three from `md`.
 * Sits on a subtle muted band to separate it from the neighbouring sections.
 * Tokens only.
 */
export function Work() {
	const ref = useRef<HTMLElement>(null)
	useReveal(ref)

	return (
		<section
			id="work"
			ref={ref}
			aria-labelledby="work-heading"
			className="bg-muted/40 scroll-mt-20 py-24"
		>
			<div className="container">
				<div className="mx-auto max-w-2xl text-center">
					<p className="text-brand text-body-xs font-semibold tracking-wide uppercase">
						Selected work
					</p>
					<h2
						id="work-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance"
					>
						A few things we've shipped
					</h2>
					<p className="text-muted-foreground mt-4 text-pretty">
						Recent builds for Swiss teams — designed, engineered, and launched
						end to end.
					</p>
				</div>

				<ul
					role="list"
					className="mx-auto mt-16 grid max-w-5xl gap-8 md:grid-cols-3"
				>
					{PROJECTS.map((project, index) => (
						<li
							key={project.id}
							data-reveal
							style={{ transitionDelay: `${index * 90}ms` }}
						>
							<article className="group flex flex-col gap-4">
								<img
									src={project.shot}
									alt={project.alt}
									width={1200}
									height={750}
									loading="lazy"
									className="border-border aspect-[8/5] w-full rounded-xl border object-cover transition group-hover:-translate-y-1 group-hover:shadow-lg"
								/>
								<div className="flex items-center justify-between gap-3">
									<h3 className="text-body-sm font-semibold tracking-tight">
										{project.title}
									</h3>
									<span className="bg-brand-soft text-brand shrink-0 rounded-full px-2.5 py-1 text-body-2xs font-medium">
										{project.tag}
									</span>
								</div>
								<p className="text-muted-foreground text-body-xs leading-relaxed text-pretty">
									{project.body}
								</p>
								<a
									href={project.url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-brand group/link inline-flex w-fit items-center gap-1.5 text-body-xs font-medium"
								>
									{project.domain}
									<span
										aria-hidden
										className="transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
									>
										↗
									</span>
								</a>
							</article>
						</li>
					))}
				</ul>
			</div>
		</section>
	)
}
