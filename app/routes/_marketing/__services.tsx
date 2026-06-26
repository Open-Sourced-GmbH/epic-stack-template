import { useRef } from 'react'
import { Icon, type IconName } from '#app/components/ui/icon.tsx'
import { useReveal } from './__use-reveal.ts'

/** The three things the studio does, left→right. Copy settled in-PR. */
const SERVICES: ReadonlyArray<{
	icon: IconName
	title: string
	body: string
}> = [
	{
		icon: 'pencil-2',
		title: 'Product design',
		body: 'Interface design, design systems, and clickable prototypes that settle decisions before a line of code.',
	},
	{
		icon: 'laptop',
		title: 'Front-end engineering',
		body: "Production React that's fast, accessible, and clean enough for your team to own after we hand it off.",
	},
	{
		icon: 'reset',
		title: 'Launch & iterate',
		body: 'We ship, watch how it performs, and tighten the details that turn a launch into momentum.',
	},
]

/**
 * "What we do" — three service cards. Each card lifts and tints its border
 * toward brand on hover, with a `brand-soft` icon tile. Cards reveal in a
 * stagger on scroll via `useReveal` (progressive enhancement — the resting
 * state renders server-side). One column on mobile, three from `md`. Tokens only.
 */
export function Services() {
	const ref = useRef<HTMLElement>(null)
	useReveal(ref)

	return (
		<section
			id="services"
			ref={ref}
			aria-labelledby="services-heading"
			className="container scroll-mt-20 py-24"
		>
			<div className="mx-auto max-w-2xl text-center">
				<p className="text-brand text-body-xs font-semibold tracking-wide uppercase">
					What we do
				</p>
				<h2
					id="services-heading"
					className="mt-3 text-3xl font-semibold tracking-tight text-balance"
				>
					Design and engineering, under one roof
				</h2>
				<p className="text-muted-foreground mt-4 text-pretty">
					One team from first sketch to production — no handoffs lost in
					translation.
				</p>
			</div>

			<ul
				role="list"
				className="mx-auto mt-16 grid max-w-5xl gap-6 md:grid-cols-3"
			>
				{SERVICES.map((service, index) => (
					<li
						key={service.title}
						data-reveal
						style={{ transitionDelay: `${index * 90}ms` }}
					>
						<article className="group bg-card text-card-foreground border-border hover:border-brand h-full rounded-xl border p-6 transition hover:-translate-y-1 hover:shadow-lg">
							<span className="bg-brand-soft text-brand mb-5 grid h-12 w-12 place-items-center rounded-lg transition-transform group-hover:scale-110 group-hover:-rotate-6">
								<Icon name={service.icon} className="h-5 w-5" aria-hidden />
							</span>
							<h3 className="mb-2 text-lg font-semibold tracking-tight">
								{service.title}
							</h3>
							<p className="text-muted-foreground text-body-xs leading-relaxed text-pretty">
								{service.body}
							</p>
						</article>
					</li>
				))}
			</ul>
		</section>
	)
}
