import { useRef } from 'react'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '#app/components/ui/accordion.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { useReveal } from './__use-reveal.ts'

/**
 * Landing FAQ entries. Item 0 is the default-open question (see `DEFAULT_OPEN`),
 * so order matters: lead with the objection most visitors land on. Copy is
 * studio voice — placeholder-free, refine in-PR if positioning shifts.
 */
const FAQS = [
	{
		q: 'How do fixed-scope sprints work?',
		a: 'We scope a sprint to a concrete outcome — a prototype, a feature, a launch — agree the deliverable and price up front, then ship it. No open-ended retainers, no surprise invoices.',
	},
	{
		q: 'What does a typical engagement cost?',
		a: 'Pricing is fixed per sprint and shared before we start, so you always know the number. See the pricing section above for the three standard shapes; bespoke scopes get a fixed quote.',
	},
	{
		q: 'Who owns the code and design?',
		a: 'You do — fully. Everything we build ships to your repository under your license. We hand over production-grade code, not a black box, and you can take it anywhere.',
	},
	{
		q: 'How quickly can you start?',
		a: "We book a few weeks out and run one or two engagements at a time so each gets real focus. Tell us your timeline and we'll be straight about the earliest honest start date.",
	},
	{
		q: 'Do you work with existing codebases?',
		a: 'Yes. We join existing products as readily as we start new ones — auditing what is there, matching your conventions, and leaving the codebase clearer than we found it.',
	},
] as const

/** The accordion value rendered open on load (the first question). */
const DEFAULT_OPEN = 'faq-0'

/**
 * FAQ landing section. Two-column on desktop — section head plus a "Talk to us"
 * CTA on the left, the single-open accordion on the right — stacking to one
 * column on mobile. All open/hover/focus/reduced-motion behavior is owned by the
 * `Accordion` Foundation component (EPT-7); this section supplies content and
 * layout only.
 *
 * Entrance is progressive enhancement via `useReveal`: the resting state renders
 * server-side (everything visible), so no-JS and reduced-motion visitors get the
 * full section; when motion is allowed, columns rise/fade as they scroll in.
 */
export function Faq() {
	const ref = useRef<HTMLElement>(null)
	useReveal(ref)

	return (
		<section
			id="faq"
			ref={ref}
			aria-labelledby="faq-heading"
			className="container scroll-mt-20 py-24"
		>
			<div className="grid gap-12 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
				<div data-reveal className="md:sticky md:top-24 md:self-start">
					<p className="text-brand text-body-xs font-semibold tracking-wide uppercase">
						FAQ
					</p>
					<h2
						id="faq-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance"
					>
						Frequently asked questions
					</h2>
					<p className="text-muted-foreground mt-4 max-w-[34ch] text-pretty">
						Can't find what you're looking for? We're happy to talk it through.
					</p>
					<Button asChild variant="outline" className="mt-6">
						<a href="#contact">Talk to us</a>
					</Button>
				</div>

				<Accordion data-reveal defaultValue={DEFAULT_OPEN} className="md:mt-2">
					{FAQS.map(({ q, a }, i) => (
						<AccordionItem key={q} value={`faq-${i}`}>
							<AccordionTrigger>{q}</AccordionTrigger>
							<AccordionContent>{a}</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</div>
		</section>
	)
}
