import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '#app/utils/misc.tsx'

/**
 * Alert / Callout — a form- or page-level message in one of four tones. Tokens
 * only (no new theme values): the palette is limited to the brand, muted, and
 * destructive families, so the tones map as
 *   info    → neutral muted surface,
 *   success → brand accent surface,
 *   warning → soft destructive ramp (caution shares the danger hue),
 *   error   → destructive ramp with `--error-text` message text.
 * Compose the root with `AlertTitle` and `AlertDescription`. `error` is
 * announced assertively (`role="alert"`); the calmer tones use `role="status"`,
 * and an explicit `role` prop always wins.
 */
const alertVariants = cva(
	'relative w-full rounded-lg border px-4 py-3 text-body-sm',
	{
		variants: {
			tone: {
				info: 'border-border bg-muted text-foreground',
				success: 'border-brand bg-brand-soft text-foreground',
				warning: 'border-destructive/40 bg-destructive/5 text-foreground',
				error: 'border-destructive bg-destructive/10 text-error-text',
			},
		},
		defaultVariants: {
			tone: 'info',
		},
	},
)

export type AlertTone = NonNullable<VariantProps<typeof alertVariants>['tone']>

/** error is assertive; info/success/warning are polite status messages. */
const roleForTone: Record<AlertTone, 'alert' | 'status'> = {
	info: 'status',
	success: 'status',
	warning: 'status',
	error: 'alert',
}

function Alert({
	className,
	tone = 'info',
	role,
	...props
}: React.ComponentProps<'div'> & { tone?: AlertTone }) {
	return (
		<div
			data-slot="alert"
			role={role ?? roleForTone[tone]}
			className={cn(alertVariants({ tone }), className)}
			{...props}
		/>
	)
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="alert-title"
			className={cn('mb-1 leading-none font-medium', className)}
			{...props}
		/>
	)
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="alert-description"
			className={cn('text-body-sm [&_p]:leading-relaxed', className)}
			{...props}
		/>
	)
}

export { Alert, AlertTitle, AlertDescription, alertVariants }
