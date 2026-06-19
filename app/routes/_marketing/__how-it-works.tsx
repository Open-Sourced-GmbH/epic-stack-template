import { useRef } from 'react'
import { Icon, type IconName } from '#app/components/ui/icon.tsx'
import { useReveal } from './__use-reveal.ts'

/**
 * The four-step engagement timeline. `n` is the displayed ordinal, `dur` the
 * duration chip. Copy is the studio's process, settled in-PR.
 */
const STEPS: ReadonlyArray<{
	n: string
	icon: IconName
	title: string
	dur: string
	body: string
}> = [
	{
		n: '01',
		icon: 'envelope-closed',
		title: 'Brief',
		dur: 'Day 1',
		body: 'A short, focused conversation about what you want to build. You leave with a clear scope and a flat price.',
	},
	{
		n: '02',
		icon: 'pencil-2',
		title: 'Prototype',
		dur: 'Week 1',
		body: "Within days you're clicking through a real, interactive prototype — not slides, the actual thing.",
	},
	{
		n: '03',
		icon: 'laptop',
		title: 'Build',
		dur: 'Weeks 2–4',
		body: 'We turn the prototype into production software, with a working build to try every cycle.',
	},
	{
		n: '04',
		icon: 'check',
		title: 'Launch',
		dur: 'Ship day',
		body: 'We ship it, watch how it performs, and tighten the details. You own all the code.',
	},
]

/**
 * "How it works" — a vertical timeline of the four engagement steps. Each row
 * reveals on scroll via `useReveal`; the connecting line draws (`scaleY`) and
 * the node pops once the row enters view. Motion is progressive enhancement:
 * the `.hiw` rules in `tailwind.css` only bite once `useReveal` adds `.rv`, so
 * SSR / no-JS / reduced-motion visitors get the full resting state. Tokens only.
 */
export function HowItWorks() {
	const ref = useRef<HTMLElement>(null)
	useReveal(ref)

	return (
		<section
			id="how-it-works"
			ref={ref}
			aria-labelledby="how-it-works-heading"
			className="container scroll-mt-20 py-24"
		>
			<div className="mx-auto max-w-2xl text-center">
				<p className="text-brand text-sm font-semibold tracking-wide uppercase">
					How it works
				</p>
				<h2
					id="how-it-works-heading"
					className="mt-3 text-3xl font-semibold tracking-tight text-balance"
				>
					From first call to shipped, in four steps
				</h2>
				<p className="text-muted-foreground mt-4 text-pretty">
					A simple, predictable process — so you always know where the project
					stands and what's next.
				</p>
			</div>

			<ol role="list" className="hiw mx-auto mt-16 max-w-2xl">
				{STEPS.map((step, index) => (
					<li
						key={step.n}
						data-reveal
						style={{ transitionDelay: `${index * 90}ms` }}
						className="grid grid-cols-[3rem_1fr] gap-5"
					>
						<div className="flex flex-col items-center">
							<span className="hiw-node bg-brand-soft text-brand border-border grid h-12 w-12 place-items-center rounded-lg border">
								<Icon name={step.icon} className="h-5 w-5" aria-hidden />
							</span>
							{index < STEPS.length - 1 ? (
								<span
									aria-hidden
									className="hiw-line bg-border my-2 w-px flex-1"
								/>
							) : null}
						</div>
						<div className="pb-9 last:pb-0">
							<div className="mb-2 flex flex-wrap items-baseline gap-3">
								<span className="text-brand text-xs font-bold tracking-wider">
									{step.n}
								</span>
								<h3 className="text-xl font-semibold tracking-tight">
									{step.title}
								</h3>
								<span className="bg-muted text-muted-foreground ml-auto rounded-full px-2.5 py-1 text-xs whitespace-nowrap">
									{step.dur}
								</span>
							</div>
							<p className="text-muted-foreground leading-relaxed text-pretty">
								{step.body}
							</p>
						</div>
					</li>
				))}
			</ol>
		</section>
	)
}
