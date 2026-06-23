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
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '#app/components/ui/avatar.tsx'
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
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogOverlay,
	DialogTitle,
} from '#app/components/ui/dialog.tsx'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.tsx'
import { Field } from '#app/components/ui/field.tsx'
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from '#app/components/ui/input-otp.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { Pagination } from '#app/components/ui/pagination.tsx'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select.tsx'
import { Separator } from '#app/components/ui/separator.tsx'
import { Skeleton } from '#app/components/ui/skeleton.tsx'
import { Slider } from '#app/components/ui/slider.tsx'
import { Spinner } from '#app/components/ui/spinner.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { Switch } from '#app/components/ui/switch.tsx'
import { TagInput } from '#app/components/ui/tag-input.tsx'
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

// Team roster for the `screen-team` reference screen. The `variant` walks the
// Badge scale (Owner = primary, Admin = secondary, Member = outline) so the row
// uses the real Badge primitive instead of a hand-rolled status pill.
const teamMembers = [
	{
		name: 'Ada Lovelace',
		email: 'ada@epic.dev',
		role: 'Owner',
		initials: 'AL',
		variant: 'default',
	},
	{
		name: 'Grace Hopper',
		email: 'grace@epic.dev',
		role: 'Admin',
		initials: 'GH',
		variant: 'secondary',
	},
	{
		name: 'Alan Turing',
		email: 'alan@epic.dev',
		role: 'Member',
		initials: 'AT',
		variant: 'outline',
	},
] as const

/**
 * A representative, hand-tokenised code snippet for the code specimens. It is a
 * palette demonstration, not live pipeline output: each span carries the same
 * inline `style="color:var(--code-*)"` shape the Markdown pipeline emits
 * (`app/utils/markdown.server.ts`) onto the always-dark `--code-*` tokens, so the
 * styleguide shows the real code colours — but the tokenisation here is authored
 * by hand, not produced by Shiki.
 */
