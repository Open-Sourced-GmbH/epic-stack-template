import { useRef } from 'react'
import { Link } from 'react-router'
import { useReveal } from './__use-reveal.ts'

/**
 * Closing call-to-action band. The band, ambient glow, and the light button's
 * text colour are all derived from the brand accent via `oklch(from var(--brand)
 * …)`, so the band re-themes with the accent and stays readable in light and
 * dark (literal white text on the dark brand gradient is the sanctioned
 * exception). The band reveals on scroll via `useReveal` (progressive
 * enhancement — the resting state renders server-side). This is the `#contact`
 * anchor the hero and header CTAs point to.
 */
export function FinalCta() {
	const ref = useRef<HTMLElement>(null)
	useReveal(ref)

	return (
		<section
			id="contact"
			ref={ref}
			aria-labelledby="contact-heading"
			className="container scroll-mt-20 py-24"
		>
			<div
				data-reveal
				className="relative overflow-hidden rounded-3xl px-6 py-16 text-center text-white bg-[linear-gradient(135deg,oklch(from_var(--brand)_calc(l-0.13)_c_h),oklch(from_var(--brand)_calc(l-0.26)_calc(c*0.7)_h))] sm:px-12 sm:py-20"
			>
				<div
					aria-hidden
					className="pointer-events-none absolute -top-32 -right-24 h-[420px] w-[420px] blur-lg bg-[radial-gradient(closest-side,oklch(from_var(--brand)_calc(l+0.13)_c_h/0.5),transparent_70%)]"
				/>
				<h2
					id="contact-heading"
					className="relative text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
				>
					Let's build something worth shipping
				</h2>
				<p className="relative mx-auto mt-4 max-w-[48ch] text-lg text-pretty text-white/80">
					Tell us what you're making and we'll come back with a plan and a fixed
					price — usually within a day.
				</p>
				<div className="relative mt-8 flex flex-wrap justify-center gap-3">
					<Link
						to="/support"
						data-slot="button"
						className="inline-flex h-11 items-center rounded-md bg-white px-6 font-semibold text-[oklch(from_var(--brand)_calc(l-0.25)_c_h)] transition-transform hover:-translate-y-px"
					>
						Start a project
					</Link>
					<Link
						to="/support"
						data-slot="button"
						className="inline-flex h-11 items-center rounded-md border border-white/40 px-6 font-medium text-white transition-colors hover:bg-white/10"
					>
						Book a call
					</Link>
				</div>
			</div>
		</section>
	)
}
