import * as SeparatorPrimitive from '@radix-ui/react-separator'
import * as React from 'react'

import { cn } from '#app/utils/misc.tsx'

/**
 * Separator — a Foundation component (ADR 019) on the Radix base. The plain
 * rule is a 1px `bg-border` line that carries `role="separator"` (and
 * `aria-orientation` when vertical) for free; it divides settings sections.
 *
 * Pass a `label` to get the composed labeled variant ("or continue with") — a
 * flex row of `flex-1` hairline · centered uppercase muted label · `flex-1`
 * hairline, with the flanking rules marked decorative so the label is the only
 * thing announced. It sits between the auth email form and the OAuth/passkey
 * button rows. Tokens only (`--border`, `--muted-foreground`).
 */
const Separator = ({
	className,
	orientation = 'horizontal',
	label,
	...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root> & {
	/** When set, renders the labeled variant (hairline · label · hairline). */
	label?: React.ReactNode
}) => {
	if (label != null) {
		return (
			<div
				data-slot="separator-labeled"
				className={cn('flex items-center gap-3', className)}
			>
				<SeparatorPrimitive.Root
					decorative
					className="bg-border h-px flex-1"
				/>
				<span className="text-muted-foreground text-body-2xs font-medium tracking-wide uppercase">
					{label}
				</span>
				<SeparatorPrimitive.Root
					decorative
					className="bg-border h-px flex-1"
				/>
			</div>
		)
	}

	return (
		<SeparatorPrimitive.Root
			data-slot="separator"
			orientation={orientation}
			className={cn(
				'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
				className,
			)}
			{...props}
		/>
	)
}

export { Separator }
