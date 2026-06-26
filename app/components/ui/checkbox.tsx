import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as React from 'react'

import { cn } from '#app/utils/misc.tsx'

export type CheckboxProps = Omit<
	React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
	'type'
> & {
	type?: string
}

const Checkbox = ({
	className,
	...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) => (
	<CheckboxPrimitive.Root
		data-slot="checkbox"
		className={cn(
			'focus-cosy peer border-input data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground aria-[invalid]:border-input-invalid size-4 shrink-0 rounded-sm border disabled:cursor-not-allowed disabled:opacity-50',
			className,
		)}
		{...props}
	>
		<CheckboxPrimitive.Indicator
			data-slot="checkbox-indicator"
			className={cn('flex items-center justify-center text-current')}
		>
			<svg viewBox="0 0 8 8">
				<path
					d="M1,4 L3,6 L7,2"
					stroke="currentcolor"
					strokeWidth="1"
					fill="none"
				/>
			</svg>
		</CheckboxPrimitive.Indicator>
	</CheckboxPrimitive.Root>
)

export { Checkbox }
