import { useRef, useState } from 'react'
import { specimens } from '#app/components/styleguide/specimens.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Checkbox } from '#app/components/ui/checkbox.tsx'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from '#app/components/ui/input-otp.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
import { AppFrame } from './__app-frame.tsx'
import { Carousel, type CarouselSlide } from './__carousel.tsx'
import { useReveal } from './__use-reveal.ts'

/**
 * Curated onboarding slide. Composes real Foundation parts into a mini sign-up
 * flow and drives the submit `StatusButton` idle → pending → success, so the
 * playground shows the components doing real work (not just sitting there).
 */
function OnboardingSlide() {
	const [status, setStatus] = useState<'idle' | 'pending' | 'success'>('idle')
	const [role, setRole] = useState('Owner')

	function submit() {
		if (status === 'pending') return
		setStatus('pending')
		// Simulate the request resolving; the button settles into success.
		window.setTimeout(() => setStatus('success'), 1_200)
	}

	return (
		<div className="grid gap-6 sm:grid-cols-2">
			<div className="grid gap-1.5">
				<Label htmlFor="ob-email">Work email</Label>
				<Input id="ob-email" type="email" placeholder="you@studio.com" />
			</div>

			<div className="grid gap-1.5">
				<Label htmlFor="ob-role">Your role</Label>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							id="ob-role"
							variant="outline"
							className="justify-between font-normal"
						>
							{role}
							<Icon name="dots-horizontal" className="opacity-60" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						{['Owner', 'Engineer', 'Designer'].map((option) => (
							<DropdownMenuItem key={option} onSelect={() => setRole(option)}>
								{option}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<div className="grid gap-1.5 sm:col-span-2">
				<Label>Verification code</Label>
				<InputOTP maxLength={4} value="2480" onChange={() => {}}>
					<InputOTPGroup>
						<InputOTPSlot index={0} />
						<InputOTPSlot index={1} />
						<InputOTPSlot index={2} />
						<InputOTPSlot index={3} />
					</InputOTPGroup>
				</InputOTP>
			</div>

			<label className="text-body-sm flex items-center gap-2 sm:col-span-2">
				<Checkbox defaultChecked /> Email me product updates
			</label>

			<div className="flex items-center gap-3 sm:col-span-2">
				<StatusButton
					type="button"
					status={status}
					spinDelay={{ delay: 0, minDuration: 0 }}
					onClick={submit}
				>
					Create account
				</StatusButton>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="text-muted-foreground text-body-2xs">
								Why email?
							</span>
						</TooltipTrigger>
						<TooltipContent>We only use it to send your receipt.</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
		</div>
	)
}

/**
 * Group the styleguide specimens into one slide per `group`, rendered from the
 * specimens themselves — so the playground can never drift from the shipping
 * components (adding/removing a specimen group flows through automatically).
 */
const SPECIMEN_SLIDES: CarouselSlide[] = [
	...new Set(specimens.map((s) => s.group)),
].map((group) => ({
	id: group.toLowerCase(),
	label: group,
	content: (
		<div className="flex flex-col gap-8">
			{specimens
				.filter((s) => s.group === group)
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
				<p className="text-brand text-sm font-semibold tracking-wide uppercase">
					Live playground
				</p>
				<h2
					id="playground-heading"
					className="mt-3 text-3xl font-semibold tracking-tight text-balance"
				>
					The design system, running live
				</h2>
				<p className="text-muted-foreground mt-4 text-pretty">
					Every control below is a real, shipping component — the same ones that
					build the product. Flip through and try them.
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