function HighlightedSnippet() {
	const tok = (color: string, italic?: boolean) => (text: string) => (
		<span style={{ color: `var(${color})`, fontStyle: italic ? 'italic' : undefined }}>
			{text}
		</span>
	)
	const kw = tok('--code-kw')
	const fn = tok('--code-fn')
	const str = tok('--code-string')
	const num = tok('--code-number')
	const com = tok('--code-comment', true)
	return (
		<code className="font-mono">
			<span className="block">{com('// render a Post body to safe HTML')}</span>
			<span className="block">
				{kw('export async function')} {fn('renderPostBody')}(markdown) {'{'}
			</span>
			<span className="block">
				{'  '}
				{kw('const')} html = {kw('await')} {fn('unified')}()
			</span>
			<span className="block">
				{'    '}.{fn('use')}(remarkParse).{fn('use')}(remarkGfm).{fn('process')}(markdown)
			</span>
			<span className="block">
				{'  '}
				{kw('return')} {fn('String')}(html) {com('// ')}
				{num('200')}
			</span>
			<span className="block">{'}'}</span>
			<span className="block"> </span>
			<span className="block">{str("'highlighted, sanitised, cached on read'")}</span>
		</code>
	)
}

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
		name: 'avatar',
		group: 'Surfaces',
		subtitle: 'image with initials fallback — sized via utility classes',
		viewport: { width: 480, height: 160 },
		render: () => (
			<div className="flex items-center gap-6">
				{/* Image present — loads to a photo. */}
				<Avatar>
					<AvatarImage src="/img/user.png" alt="Ada Lovelace" />
					<AvatarFallback>AL</AvatarFallback>
				</Avatar>
				{/* No image source — degrades to initials, not a broken-image glyph. */}
				<Avatar>
					<AvatarFallback>EM</AvatarFallback>
				</Avatar>
				{/* Sized up via a utility class on the root. */}
				<Avatar className="size-16">
					<AvatarFallback className="text-lg">GR</AvatarFallback>
				</Avatar>
			</div>
		),
	},
	{
		name: 'separator',
		group: 'Surfaces',
		subtitle: 'plain rule / labeled ("or continue with") / vertical',
		viewport: { width: 480, height: 220 },
		render: () => (
			<div className="flex max-w-sm flex-col gap-6">
				{/* Plain rule — divides stacked settings sections. */}
				<div className="flex flex-col gap-3">
					<span className="text-body-sm text-muted-foreground">
						Account details
					</span>
					<Separator />
					<span className="text-body-sm text-muted-foreground">
						Danger zone
					</span>
				</div>
				{/* Labeled variant — sits between the auth email form and the
				    OAuth/passkey button rows. */}
				<Separator label="or continue with" />
				{/* Vertical rule — inline divider between two actions. */}
				<div className="flex h-5 items-center gap-3">
					<span className="text-body-sm text-muted-foreground">Edit</span>
					<Separator orientation="vertical" />
					<span className="text-body-sm text-muted-foreground">Delete</span>
				</div>
			</div>
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
		name: 'switch',
		group: 'Forms',
		subtitle: 'off / on / disabled / dark-mode toggle (sun · switch · moon)',
		viewport: { width: 480, height: 240 },
		render: () => (
			<div className="flex flex-col gap-4">
				<div className="flex items-center gap-2">
					<Switch id="sg-sw-off" />
					<Label htmlFor="sg-sw-off">Off</Label>
				</div>
				<div className="flex items-center gap-2">
					<Switch id="sg-sw-on" defaultChecked />
					<Label htmlFor="sg-sw-on">On</Label>
				</div>
				<div className="flex items-center gap-2">
					<Switch id="sg-sw-disabled" disabled />
					<Label htmlFor="sg-sw-disabled">Disabled</Label>
				</div>
				{/* Dark-mode toggle composition: sun/moon glyphs flank a labelled
				    Switch. Icon isn't part of the curated bundle, so the glyphs are
				    drawn inline (mirroring the app's sun/moon sprite). */}
				<div className="flex items-center gap-3">
					<span className="text-muted-foreground" aria-hidden>
						<svg viewBox="0 0 24 24" fill="none" className="size-4">
							<circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
							<path
								d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
							/>
						</svg>
					</span>
					<Switch aria-label="Dark mode" defaultChecked />
					<span className="text-muted-foreground" aria-hidden>
						<svg viewBox="0 0 24 24" fill="none" className="size-4">
							<path
								d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinejoin="round"
							/>
						</svg>
					</span>
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
		subtitle: 'single / gradient track / range + value / Field-paired / invalid',
		viewport: { width: 480, height: 420 },
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
				<Slider
					defaultValue={[20, 80]}
					min={0}
					max={100}
					showValue
					aria-label="Price range"
				/>
				<Field label="Volume" htmlFor="sg-volume">
					<Slider defaultValue={60} min={0} max={100} showValue />
				</Field>
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
		name: 'pagination',
		group: 'Navigation',
		subtitle: 'page 1 (prev disabled) / middle (ellipsis both sides) / last',
		viewport: { width: 480, height: 220 },
		render: () => (
			<div className="flex flex-col gap-6">
				<Pagination page={1} pageCount={8} getPageHref={(p) => `#page-${p}`} />
				<Pagination page={5} pageCount={10} getPageHref={(p) => `#page-${p}`} />
				<Pagination page={8} pageCount={8} getPageHref={(p) => `#page-${p}`} />
			</div>
		),
	},
	{
		name: 'tag-input',
		group: 'Forms',
		subtitle:
			'resolve-or-create multi-select — empty / with chips (focus + type to open the menu)',
		viewport: { width: 480, height: 240 },
		render: () => (
			<div className="flex w-full max-w-sm flex-col gap-6">
				{/* Empty — placeholder visible; focus + type to open the suggestion
				    menu with its "Create «query»" row. */}
				<TagInput aria-label="Tags (empty)" suggestions={['React', 'Remix', 'CSS']} />
				{/* Populated — each tag is a removable chip on --secondary. */}
				<TagInput
					aria-label="Tags (with chips)"
					defaultValue={['React', 'TypeScript']}
					suggestions={['React', 'Remix', 'CSS', 'TypeScript']}
				/>
			</div>
		),
	},
	{
		name: 'select',
		group: 'Forms',
		subtitle: 'trigger matches Input — with value / Field-paired / invalid',
		// Rendered closed (click to open the real panel). Unlike Dialog / DropdownMenu,
		// Radix Select has no `modal={false}` escape — its open content is always wrapped
		// in react-remove-scroll, so an always-open specimen would lock the whole
		// styleguide page's scroll. The open panel (groups, selected check, separator) is
		// snapshotted from the isolated `.design-sync/previews/Select.tsx` instead.
		viewport: { width: 480, height: 320 },
		render: () => (
			<div className="flex w-full max-w-sm flex-col gap-6">
				<Select defaultValue="medium">
					<SelectTrigger aria-label="Size">
						<SelectValue placeholder="Select a size" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="small">Small</SelectItem>
						<SelectItem value="medium">Medium</SelectItem>
						<SelectItem value="large">Large</SelectItem>
					</SelectContent>
				</Select>
				<Field label="Plan" htmlFor="sg-plan">
					<Select>
						<SelectTrigger>
							<SelectValue placeholder="Choose a plan" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="free">Free</SelectItem>
							<SelectItem value="pro">Pro</SelectItem>
						</SelectContent>
					</Select>
				</Field>
				<div className="flex flex-col gap-1">
					<Select>
						<SelectTrigger aria-invalid aria-label="Country">
							<SelectValue placeholder="Select a country" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ch">Switzerland</SelectItem>
							<SelectItem value="de">Germany</SelectItem>
						</SelectContent>
					</Select>
					<p className="text-error-text text-body-2xs">This field is required.</p>
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
		name: 'accordion-multiple',
		group: 'Disclosure',
		subtitle: 'type="multiple" — several panels open at once, one disabled',
		viewport: { width: 560, height: 320 },
		render: () => (
			<Accordion
				type="multiple"
				defaultValue={['shipping', 'returns']}
				className="w-full"
			>
				<AccordionItem value="shipping">
					<AccordionTrigger>How fast is shipping?</AccordionTrigger>
					<AccordionContent>
						Orders ship within two business days; tracking follows by email.
					</AccordionContent>
				</AccordionItem>
				<AccordionItem value="returns">
					<AccordionTrigger>What is the return window?</AccordionTrigger>
					<AccordionContent>
						Thirty days, no questions asked — both panels stay open at once
						because type="multiple" never auto-collapses siblings.
					</AccordionContent>
				</AccordionItem>
				<AccordionItem value="enterprise" disabled>
					<AccordionTrigger>Enterprise plans (coming soon)</AccordionTrigger>
					<AccordionContent>
						A disabled item renders dimmed and is skipped by keyboard focus.
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
	{
		name: 'command-loading',
		group: 'Overlays',
		subtitle: 'pending remote source — Skeleton/Spinner placeholders',
		viewport: { width: 560, height: 280 },
		// `loading` paints Skeleton rows + a Spinner instead of the empty/no-results
		// state, so an in-flight fetch never reads as "No results found.".
		render: () => <CommandPalette commands={[]} loading />,
	},
	{
		name: 'dialog',
		group: 'Overlays',
		subtitle: 'modal overlay — title, description, close actions',
		viewport: { width: 560, height: 320 },
		// Rendered contained: the overlay/content are positioned `absolute` within
		// this `relative` box (and modal={false}) so the static specimen shows the
		// dialog surface in place, without a full-screen portal that would lock and
		// dim the whole styleguide page.
		render: () => (
			<div className="relative flex h-72 items-center justify-center overflow-hidden rounded-lg">
				<Dialog open modal={false}>
					<DialogOverlay className="absolute" />
					<DialogContent className="absolute w-[26rem]">
						<DialogTitle>Delete project</DialogTitle>
						<DialogDescription className="mt-2">
							This permanently removes the project and all of its data. This
							action cannot be undone.
						</DialogDescription>
						<div className="mt-6 flex justify-end gap-2">
							<DialogClose asChild>
								<Button variant="outline">Cancel</Button>
							</DialogClose>
							<DialogClose asChild>
								<Button variant="destructive">Delete</Button>
							</DialogClose>
						</div>
					</DialogContent>
				</Dialog>
			</div>
		),
	},

	// --- Reference screens -----------------------------------------------------
	//
	// The four `improove-001` handoff screens, rebuilt from real primitives only.
	// In the design exploration each hand-rolled the missing pieces (Field, Card,
	// Badge, Avatar, Skeleton, Alert) with bespoke markup; here every one is the
	// shipping component, so these double as proof that no hand-rolled primitive
	// remains and as the acceptance reference snapshotted to Claude Design.
	{
		name: 'screen-auth',
		group: 'Reference screens',
		subtitle: 'sign in — Card + Field + Checkbox + Button',
		viewport: { width: 420, height: 480 },
		render: () => (
			<Card className="mx-auto w-full max-w-sm">
				<CardHeader>
					<CardTitle>Welcome back</CardTitle>
					<CardDescription>Sign in to your account</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-5">
					<Field label="Email" htmlFor="screen-auth-email">
						<Input
							id="screen-auth-email"
							type="email"
							placeholder="you@example.com"
						/>
					</Field>
					<Field label="Password" htmlFor="screen-auth-password">
						<Input
							id="screen-auth-password"
							type="password"
							placeholder="••••••••"
						/>
					</Field>
					<div className="flex items-center gap-2">
						<Checkbox id="screen-auth-remember" defaultChecked />
						<Label htmlFor="screen-auth-remember">Remember me</Label>
					</div>
				</CardContent>
				<CardFooter>
					<Button size="wide">Sign in</Button>
				</CardFooter>
			</Card>
		),
	},
	{
		name: 'screen-settings',
		group: 'Reference screens',
		subtitle: 'profile + save bar — Card + Field + StatusButton',
		viewport: { width: 460, height: 480 },
		render: () => (
			<div className="mx-auto flex w-full max-w-md flex-col gap-3">
				<Card>
					<CardHeader>
						<CardTitle>Profile</CardTitle>
						<CardDescription>Update your public details.</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-5">
						<Field label="Display name" htmlFor="screen-settings-name">
							<Input id="screen-settings-name" defaultValue="Ada Lovelace" />
						</Field>
						<Field label="Bio" htmlFor="screen-settings-bio">
							<Textarea
								id="screen-settings-bio"
								rows={3}
								defaultValue="Mathematician. First programmer."
							/>
						</Field>
					</CardContent>
				</Card>
				{/* Save bar: a layout strip, not a primitive — styled with tokens only. */}
				<div className="border-border bg-card flex items-center justify-between rounded-lg border px-4 py-3">
					<span className="text-muted-foreground text-body-sm">
						Unsaved changes
					</span>
					<div className="flex gap-2">
						<Button variant="ghost">Discard</Button>
						<StatusButton status="idle">Save</StatusButton>
					</div>
				</div>
			</div>
		),
	},
	{
		name: 'screen-team',
		group: 'Reference screens',
		subtitle: 'team rows — Avatar + Badge + DropdownMenu row actions',
		viewport: { width: 480, height: 280 },
		render: () => (
			<div className="mx-auto flex w-full max-w-md flex-col gap-1">
				{teamMembers.map(({ name, email, role, initials, variant }) => (
					<div
						key={email}
						className="hover:bg-muted/60 flex items-center justify-between rounded-md px-2 py-2"
					>
						<div className="flex items-center gap-3">
							<Avatar>
								<AvatarFallback>{initials}</AvatarFallback>
							</Avatar>
							<div className="flex flex-col">
								<span className="text-body-sm font-medium">{name}</span>
								<span className="text-muted-foreground text-body-2xs">
									{email}
								</span>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<Badge variant={variant}>{role}</Badge>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label={`Actions for ${name}`}
									>
										<span aria-hidden>⋯</span>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									<DropdownMenuItem>View profile</DropdownMenuItem>
									<DropdownMenuItem>Change role</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem>Remove</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				))}
			</div>
		),
	},
	{
		name: 'screen-states',
		group: 'Reference screens',
		subtitle: 'empty · error · loading — Button + Alert + Skeleton',
		viewport: { width: 460, height: 520 },
		render: () => (
			<div className="mx-auto flex w-full max-w-md flex-col gap-4">
				{/* Empty */}
				<div className="border-border flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center">
					<div className="bg-muted text-muted-foreground mb-1 flex size-10 items-center justify-center rounded-full">
						<span aria-hidden className="text-body-lg">
							+
						</span>
					</div>
					<span className="text-body-sm font-medium">No projects yet</span>
					<span className="text-muted-foreground text-body-2xs">
						Create your first project to get started.
					</span>
					<Button className="mt-2">New project</Button>
				</div>
				{/* Error */}
				<Alert tone="error">
					<AlertTitle>Couldn't load projects.</AlertTitle>
					<AlertDescription>
						Check your connection and try again.
					</AlertDescription>
				</Alert>
				{/* Loading */}
				<Card>
					<CardContent className="flex flex-col gap-3">
						<Skeleton className="h-4 w-2/5" />
						<Skeleton className="h-4 w-5/6" />
						<Skeleton className="h-4 w-3/4" />
					</CardContent>
				</Card>
			</div>
		),
	},
	{
		name: 'code-block',
		group: 'Code',
		subtitle: 'always-dark Shiki surface, traffic-light caption (ADR 063)',
		viewport: { width: 720, height: 300 },
		// The block chrome the article + preview wrap around the pipeline's
		// highlighted `<pre>`: 0.7rem radius, 1px --code-border, a traffic-light
		// caption bar on --code-bg-2. The surface stays dark on any page theme
		// because every colour is a fixed --code-* token.
		render: () => (
			<div className="overflow-hidden rounded-[0.7rem] border border-[var(--code-border)] bg-[var(--code-bg)]">
				<div className="flex items-center gap-2 border-b border-[var(--code-border)] bg-[var(--code-bg-2)] px-4 py-2.5">
					<span className="size-3 rounded-full bg-[var(--code-comment)]" />
					<span className="size-3 rounded-full bg-[var(--code-comment)]" />
					<span className="size-3 rounded-full bg-[var(--code-comment)]" />
					<span className="ml-2 font-mono text-xs text-[var(--code-comment)]">
						markdown.server.ts
					</span>
				</div>
				<pre className="overflow-x-auto p-4 text-sm leading-relaxed text-[var(--code-fg)]">
					<HighlightedSnippet />
				</pre>
			</div>
		),
	},
	{
		name: 'prose-article',
		group: 'Type',
		subtitle: 'long-form reading ramp — 68ch measure, em-relative headings (ADR 064)',
		viewport: { width: 720, height: 620 },
		// The scoped `.prose` ramp rendered Markdown flows into. Exercises the
		// heading ramp, body rhythm, brand-tinted links + markers, blockquote
		// rule, the inline-code chip, and a fenced code block styled by `.prose
		// pre`. Reuses existing colour tokens (ADR 064) — no new colours.
		render: () => (
			<article className="prose">
				<h2>Render on read, cached</h2>
				<p>
					A post stores raw Markdown as the single source of truth. The loader
					renders it to safe HTML on read and caches the result, so an article
					re-renders only when its body changes.
				</p>
				<p>
					Inline spans like <code>renderPostBody()</code> sit on a soft, bordered
					chip, while links to the{' '}
					<a href="/blog">feed</a> pick up the brand accent.
				</p>
				<h3>What the pipeline guarantees</h3>
				<ul>
					<li>GFM tables, headings, and lists render predictably.</li>
					<li>Author HTML is sanitised before highlighting runs.</li>
					<li>Code blocks paint onto the always-dark code palette.</li>
				</ul>
				<blockquote>
					Raw Markdown is the source of truth; rendered HTML is never persisted.
				</blockquote>
				<pre>
					<HighlightedSnippet />
				</pre>
			</article>
		),
	},
]
