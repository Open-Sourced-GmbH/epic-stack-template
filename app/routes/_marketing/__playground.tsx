import { useRef, useState } from 'react'
import { specimens } from '#app/components/styleguide/specimens.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Card, CardContent, CardHeader } from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from '#app/components/ui/input-otp.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { cn } from '#app/utils/misc.tsx'
import { AppFrame } from './__app-frame.tsx'
import { Carousel, type CarouselSlide } from './__carousel.tsx'
import { useReveal } from './__use-reveal.ts'

const ONBOARDING_STEPS = ['Register', 'Verify', 'Welcome'] as const

/** Numbered progress rail across the three onboarding steps. */
function StepRail({ step }: { step: number }) {
	return (
		<ol className="flex items-center gap-3" aria-label="Onboarding progress">
			{ONBOARDING_STEPS.map((label, index) => {
				const done = index < step
				const active = index === step
				return (
					<li
						key={label}
						className="flex flex-1 items-center gap-3 last:flex-none"
					>
						<span
							className={cn(
								'text-body-2xs grid size-6 shrink-0 place-items-center rounded-full font-semibold',
								done && 'bg-brand text-primary-foreground',
								active && 'bg-brand-soft text-brand',
								!done && !active && 'bg-muted text-muted-foreground',
							)}
						>
							{done ? <Icon name="check" /> : index + 1}
						</span>
						<span
							className={cn(
								'text-body-2xs font-medium',
								active ? 'text-foreground' : 'text-muted-foreground',
							)}
						>
							{label}
						</span>
						{index < ONBOARDING_STEPS.length - 1 ? (
							<span
								className={cn('h-px flex-1', done ? 'bg-brand' : 'bg-border')}
							/>
						) : null}
					</li>
				)
			})}
		</ol>
	)
}

/**
 * Curated onboarding slide. Walks the real sign-up journey — register → 2FA →
 * welcome — composing Foundation parts and driving the `StatusButton` idle →
 * pending across the step boundary, so the playground shows the components doing
 * real work (not a static gallery).
 */
function OnboardingSlide() {
	const [step, setStep] = useState(0)
	const [status, setStatus] = useState<'idle' | 'pending'>('idle')
	const [code, setCode] = useState('')

	function register() {
		if (status === 'pending') return
		setStatus('pending')
		// Simulate the sign-up request, then hand off to the 2FA step.
		window.setTimeout(() => {
			setStatus('idle')
			setStep(1)
		}, 1_200)
	}

	function verify(value: string) {
		setCode(value)
		if (value.length < 6) return
		// A complete code settles into the welcome step.
		window.setTimeout(() => setStep(2), 500)
	}

	function restart() {
		setStep(0)
		setStatus('idle')
		setCode('')
	}

	return (
		<Card className="mx-auto w-full max-w-md">
			<CardHeader>
				<StepRail step={step} />
			</CardHeader>
			{/* Shared min-height so the card holds steady across steps (the welcome
			    step is the shortest and would otherwise collapse the card). */}
			<CardContent className="grid min-h-52 content-center">
				{step === 0 ? (
					<div className="grid gap-4">
						<div className="grid gap-1.5">
							<Label htmlFor="ob-email">Work email</Label>
							<Input id="ob-email" type="email" placeholder="you@studio.com" />
						</div>
						<div className="grid gap-1.5">
							<Label htmlFor="ob-password">Password</Label>
							<Input
								id="ob-password"
								type="password"
								placeholder="••••••••••••"
							/>
						</div>
						<StatusButton
							type="button"
							status={status}
							spinDelay={{ delay: 0, minDuration: 0 }}
							onClick={register}
							className="w-full"
						>
							Create account
						</StatusButton>
					</div>
				) : null}

				{step === 1 ? (
					<div className="grid gap-4">
						<div className="grid gap-1.5">
							<Label htmlFor="ob-otp">Two-factor code</Label>
							<p className="text-muted-foreground text-body-2xs">
								Enter the 6-digit code from your authenticator app.
							</p>
							{/* Split 3 + 3 with a gap between the groups, centered. */}
							<InputOTP
								id="ob-otp"
								maxLength={6}
								value={code}
								onChange={verify}
								containerClassName="justify-center pt-1"
							>
								<InputOTPGroup>
									<InputOTPSlot index={0} />
									<InputOTPSlot index={1} />
									<InputOTPSlot index={2} />
								</InputOTPGroup>
								<InputOTPGroup>
									<InputOTPSlot index={3} />
									<InputOTPSlot index={4} />
									<InputOTPSlot index={5} />
								</InputOTPGroup>
							</InputOTP>
						</div>
						<button
							type="button"
							onClick={restart}
							className="text-muted-foreground hover:text-foreground text-body-2xs justify-self-start"
						>
							← Back to register
						</button>
					</div>
				) : null}

				{step === 2 ? (
					<div className="grid place-items-center gap-3 py-4 text-center">
						<span className="bg-brand-soft text-brand grid size-12 place-items-center rounded-full">
							<Icon name="check" className="size-6" />
						</span>
						<div className="grid gap-1">
							<p className="text-foreground text-lg font-semibold">
								You're all set
							</p>
							<p className="text-muted-foreground text-body-sm">
								Your workspace is ready to go.
							</p>
						</div>
						<Button type="button" variant="outline" onClick={restart}>
							Run it again
						</Button>
					</div>
				) : null}
			</CardContent>
		</Card>
	)
}

