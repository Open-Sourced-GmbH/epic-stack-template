import { Link } from 'react-router'
import { cn } from '#app/utils/misc.tsx'

/**
 * The canonical "Open Sourced" brand lockup: a brand-tile glyph (▲ on a
 * `bg-brand` tile) beside the stacked `open`/`sourced` wordmark. It is the
 * single mark across every chrome that shows the brand — the universal navbar
 * (AppShell) and the marketing footer — unifying what used to be a text-only
 * wordmark plus a separate inline "Pine" glyph (ADR-068).
 *
 * Links home and splits on hover (`open` drifts left, `sourced` drifts right);
 * the animation respects `prefers-reduced-motion` via the global motion reset.
 *
 * `hideWordmarkOnMobile` collapses the lockup to the tile alone below `md` (the
 * navbar's `marketing`/`full` density); the tile always shows. The `minimal`
 * auth navbar and the footer keep the wordmark at every width (the default).
 */
export function Logo({
	className,
	hideWordmarkOnMobile = false,
}: {
	className?: string
	hideWordmarkOnMobile?: boolean
}) {
	return (
		<Link
			to="/"
			aria-label="Open Sourced home"
			title="Zur Startseite"
			className={cn('group flex w-fit items-center gap-2.5', className)}
		>
			<span
				aria-hidden="true"
				className="bg-brand text-primary-foreground grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold"
			>
				▲
			</span>
			<span
				className={cn(
					'grid leading-snug',
					hideWordmarkOnMobile && 'hidden md:grid',
				)}
			>
				<span className="text-foreground text-sm font-bold tracking-tight transition group-hover:-translate-x-0.5">
					open
				</span>
				<span className="text-muted-foreground text-[0.625rem] font-semibold tracking-[0.2em] uppercase transition group-hover:translate-x-0.5">
					sourced
				</span>
			</span>
		</Link>
	)
}
