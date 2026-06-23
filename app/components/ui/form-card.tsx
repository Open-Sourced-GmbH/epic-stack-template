import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '#app/utils/misc.tsx'

/**
 * The surface variants. `default` is the README card idiom (`bg-card
 * text-card-foreground border-border`); `destructive` follows the
 * destructive-zone pattern — a faint danger surface (`bg-destructive/5`) inside
 * a stronger danger hairline (`border-destructive/35`) — for "delete account"
 * style sections. Tokens only.
 */
const formCardVariants = cva('rounded-xl border', {
	variants: {
		variant: {
			default: 'bg-card text-card-foreground border-border',
			destructive: 'bg-destructive/5 text-card-foreground border-destructive/35',
		},
	},
	defaultVariants: {
		variant: 'default',
	},
})

export type FormCardVariant = NonNullable<
	VariantProps<typeof formCardVariants>['variant']
>

/**
 * FormCard — a bespoke Foundation component (ADR 019): the one card surface that
 * frames both an auth form (header optional, centered) and a settings section
 * (header with title + description). `bg-card text-card-foreground border
 * border-border` at `rounded-xl`, with an optional header (title `text-h6` +
 * optional `text-muted-foreground` description, divided from the body by a
 * border) and padded body.
 *
 * The `destructive` variant applies the destructive-zone pattern (faint danger
 * surface, stronger danger hairline, `text-destructive` title) for "delete
 * account & data" style sections. The title renders as an `<h2>` by default;
 * pass `headingLevel` to place it at the right level for its shell. Tokens
 * only — no hardcoded colors or sizes.
 */
const FormCard = ({
	title,
	description,
	variant = 'default',
	headingLevel = 2,
	className,
	children,
	...props
}: React.ComponentProps<'div'> & {
	/** Optional header title (`text-h6`). */
	title?: React.ReactNode
	/** Optional header description under the title. */
	description?: React.ReactNode
	/** Surface variant. @default 'default' */
	variant?: FormCardVariant
	/** Heading level for the title. @default 2 */
	headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
}) => {
	const Heading = `h${headingLevel}` as const
	const hasHeader = title != null || description != null
	return (
		<div
			data-slot="form-card"
			className={cn(formCardVariants({ variant }), className)}
			{...props}
		>
			{hasHeader && (
				<div
					data-slot="form-card-header"
					className="border-inherit border-b px-6 py-4"
				>
					{title != null && (
						<Heading
							className={cn(
								'text-h6',
								variant === 'destructive' && 'text-destructive',
							)}
						>
							{title}
						</Heading>
					)}
					{description != null && (
						<p className="text-muted-foreground text-body-sm mt-1">
							{description}
						</p>
					)}
				</div>
			)}
			<div data-slot="form-card-body" className="p-6">
				{children}
			</div>
		</div>
	)
}

export { FormCard, formCardVariants }
