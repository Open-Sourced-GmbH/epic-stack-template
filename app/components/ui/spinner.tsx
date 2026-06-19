import { type ComponentProps } from 'react'
import { cn } from '#app/utils/misc.tsx'
import { Icon } from './icon.tsx'

/**
 * Spinner — a standalone inline loading indicator: the `update` icon spinning,
 * wrapped in a `role="status"` region so assistive tech announces the busy
 * state. The rotation is dropped under `prefers-reduced-motion`
 * (`motion-reduce:animate-none`).
 *
 * Extracted from StatusButton (which now composes it) so loading no longer
 * lives only inside the button — it backs any loading/empty state (e.g. the
 * CommandPalette async results). Tokens only.
 */
function Spinner({
	className,
	title = 'loading',
	...props
}: ComponentProps<'div'> & { title?: string }) {
	return (
		<div
			role="status"
			className={cn(
				'inline-flex size-6 items-center justify-center',
				className,
			)}
			{...props}
		>
			<Icon
				name="update"
				className="animate-spin motion-reduce:animate-none"
				title={title}
			/>
		</div>
	)
}

export { Spinner }
