import { type ReactNode } from 'react'
import { toast } from 'sonner'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '#app/components/ui/accordion.tsx'
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from '#app/components/ui/alert.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Checkbox } from '#app/components/ui/checkbox.tsx'
import { type Command } from '#app/components/ui/command.matcher.ts'
import { CommandPalette } from '#app/components/ui/command.tsx'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.tsx'
import { Field } from '#app/components/ui/field.tsx'
import { Input } from '#app/components/ui/input.tsx'
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from '#app/components/ui/input-otp.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { Skeleton } from '#app/components/ui/skeleton.tsx'
import { Slider } from '#app/components/ui/slider.tsx'
import { Spinner } from '#app/components/ui/spinner.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { Textarea } from '#app/components/ui/textarea.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'

/**
 * A styleguide specimen: one card rendered by the `/styleguide` route and
 * snapshotted into the published Claude Design bundle (see
 * `scripts/snapshot-styleguide.ts`). This module is the single source of
 * truth — both the live route and the snapshot consume it, so the published
 * design system can never drift from the real components.
 *
 * `render()` must use the real `#app/components/ui/*` components and only
 * design tokens (never hardcoded colors/fonts/radii) so the specimen stays
 * faithful to what ships.
 */
export type Specimen = {
	/** kebab-case id; becomes the snapshot filename and the Design card name. */
	name: string
	/** Section label in the Design System pane (e.g. "Colors", "Forms"). */
	group: string
	/** Short note on what variants are shown. */
	subtitle?: string
	/** Card dimensions in the Design System pane. */
	viewport: { width: number; height?: number }
	render: () => ReactNode
}

// --- Foundations: color tokens ------------------------------------------------

/**
 * The token catalogs below (`semanticColors`, `typeScale`, `radii`) are the
 * exported source of truth for the foundation specimens. A drift test
 * (`specimens.test.ts`) asserts they stay in sync with the tokens defined in
 * `app/styles/tailwind.css`, so adding/removing a token there fails CI until
 * the styleguide reflects it (or it is explicitly listed as not-shown).
 */
export const semanticColors: Array<{ bg: string; fg?: string; label: string }> =
	[
		{ bg: 'background', fg: 'foreground', label: 'background' },
		{ bg: 'card', fg: 'card-foreground', label: 'card' },
		{ bg: 'popover', fg: 'popover-foreground', label: 'popover' },
		{ bg: 'primary', fg: 'primary-foreground', label: 'primary' },
		{ bg: 'secondary', fg: 'secondary-foreground', label: 'secondary' },
		{ bg: 'muted', fg: 'muted-foreground', label: 'muted' },
		{ bg: 'accent', fg: 'accent-foreground', label: 'accent' },
		{ bg: 'destructive', fg: 'destructive-foreground', label: 'destructive' },
		{ bg: 'border', label: 'border' },
		{ bg: 'input', label: 'input' },
		{ bg: 'ring', label: 'ring' },
	]

// Static class names so Tailwind's compiler sees every utility used here.
const swatchBg: Record<string, string> = {
	background: 'bg-background',
	card: 'bg-card',
	popover: 'bg-popover',
	primary: 'bg-primary',
	secondary: 'bg-secondary',
	muted: 'bg-muted',
	accent: 'bg-accent',
	destructive: 'bg-destructive',
	border: 'bg-border',
	input: 'bg-input',
	ring: 'bg-ring',
}
const swatchFg: Record<string, string> = {
	foreground: 'text-foreground',
	'card-foreground': 'text-card-foreground',
	'popover-foreground': 'text-popover-foreground',
	'primary-foreground': 'text-primary-foreground',
	'secondary-foreground': 'text-secondary-foreground',
	'muted-foreground': 'text-muted-foreground',
	'accent-foreground': 'text-accent-foreground',
	'destructive-foreground': 'text-destructive-foreground',
}

// --- Foundations: typography scale -------------------------------------------

