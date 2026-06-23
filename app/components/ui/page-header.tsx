import * as React from 'react'

import { cn } from '#app/utils/misc.tsx'

/**
 * PageHeader — a bespoke Foundation component (ADR 019): the one page-header
 * pattern reused across all three shells (auth / settings / admin). A
 * `flex items-end justify-between` row with, on the left, an optional eyebrow
 * (`text-brand` uppercase) over the title (`text-h4`), and on the right an
 * optional actions slot (`flex gap-2`, e.g. an outline + primary button).
 *
 * The title renders as an `<h2>` by default; pass `headingLevel` to place it at
 * the right level for its shell (e.g. `1` for the auth card). Tokens only — no
 * hardcoded colors or sizes.
 */
const PageHeader = ({
	eyebrow,
	title,
	actions,
	headingLevel = 2,
	className,
	...props
}: React.ComponentProps<'div'> & {
	/** Small uppercase brand label above the title. */
	eyebrow?: React.ReactNode
	/** The page title. */
	title: React.ReactNode
	/** Trailing actions (e.g. outline + primary buttons). */
	actions?: React.ReactNode
	/** Heading level for the title. @default 2 */
	headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
}) => {
	const Heading = `h${headingLevel}` as const
	return (
		<div
			data-slot="page-header"
			className={cn('flex items-end justify-between gap-4', className)}
			{...props}
		>
			<div className="flex flex-col gap-1">
				{eyebrow != null && (
					<span className="text-brand text-sm font-semibold tracking-wide uppercase">
						{eyebrow}
					</span>
				)}
				<Heading className="text-h4">{title}</Heading>
			</div>
			{actions != null && (
				<div data-slot="page-header-actions" className="flex gap-2">
					{actions}
				</div>
			)}
		</div>
	)
}

export { PageHeader }
