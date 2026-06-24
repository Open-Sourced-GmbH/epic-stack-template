import { Link } from 'react-router'
import { cn } from '#app/utils/misc.tsx'

/**
 * The canonical "Open Sourced" wordmark, used as the single brand lockup across
 * every chrome that shows the wordmark: the generic app header/footer (root.tsx)
 * and the marketing header/footer. The Pine glyph (drawn inline in the auth and
 * admin shells) is the compact icon variant for those chrome-light surfaces — it
 * is intentionally not part of this wordmark.
 *
 * Links home and splits on hover (`open` drifts left, `sourced` drifts right);
 * the animation respects `prefers-reduced-motion` via the global motion reset.
 */
export function Logo({ className }: { className?: string }) {
	return (
		<Link
			to="/"
			aria-label="Open Sourced home"
			className={cn('group grid w-fit leading-snug', className)}
		>
			<span className="font-light transition group-hover:-translate-x-1">
				open
			</span>
			<span className="font-bold transition group-hover:translate-x-1">
				sourced
			</span>
		</Link>
	)
}
