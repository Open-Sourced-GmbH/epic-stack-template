import * as SwitchPrimitive from '@radix-ui/react-switch'
import * as React from 'react'

import { cn } from '#app/utils/misc.tsx'

/**
 * Switch — a Foundation component (ADR 019) on the Radix base, so `role="switch"`,
 * `aria-checked`, and keyboard operation (Space/Enter) come for free. Styled with
 * design tokens only: the track is `bg-muted` when off and `bg-brand` when on, the
 * thumb is a white pill that slides on a ~200ms transition (dropped under
 * `prefers-reduced-motion`), `disabled` dims to 50%, and focus-visible takes the
 * shared cosy-focus halo.
 *
 * Controlled via `checked` + `onCheckedChange`, or uncontrolled via
 * `defaultChecked`. It powers the in-shell dark-mode toggle and the product-email
 * preference; compose it with a label + sun/moon `Icon` for the theme toggle.
 */
const Switch = ({
	className,
	...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) => (
	<SwitchPrimitive.Root
		data-slot="switch"
		className={cn(
			'focus-cosy bg-muted data-[state=checked]:bg-brand peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
			className,
		)}
		{...props}
	>
		<SwitchPrimitive.Thumb
			data-slot="switch-thumb"
			className="bg-background pointer-events-none block size-5 rounded-full shadow-sm ring-0 transition-transform duration-200 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5 motion-reduce:transition-none"
		/>
	</SwitchPrimitive.Root>
)

export { Switch }
