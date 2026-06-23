import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '#app/utils/misc.tsx'

const badgeVariants = cva(
	'inline-flex items-center rounded-full border px-2.5 py-0.5 text-body-2xs font-medium',
	{
		variants: {
			variant: {
				default: 'border-transparent bg-primary text-primary-foreground',
				secondary: 'border-transparent bg-secondary text-secondary-foreground',
				destructive:
					'border-transparent bg-destructive text-destructive-foreground',
				outline: 'border-border text-foreground',
				brand: 'border-transparent bg-brand-soft text-brand',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
)

export type BadgeVariant = VariantProps<typeof badgeVariants>

const Badge = ({
	className,
	variant,
	dot = false,
	children,
	...props
}: React.ComponentProps<'span'> &
	BadgeVariant & {
		/** Render a leading status dot that tracks the variant's text color. */
		dot?: boolean
	}) => (
	<span
		data-slot="badge"
		className={cn(badgeVariants({ variant, className }), dot && 'gap-1.5')}
		{...props}
	>
		{dot ? (
			<span
				data-slot="badge-dot"
				aria-hidden="true"
				className="size-1.5 shrink-0 rounded-full bg-current"
			/>
		) : null}
		{children}
	</span>
)

export { Badge, badgeVariants }
