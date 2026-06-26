import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { cn } from '#app/utils/misc.tsx'

/**
 * Pricing tiers. Copy (prices, feature bullets) is PLACEHOLDER — the design
 * handoff only sketched this surface, so the studio finalizes the numbers and
 * wording in-PR. Order is left→right; `featured` marks the emphasized middle
 * tier (ringed in brand, carries the "Most popular" badge).
 */
const TIERS = [
	{
		name: 'Sprint',
		price: 'CHF 6k',
		cadence: 'fixed scope',
		blurb: 'A focused week or two to ship one concrete outcome.',
		features: [
			'One prototype, feature, or fix',
			'Fixed price agreed up front',
			'Production-grade handover',
		],
		cta: 'Start a sprint',
		featured: false,
	},
	{
		name: 'Project',
		price: 'CHF 20k',
		cadence: 'fixed scope',
		blurb: 'End-to-end design and build, from first prototype to launch.',
		features: [
			'Discovery, design & engineering',
			'Fixed scope, fixed price',
			'Launch support included',
			'You own all code & design',
		],
		cta: 'Start a project',
		featured: true,
	},
	{
		name: 'Embedded',
		price: 'CHF 12k',
		cadence: 'per month',
		blurb: 'We join your team for a stretch and ship alongside you.',
		features: [
			'Dedicated capacity, monthly',
			'Works in your codebase',
			'Pause or stop anytime',
		],
		cta: 'Talk to us',
		featured: false,
	},
] as const

const FEATURED_BADGE = 'Most popular'

/**
 * Three-tier pricing grid (Sprint · Project featured · Embedded). The featured
 * middle tier is ringed in brand and visually lifted; the others sit flat. One
 * column on mobile, three from `md`. Tokens only.
 *
 * Static content — no entrance motion of its own beyond inheriting the page; the
 * resting state renders server-side so SSR and reduced-JS visitors see all tiers.
 */
export function Pricing() {
	return (
		<section
			id="pricing"
			aria-labelledby="pricing-heading"
			className="container scroll-mt-20 py-24"
		>
			<div className="mx-auto max-w-2xl text-center">
				<p className="text-brand text-body-xs font-semibold tracking-wide uppercase">
					Pricing
				</p>
				<h2
					id="pricing-heading"
					className="mt-3 text-3xl font-semibold tracking-tight text-balance"
				>
					Fixed scope, fixed price
				</h2>
				<p className="text-muted-foreground mt-4 text-pretty">
					Every engagement is scoped to a concrete outcome and priced up front —
					no open-ended retainers, no surprise invoices.
				</p>
			</div>

			<ul
				role="list"
				className="mx-auto mt-16 grid max-w-5xl items-start gap-6 md:grid-cols-3"
			>
				{TIERS.map((tier) => (
					<li
						key={tier.name}
						className={cn(
							'bg-card text-card-foreground border-border flex flex-col rounded-xl border p-6 transition hover:-translate-y-1 hover:shadow-lg',
							tier.featured &&
								'ring-brand relative shadow-md ring-2 md:-translate-y-2',
						)}
					>
						{tier.featured ? (
							<span className="bg-brand text-primary-foreground absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-body-2xs font-semibold">
								{FEATURED_BADGE}
							</span>
						) : null}

						<h3 className="text-lg font-semibold">{tier.name}</h3>
						<p className="mt-2 flex items-baseline gap-1.5">
							<span className="text-3xl font-semibold tracking-tight">
								{tier.price}
							</span>
							<span className="text-muted-foreground text-body-xs">
								{tier.cadence}
							</span>
						</p>
						<p className="text-muted-foreground mt-3 text-body-xs text-pretty">
							{tier.blurb}
						</p>

						<ul role="list" className="mt-6 flex flex-col gap-3 text-body-xs">
							{tier.features.map((feature) => (
								<li key={feature} className="flex items-start gap-2.5">
									<Icon
										name="check"
										className="text-brand mt-0.5 shrink-0"
										aria-hidden
									/>
									<span>{feature}</span>
								</li>
							))}
						</ul>

						<Button
							asChild
							variant={tier.featured ? 'default' : 'outline'}
							className="mt-8 w-full"
						>
							<a href="#contact">{tier.cta}</a>
						</Button>
					</li>
				))}
			</ul>
		</section>
	)
}