/**
 * Specimen groups kept out of the playground carousel. These are static token
 * galleries (corner radii, surface elevations, overlay chrome) — they don't
 * read as "live, working product", so the showpiece stays focused on the
 * interactive components.
 */
export const EXCLUDED_GROUPS = new Set([
	'Radii',
	'Surfaces',
	'Overlays',
	'Type',
	'Feedback',
	'Forms',
])

/**
 * Individual specimens kept out of the playground carousel by `name`. The
 * `screen-auth` sign-in reference is dropped because the onboarding slide
 * already carries the auth story.
 */
export const EXCLUDED_SPECIMENS = new Set(['screen-auth'])

/**
 * Group the styleguide specimens into one slide per `group`, rendered from the
 * specimens themselves — so the playground can never drift from the shipping
 * components (adding/removing a specimen group flows through automatically),
 * minus the token-gallery groups in `EXCLUDED_GROUPS`.
 */
const SPECIMEN_SLIDES: CarouselSlide[] = [
	...new Set(specimens.map((s) => s.group)),
]
	.filter((group) => !EXCLUDED_GROUPS.has(group))
	.map((group) => ({
		id: group.toLowerCase(),
		label: group,
		content: (
			<div className="flex flex-col gap-8">
				{specimens
					.filter((s) => s.group === group && !EXCLUDED_SPECIMENS.has(s.name))
					.map((s) => (
						<div key={s.name}>
							{s.subtitle ? (
								<p className="text-muted-foreground text-body-2xs mb-3">
									{s.subtitle}
								</p>
							) : null}
							{s.render()}
						</div>
					))}
			</div>
		),
	}))

/**
 * Live component playground — the "this design system is real" showpiece. A
 * `Carousel` of slides (a curated onboarding flow plus one slide per styleguide
 * specimen group) inside an `AppFrame` browser chrome. Tokens only; motion is
 * progressive enhancement via `useReveal` + the `Carousel`'s own autoplay.
 */
export function Playground() {
	const ref = useRef<HTMLElement>(null)
	useReveal(ref)

	const slides: CarouselSlide[] = [
		{ id: 'onboarding', label: 'Onboarding', content: <OnboardingSlide /> },
		...SPECIMEN_SLIDES,
	]

	return (
		<section
			id="playground"
			ref={ref}
			aria-labelledby="playground-heading"
			className="container scroll-mt-20 py-24"
		>
			<div className="mx-auto max-w-2xl text-center">
				<p className="text-brand text-body-xs font-semibold tracking-wide uppercase">
					Live components
				</p>
				<h2
					id="playground-heading"
					className="mt-3 text-3xl font-semibold tracking-tight text-balance"
				>
					This isn't a screenshot.
				</h2>
				<p className="text-muted-foreground mt-4 text-pretty">
					Flip through real, working components — an onboarding flow, forms,
					menus and actions. Every field and button is live and accessible.
					Recolor the whole page from the navbar.
				</p>
			</div>

			<div data-reveal className="mx-auto mt-12 max-w-3xl">
				<AppFrame url="atlas.app/components">
					<Carousel label="Component playground" slides={slides} />
				</AppFrame>
			</div>
		</section>
	)
}