export const typeScale: Array<{ cls: string; label: string }> = [
	{ cls: 'text-mega', label: 'mega' },
	{ cls: 'text-h1', label: 'h1' },
	{ cls: 'text-h2', label: 'h2' },
	{ cls: 'text-h3', label: 'h3' },
	{ cls: 'text-h4', label: 'h4' },
	{ cls: 'text-h5', label: 'h5' },
	{ cls: 'text-h6', label: 'h6' },
	{ cls: 'text-body-2xl', label: 'body-2xl' },
	{ cls: 'text-body-xl', label: 'body-xl' },
	{ cls: 'text-body-lg', label: 'body-lg' },
	{ cls: 'text-body-md', label: 'body-md' },
	{ cls: 'text-body-sm', label: 'body-sm' },
	{ cls: 'text-body-xs', label: 'body-xs' },
	{ cls: 'text-body-2xs', label: 'body-2xs' },
	{ cls: 'text-caption', label: 'caption' },
	{ cls: 'text-button', label: 'button' },
]

// --- Foundations: radii -------------------------------------------------------

export const radii: Array<{ cls: string; label: string }> = [
	{ cls: 'rounded-sm', label: 'radius-sm' },
	{ cls: 'rounded-md', label: 'radius-md' },
	{ cls: 'rounded-lg', label: 'radius-lg' },
	{ cls: 'rounded-xl', label: 'radius-xl' },
]

const buttonVariants = [
	'default',
	'destructive',
	'outline',
	'secondary',
	'ghost',
	'link',
] as const
const buttonTextSizes = ['sm', 'default', 'lg', 'pill'] as const
const buttonIconSizes = ['icon-sm', 'icon', 'icon-lg'] as const
const badgeVariants = [
	'default',
	'secondary',
	'destructive',
	'outline',
] as const
const alertTones = [
	{ tone: 'info', title: 'Heads up', body: 'A neutral, informational note.' },
	{ tone: 'success', title: 'Saved', body: 'Your changes were saved.' },
	{ tone: 'warning', title: 'Careful', body: 'This action needs attention.' },
	{
		tone: 'error',
		title: 'Something went wrong',
		body: 'We could not save your changes.',
	},
] as const

// A representative ⌘K registry for the palette specimen: Navigation / Theme /
// Help groups, a mix of `href` and `run` commands, each with a leading icon.
const commandRegistry: Command[] = [
	{ id: 'home', title: 'Home', group: 'Navigation', href: '/', icon: 'arrow-right' },
	{
		id: 'pricing',
		title: 'Pricing',
		group: 'Navigation',
		href: '/#pricing',
		icon: 'file-text',
	},
	{ id: 'work', title: 'Our work', group: 'Navigation', href: '/#work', icon: 'link-2' },
	{
		id: 'toggle-theme',
		title: 'Toggle theme',
		group: 'Theme',
		keywords: ['dark', 'light', 'appearance'],
		icon: 'sun',
		run: () => {},
	},
	{
		id: 'docs',
		title: 'Documentation',
		group: 'Help',
		href: '/docs',
		icon: 'question-mark-circled',
	},
	{
		id: 'support',
		title: 'Contact support',
		group: 'Help',
		icon: 'envelope-closed',
		run: () => {},
	},
]

// Suggested actions for the palette's empty / no-match state. Injected by the
// consumer (here, the specimen) — each fires a `sonner` toast (ADR 027) to
// demonstrate that running a command can surface feedback.
const commandEmptyActions: Command[] = [
	{
		id: 'create-project',
		title: 'Create project',
		group: 'Suggestions',
		icon: 'plus',
		run: () => toast.success('Create project'),
	},
	{
		id: 'invite',
		title: 'Invite',
		group: 'Suggestions',
		icon: 'avatar',
		run: () => toast.success('Invite teammate'),
	},
	{
		id: 'toggle-theme-empty',
		title: 'Toggle theme',
		group: 'Suggestions',
		icon: 'sun',
		run: () => toast.success('Toggle theme'),
	},
	{
		id: 'contact-support',
		title: 'Contact support',
		group: 'Suggestions',
		icon: 'question-mark-circled',
		run: () => toast.success('Contact support'),
	},
]

