import { type ComponentProps } from 'react'
import { cn } from '#app/utils/misc.tsx'
import { Icon } from './icon.tsx'

/** Marker for a collapsed gap of pages in {@link getPaginationRange}. */
export const PAGINATION_ELLIPSIS = 'ellipsis' as const

/** One slot in the rendered pager: a page number, or a collapsed gap. */
export type PaginationItem = number | typeof PAGINATION_ELLIPSIS

/**
 * Compute the visible page window: always the **first** and **last** page plus
 * the **current ± 1**, with the remaining runs collapsed to a single
 * {@link PAGINATION_ELLIPSIS}. A gap of exactly one page is never collapsed
 * (showing "1 … 3" when "1 2 3" fits would be silly), so an ellipsis only
 * appears where it hides two or more pages. `page` is clamped into
 * `[1, pageCount]` so an out-of-range query string still renders a sane window.
 */
export function getPaginationRange(
	page: number,
	pageCount: number,
): PaginationItem[] {
	if (pageCount <= 0) return []
	if (pageCount === 1) return [1]

	const current = Math.min(Math.max(1, Math.floor(page)), pageCount)
	const shown = [1, pageCount, current - 1, current, current + 1]
		.filter((n) => n >= 1 && n <= pageCount)
		.sort((a, b) => a - b)

	const items: PaginationItem[] = []
	let previous = 0
	for (const n of shown) {
		if (n === previous) continue // de-dupe overlapping window edges
		if (previous && n - previous > 1) items.push(PAGINATION_ELLIPSIS)
		items.push(n)
		previous = n
	}
	return items
}

/** Shared chip skeleton for every pager cell (numbers + prev/next controls). */
const pagerCellBase =
	'focus-cosy border-border inline-flex size-[var(--pager-size)] items-center justify-center rounded-md border text-sm'
/** Hover treatment shared by the navigable (non-active, non-disabled) cells. */
const pagerInteractive = 'hover:bg-accent hover:text-accent-foreground'

type PaginationProps = Omit<ComponentProps<'nav'>, 'children'> & {
	/** The current 1-based page. */
	page: number
	/** Total number of pages. */
	pageCount: number
	/** Map a page number to its href (e.g. `/blog?page=2`). */
	getPageHref: (page: number) => string
}

/** A prev/next control: a real link when navigable, a disabled span at an end. */
function PagerControl({
	direction,
	href,
	disabled,
}: {
	direction: 'prev' | 'next'
	href: string | undefined
	disabled: boolean
}) {
	const label = direction === 'prev' ? 'Previous page' : 'Next page'
	const icon = direction === 'prev' ? 'arrow-left' : 'arrow-right'
	const className = cn(
		pagerCellBase,
		disabled
			? 'text-muted-foreground pointer-events-none opacity-40'
			: pagerInteractive,
	)
	// A disabled control is a non-interactive span (links can't be `disabled`);
	// `aria-disabled` announces the state while it stays in the tab/reading order.
	if (disabled) {
		return (
			<span aria-label={label} aria-disabled="true" className={className}>
				<Icon name={icon} />
			</span>
		)
	}
	return (
		<a aria-label={label} href={href} className={className}>
			<Icon name={icon} />
		</a>
	)
}

/**
 * Pagination — a numeric, link-based pager for server-paginated feeds (the
 * `/blog` index and tag archives). Real `<a>` links keep deep pages crawlable
 * and shareable; the consumer owns the URL shape via {@link PaginationProps.getPageHref}.
 *
 * The visible window comes from {@link getPaginationRange} (first, last,
 * current ± 1, gaps as an ellipsis). The active page is marked
 * `aria-current="page"` on `--brand`; prev/next disable at the ends. The whole
 * control is wrapped in `<nav aria-label="Pagination">`. A lone page renders
 * nothing. Sizes from the `--pager-size` token; colors from
 * `--border`/`--accent`/`--brand` only.
 */
export function Pagination({
	page,
	pageCount,
	getPageHref,
	className,
	...props
}: PaginationProps) {
	if (pageCount <= 1) return null
	const items = getPaginationRange(page, pageCount)

	return (
		<nav
			aria-label="Pagination"
			className={cn('flex items-center justify-center gap-1.5', className)}
			{...props}
		>
			<PagerControl
				direction="prev"
				href={page > 1 ? getPageHref(page - 1) : undefined}
				disabled={page <= 1}
			/>
			{items.map((item, index) =>
				item === PAGINATION_ELLIPSIS ? (
					<span
						key={`ellipsis-${index}`}
						aria-hidden="true"
						className="text-muted-foreground inline-flex size-[var(--pager-size)] items-center justify-center text-sm"
					>
						…
					</span>
				) : (
					<a
						key={item}
						href={getPageHref(item)}
						aria-current={item === page ? 'page' : undefined}
						className={cn(
							pagerCellBase,
							'tabular-nums',
							item === page
								? 'bg-brand text-primary-foreground border-transparent font-semibold'
								: pagerInteractive,
						)}
					>
						{item}
					</a>
				),
			)}
			<PagerControl
				direction="next"
				href={page < pageCount ? getPageHref(page + 1) : undefined}
				disabled={page >= pageCount}
			/>
		</nav>
	)
}
