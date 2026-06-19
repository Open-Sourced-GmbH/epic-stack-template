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
	...props
}: React.ComponentProps<'span'> & BadgeVariant) => (
	<span
		data-slot="badge"
		className={cn(badgeVariants({ variant, className }))}
		{...props}
	/>
)

export { Badge, badgeVariants }
