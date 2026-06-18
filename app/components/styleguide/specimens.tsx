import { type ReactNode } from 'react'
import { Button } from '#app/components/ui/button.tsx'
import { Checkbox } from '#app/components/ui/checkbox.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { Textarea } from '#app/components/ui/textarea.tsx'

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
const buttonSizes = ['sm', 'default', 'lg', 'pill'] as const

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
		subtitle: 'sm / default / lg / pill',
		viewport: { width: 560, height: 160 },
		render: () => (
			<div className="flex flex-wrap items-center gap-3">
				{buttonSizes.map((size) => (
					<Button key={size} size={size}>
						{size}
					</Button>
				))}
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
		subtitle: 'default',
		viewport: { width: 480, height: 160 },
		render: () => (
			<div className="max-w-sm">
				<Textarea placeholder="Write something…" />
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
		name: 'checkbox',
		group: 'Forms',
		subtitle: 'unchecked / checked / disabled',
		viewport: { width: 480, height: 140 },
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
			</div>
		),
	},
]
