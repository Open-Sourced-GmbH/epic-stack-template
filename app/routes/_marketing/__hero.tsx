import { useEffect, useRef, useState } from 'react'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { prefersReducedMotion } from '#app/utils/misc.tsx'

/** Final value of the demo build-progress bar, in percent. */
const BUILD_PROGRESS = 72

/** Inline separator dot for the hero's meta row. */
function Dot() {
	return (
		<span
			aria-hidden
			className="bg-muted-foreground/50 inline-block h-1 w-1 rounded-full"
		/>
	)
}

/**
 * Landing hero. Renders eyebrow, headline, lead, two CTAs, and a dark product
 * panel with a build-progress bar and a floating "All checks passed" chip.
 *
 * Motion is progressive enhancement. The resting/final state renders
 * server-side — every child is visible and the progress bar is full — so no-JS
 * and reduced-motion visitors see the complete hero. When motion is allowed,
 * mounting sets `data-in` (replaying the children's rise/fade via CSS) and the
 * bar animates 0 → full. All entrance and ambient loops are gated behind
 * `prefers-reduced-motion: no-preference` in `app/styles/tailwind.css`.
 */
export function Hero() {
	const ref = useRef<HTMLElement>(null)
	const [fill, setFill] = useState(BUILD_PROGRESS)

	useEffect(() => {
		if (prefersReducedMotion()) return
		const el = ref.current
		setFill(0)
		const enter = window.setTimeout(() => el?.setAttribute('data-in', ''), 60)
		const grow = window.setTimeout(() => setFill(BUILD_PROGRESS), 480)
		return () => {
			window.clearTimeout(enter)
			window.clearTimeout(grow)
		}
	}, [])

	return (
		<section
			id="hero"
			ref={ref}
			aria-labelledby="hero-heading"
			className="hero relative scroll-mt-20 overflow-hidden"
		>
			{/* Ambient brand glow wash. */}
			<div
				aria-hidden
				className="bg-brand-glow breathe pointer-events-none absolute -top-60 -right-44 h-[680px] w-[680px] rounded-full opacity-50 blur-lg"
			/>

			<div className="relative z-1 container grid items-center gap-[clamp(24px,4vw,56px)] py-[clamp(36px,6vw,76px)] min-[880px]:grid-cols-[0.95fr_1.05fr]">
				<div>
					<p className="anim d1 text-brand inline-flex items-center gap-2.5 text-sm font-semibold tracking-wide uppercase">
						<span className="bg-brand dotpulse h-[7px] w-[7px] rounded-full" />
						Product engineering studio
					</p>
					<h1
						id="hero-heading"
						className="anim d2 mt-5 text-[clamp(40px,4.6vw,62px)] leading-[1.02] font-semibold tracking-[-0.035em] text-balance"
					>
						Software that feels <span className="text-brand">designed</span>,
						shipped at startup speed.
					</h1>
					<p className="anim d3 text-muted-foreground mt-5 max-w-[34ch] text-lg leading-[1.55] text-pretty">
						We design and build polished web products end to end — for teams who
						refuse to look like everyone else.
					</p>
					<div className="anim d4 mt-8 flex flex-wrap items-center gap-3.5">
						<Button asChild size="lg">
							<a href="#contact">Start a project</a>
						</Button>
						<Button asChild size="lg" variant="outline">
							<a href="#work">See the work</a>
						</Button>
					</div>
					<div className="anim d5 text-muted-foreground mt-6 flex flex-wrap items-center gap-2.5 text-sm">
						<span>Booking Q3 2026</span>
						<Dot />
						<span>Fixed-scope sprints</span>
						<Dot />
						<span>Design + build</span>
					</div>
				</div>

				{/* Right product panel — `.theme-inverse` renders it as the opposite of
				    the active page theme (dark panel on a light page, light panel on a
				    dark page) so it always keeps contrast. `contents` keeps the absolute
				    glow + chip positioned against the outer cell while the panel inherits
				    the inverted tokens. */}
				<div className="anim d4 relative hidden items-center justify-center min-[880px]:flex">
					<div className="theme-inverse contents">
						<div
							aria-hidden
							className="bg-brand-glow breathe absolute h-[78%] w-[78%] rounded-[40px] opacity-90 blur-[10px]"
						/>
						<div className="bg-card text-card-foreground border-border relative w-[min(420px,92%)] rounded-[20px] border p-[26px] shadow-[0_30px_70px_-30px_rgba(0,0,0,0.55)]">
							<div className="flex items-center gap-3">
								<div className="bg-brand h-[42px] w-[42px] rounded-xl" />
								<div>
									<div className="text-[15.5px] font-semibold">atlas.app</div>
									<div className="text-muted-foreground text-[13px]">
										Production deployment
									</div>
								</div>
								<span className="bg-brand-soft text-brand ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
									<span className="bg-brand h-1.5 w-1.5 rounded-full" />
									Live
								</span>
							</div>
							<div className="text-muted-foreground mt-6 mb-2 flex justify-between text-[13px]">
								<span>Building release</span>
								<b className="text-card-foreground">{fill}%</b>
							</div>
							<div className="bg-muted h-2 overflow-hidden rounded-full">
								<div
									className="bg-brand h-full rounded-full transition-[width] duration-[1400ms] ease-[cubic-bezier(0.22,0.7,0.25,1)]"
									style={{ width: `${fill}%` }}
								/>
							</div>
							<div className="mt-6 flex gap-2.5">
								<Button className="flex-1">Deploy to production</Button>
								<Button variant="outline">Preview</Button>
							</div>
						</div>
						<div className="bg-card text-card-foreground border-border floaty absolute -top-4 -left-3.5 flex items-center gap-2 rounded-xl border px-[15px] py-2.5 text-[13px] font-medium shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)]">
							<span className="bg-brand grid h-[18px] w-[18px] place-items-center rounded-full text-white">
								<Icon name="check" className="h-3 w-3" />
							</span>
							All checks passed
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
