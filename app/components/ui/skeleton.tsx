import { type ComponentProps } from 'react'
import { cn } from '#app/utils/misc.tsx'

/**
 * Skeleton — a muted, pulsing placeholder for loading/empty states. Size and
 * shape it with utility classes (`h-4 w-32`, `rounded-full`, …); the base only
 * supplies the `bg-muted` fill, a default `rounded`, and the pulse animation,
 * which is dropped under `prefers-reduced-motion` (`motion-reduce:animate-none`).
 * Tokens only — no hardcoded colors. Backs any loading state (e.g. the
 * CommandPalette async results).
 */
function Skeleton({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot="skeleton"
			className={cn(
				'animate-pulse rounded bg-muted motion-reduce:animate-none',
				className,
			)}
			{...props}
		/>
	)
}

export { Skeleton }