export const specimens: Specimen[] = [
	{
		name: 'colors',
		group: 'Colors',
		subtitle: 'Semantic tokens (light + dark)',
		viewport: { width: 720 },
		render: () => (
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
				{semanticColors.map(({ bg, fg, label }) => (
					<div
						key={label}
						className={`border-border flex h-20 flex-col justify-between rounded-md border p-3 ${swatchBg[bg]} ${fg ? swatchFg[fg] : 'text-foreground'}`}
					>
						<span className="text-body-xs font-medium">{label}</span>
						<span className="text-body-2xs opacity-70">--{bg}</span>
					</div>
				))}
			</div>
		),
	},
	{
		name: 'brand-accent',
		group: 'Colors',
		subtitle: 'Accent + brand tokens (Pine default) — drives --primary / --ring',
		viewport: { width: 720 },
		render: () => (
			<div className="flex flex-col gap-4">
				{/* The accent itself, carrying the fixed near-white --primary-foreground
				    it pairs with everywhere (ADR 062). */}
				<div className="bg-brand text-primary-foreground flex h-20 flex-col justify-between rounded-md p-3">
					<span className="text-body-xs font-medium">accent</span>
					<span className="text-body-2xs opacity-80">
						--brand → --primary / --ring
					</span>
				</div>
				<div className="grid grid-cols-3 gap-3">
					{[
						{ cls: 'bg-brand', label: 'bg-brand' },
						{ cls: 'bg-brand-soft', label: 'bg-brand-soft' },
						{ cls: 'bg-brand-glow', label: 'bg-brand-glow' },
					].map(({ cls, label }) => (
						<div key={label} className="border-border rounded-md border p-3">
							<div className={`mb-2 h-10 rounded-md ${cls}`} />
							<span className="text-body-2xs font-mono">{label}</span>
						</div>
					))}
				</div>
				<div className="flex flex-wrap items-center gap-4">
					<span className="text-brand text-body-sm font-medium">text-brand</span>
					<span className="border-brand text-body-sm rounded-md border px-3 py-1">
						border-brand
					</span>
					<span className="ring-brand text-body-sm rounded-md px-3 py-1 ring-2">
						ring-brand
					</span>
				</div>
			</div>
		),
	},
	{
		name: 'typography',
		group: 'Type',
		subtitle: 'mega → caption → button',
		viewport: { width: 720 },
		render: () => (
			<div className="flex flex-col gap-4">
				{typeScale.map(({ cls, label }) => (
					<div key={label} className="flex items-baseline gap-4">
						<span className="text-muted-foreground text-body-2xs w-20 shrink-0 font-mono">
							{label}
						</span>
						<span className={cls}>The quick brown fox</span>
					</div>
				))}
			</div>
		),
	},
	{
		name: 'radii',
		group: 'Radii',
		subtitle: 'sm / md / lg / xl',
		viewport: { width: 480, height: 200 },
		render: () => (
			<div className="flex flex-wrap gap-6">
				{radii.map(({ cls, label }) => (
					<div key={label} className="flex flex-col items-center gap-2">
						<div className={`bg-muted border-border size-16 border ${cls}`} />
						<span className="text-muted-foreground text-body-2xs font-mono">
							{label}
						</span>
					</div>
				))}
			</div>
		),
	},
	{
		name: 'button',
		group: 'Actions',
		subtitle: '6 variants',
		viewport: { width: 560 },
		render: () => (
			<div className="flex flex-wrap gap-3">
				{buttonVariants.map((variant) => (
					<Button key={variant} variant={variant}>
						{variant}
					</Button>
				))}
			</div>
		),
	},
	{
		name: 'button-sizes',
		group: 'Actions',
		subtitle: 'sm / default / lg / pill · icon-sm / icon / icon-lg',
		viewport: { width: 560, height: 200 },
		render: () => (
			<div className="flex flex-col gap-4">
				<div className="flex flex-wrap items-center gap-3">
					{buttonTextSizes.map((size) => (
						<Button key={size} size={size}>
							{size}
						</Button>
					))}
				</div>
				<div className="flex flex-wrap items-center gap-3">
					{buttonIconSizes.map((size) => (
						<Button key={size} size={size} aria-label={size}>
							<span aria-hidden>+</span>
						</Button>
					))}
				</div>
			</div>
		),
	},
	{
		name: 'status-button',
		group: 'Actions',
		subtitle: 'idle / pending / success / error',
		viewport: { width: 560, height: 160 },
		render: () => (
			<div className="flex flex-wrap items-center gap-3">
				<StatusButton status="idle">idle</StatusButton>
				<StatusButton status="pending" spinDelay={{ delay: 0, minDuration: 0 }}>
					pending
				</StatusButton>
				<StatusButton status="success">success</StatusButton>
				<StatusButton status="error">error</StatusButton>
			</div>
		),
	},
	{
		name: 'badge',
		group: 'Actions',
		subtitle: 'default / secondary / destructive / outline',
		viewport: { width: 480, height: 120 },
		render: () => (
			<div className="flex flex-wrap items-center gap-2">
				{badgeVariants.map((variant) => (
					<Badge key={variant} variant={variant}>
						{variant}
					</Badge>
				))}
			</div>
		),
	},
	{
		name: 'alert',
		group: 'Feedback',
		subtitle: 'info / success / warning / error tones',
		viewport: { width: 480, height: 360 },
		render: () => (
			<div className="flex w-full max-w-md flex-col gap-3">
				{alertTones.map(({ tone, title, body }) => (
					<Alert key={tone} tone={tone}>
						<AlertTitle>{title}</AlertTitle>
						<AlertDescription>{body}</AlertDescription>
					</Alert>
				))}
			</div>
		),
	},
	{
		name: 'spinner',
		group: 'Actions',
		subtitle: 'inline loading indicator — backs StatusButton & async states',
		viewport: { width: 480, height: 140 },
		render: () => (
			<div className="flex items-center gap-6">
				<Spinner />
				<div className="flex items-center gap-2">
					<Spinner className="size-4" title="Saving" />
					<span className="text-muted-foreground text-body-sm">Saving…</span>
				</div>
			</div>
		),
	},
	{
		name: 'skeleton',
		group: 'Actions',
		subtitle: 'pulsing placeholder for loading states — respects reduced motion',
		viewport: { width: 480, height: 140 },
		render: () => (
			<div className="flex items-center gap-4">
				<Skeleton className="size-12 rounded-full" />
				<div className="flex flex-col gap-2">
					<Skeleton className="h-4 w-48" />
					<Skeleton className="h-4 w-32" />
				</div>
			</div>
		),
	},
	{
		name: 'card',
		group: 'Surfaces',
		subtitle: 'header (title + description) / content / footer',
		viewport: { width: 480, height: 280 },
		render: () => (
			<Card className="max-w-sm">
				<CardHeader>
					<CardTitle>Upgrade your plan</CardTitle>
					<CardDescription>
						Unlock unlimited projects and priority support.
					</CardDescription>
				</CardHeader>
				<CardContent className="text-body-sm text-muted-foreground">
					You're currently on the free plan. Upgrade any time — changes apply
					immediately and you can cancel whenever you like.
				</CardContent>
				<CardFooter className="justify-end gap-3">
					<Button variant="ghost">Maybe later</Button>
					<Button>Upgrade</Button>
				</CardFooter>
			</Card>
		),
	},
	{
		name: 'input',
		group: 'Forms',
		subtitle: 'default / disabled / invalid',
		viewport: { width: 480, height: 220 },
		render: () => (
			<div className="flex max-w-sm flex-col gap-3">
				<Input placeholder="Default input" />
				<Input placeholder="Disabled" disabled />
				<Input placeholder="Invalid" aria-invalid defaultValue="bad value" />
			</div>
		),
	},
	{
		name: 'textarea',
		group: 'Forms',
		subtitle: 'default / invalid',
		viewport: { width: 480, height: 260 },
		render: () => (
			<div className="flex max-w-sm flex-col gap-3">
				<Textarea placeholder="Write something…" />
				<div className="flex flex-col gap-1">
					<Textarea aria-invalid defaultValue="too short" />
					<p className="text-error-text text-body-2xs">
						Please write at least 20 characters.
					</p>
				</div>
			</div>
		),
	},
	{
		name: 'label-field',
		group: 'Forms',
		subtitle: 'Label + Input',
		viewport: { width: 480, height: 140 },
		render: () => (
			<div className="grid max-w-sm gap-1.5">
				<Label htmlFor="sg-email">Email</Label>
				<Input id="sg-email" type="email" placeholder="you@example.com" />
			</div>
		),
	},
	{
		name: 'field',
		group: 'Forms',
		subtitle: 'Label + control + description + error — aria wired',
		viewport: { width: 480, height: 280 },
		render: () => (
			<div className="flex max-w-sm flex-col gap-5">
				<Field
					label="Email"
					htmlFor="sg-field-email"
					description="We'll only use it to send receipts."
					required
				>
					<Input
						id="sg-field-email"
						type="email"
						placeholder="you@example.com"
					/>
				</Field>
				<Field
					label="Username"
					htmlFor="sg-field-username"
					error="That username is already taken."
				>
					<Input id="sg-field-username" defaultValue="taken" />
				</Field>
			</div>
		),
	},
	{
		name: 'checkbox',
		group: 'Forms',
		subtitle: 'unchecked / checked / disabled / invalid',
		viewport: { width: 480, height: 200 },
		render: () => (
			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-2">
					<Checkbox id="sg-cb1" />
					<Label htmlFor="sg-cb1">Unchecked</Label>
				</div>
				<div className="flex items-center gap-2">
					<Checkbox id="sg-cb2" defaultChecked />
					<Label htmlFor="sg-cb2">Checked</Label>
				</div>
				<div className="flex items-center gap-2">
					<Checkbox id="sg-cb3" disabled />
					<Label htmlFor="sg-cb3">Disabled</Label>
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<Checkbox id="sg-cb4" aria-invalid />
						<Label htmlFor="sg-cb4">Accept the terms</Label>
					</div>
					<p className="text-error-text text-body-2xs">
						You must accept to continue.
					</p>
				</div>
			</div>
		),
	},
	{
		name: 'input-otp',
		group: 'Forms',
		subtitle: '6-digit, two groups + separator / invalid',
		viewport: { width: 480, height: 220 },
		render: () => (
			<div className="flex flex-col gap-4">
				<InputOTP maxLength={6} value="123456" onChange={() => {}}>
					<InputOTPGroup>
						<InputOTPSlot index={0} />
						<InputOTPSlot index={1} />
						<InputOTPSlot index={2} />
					</InputOTPGroup>
					<InputOTPSeparator />
					<InputOTPGroup>
						<InputOTPSlot index={3} />
						<InputOTPSlot index={4} />
						<InputOTPSlot index={5} />
					</InputOTPGroup>
				</InputOTP>
				<div className="flex flex-col gap-1">
					<InputOTP maxLength={6} value="000" onChange={() => {}} aria-invalid>
						<InputOTPGroup>
							<InputOTPSlot index={0} />
							<InputOTPSlot index={1} />
							<InputOTPSlot index={2} />
						</InputOTPGroup>
						<InputOTPSeparator />
						<InputOTPGroup>
							<InputOTPSlot index={3} />
							<InputOTPSlot index={4} />
							<InputOTPSlot index={5} />
						</InputOTPGroup>
					</InputOTP>
					<p className="text-error-text text-body-2xs">
						That code is incorrect.
					</p>
				</div>
			</div>
		),
	},
	{
		name: 'slider',
		group: 'Forms',
		subtitle: 'default + gradient track (oklch hue sweep) / invalid',
		viewport: { width: 480, height: 220 },
		render: () => (
			<div className="flex w-full max-w-sm flex-col gap-6">
				<Slider defaultValue={40} min={0} max={100} aria-label="Default" />
				<Slider
					defaultValue={172}
					min={0}
					max={360}
					aria-label="Hue"
					trackGradient="linear-gradient(to right, oklch(0.7 0.15 0), oklch(0.7 0.15 60), oklch(0.7 0.15 120), oklch(0.7 0.15 180), oklch(0.7 0.15 240), oklch(0.7 0.15 300), oklch(0.7 0.15 360))"
				/>
				<div className="flex flex-col gap-1">
					<Slider defaultValue={90} min={0} max={100} aria-invalid aria-label="Invalid" />
					<p className="text-error-text text-body-2xs">
						Choose a value below 80.
					</p>
				</div>
			</div>
		),
	},
	{
		name: 'dropdown-menu',
		group: 'Overlays',
		subtitle: 'label / items / separator',
		viewport: { width: 480, height: 280 },
		render: () => (
			// modal={false} so the always-open specimen doesn't engage Radix's
			// scroll-lock (react-remove-scroll), which would freeze mouse-wheel
			// scrolling of the whole styleguide page.
			<DropdownMenu open modal={false}>
				<DropdownMenuTrigger asChild>
					<Button variant="outline">Open menu</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuLabel>My account</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem>Profile</DropdownMenuItem>
					<DropdownMenuItem>Settings</DropdownMenuItem>
					<DropdownMenuItem>Log out</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	},
	{
		name: 'tooltip',
		group: 'Overlays',
		subtitle: 'open',
		viewport: { width: 480, height: 160 },
		render: () => (
			<TooltipProvider>
				<Tooltip open>
					<TooltipTrigger asChild>
						<Button variant="outline">Hover me</Button>
					</TooltipTrigger>
					<TooltipContent>Helpful hint</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		),
	},
	{
		name: 'accordion',
		group: 'Disclosure',
		subtitle: 'single-open — first item open, rest collapsed',
		viewport: { width: 560, height: 280 },
		render: () => (
			<Accordion defaultValue="item-1" className="w-full">
				<AccordionItem value="item-1">
					<AccordionTrigger>Is it accessible?</AccordionTrigger>
					<AccordionContent>
						Yes. It is built on Radix and follows the WAI-ARIA disclosure
						pattern, with full keyboard support.
					</AccordionContent>
				</AccordionItem>
				<AccordionItem value="item-2">
					<AccordionTrigger>Is it themeable?</AccordionTrigger>
					<AccordionContent>
						Yes. It is styled with design tokens only, so it follows the brand
						accent and light/dark theme automatically.
					</AccordionContent>
				</AccordionItem>
				<AccordionItem value="item-3">
					<AccordionTrigger>Does it animate?</AccordionTrigger>
					<AccordionContent>
						Yes — a grid-rows height transition, with a reduced-motion fallback.
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		),
	},
	{
		name: 'command',
		group: 'Overlays',
		subtitle: '⌘K palette — grouped results, brand-soft selection',
		viewport: { width: 560, height: 380 },
		// Rendered inline (no `open`) so the specimen snapshots without a portal;
		// the live overlay form takes `open`/`onOpenChange`.
		render: () => <CommandPalette commands={commandRegistry} />,
	},
	{
		name: 'command-empty',
		group: 'Overlays',
		subtitle: 'no-match state — suggested-action chips',
		viewport: { width: 560, height: 240 },
		// An empty registry forces the no-match state; the chips are injected.
		render: () => (
			<CommandPalette commands={[]} emptyActions={commandEmptyActions} />
		),
	},
]
