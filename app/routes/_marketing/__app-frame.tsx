import { type ReactNode } from 'react'
import { cn } from '#app/utils/misc.tsx'

/**
 * Browser-chrome primitive (marketing-local). Wraps content in a faux app
 * window — traffic-light dots + an address bar — so demos read as "a real app".
 * Tokens only; purely presentational, so the chrome is `aria-hidden` and the
 * `url` is decorative.
 */
export function AppFrame({
	url,
	children,
	className,
}: {
	url: string
	children: ReactNode
	className?: string
}) {
	return (
		<div
			className={cn(
				'border-border bg-card overflow-hidden rounded-xl border shadow-sm',
				className,
			)}
		>
			<div className="border-border bg-muted/40 flex items-center gap-3 border-b px-4 py-3">
				<div aria-hidden className="flex gap-1.5">
					<span className="bg-muted-foreground/30 h-3 w-3 rounded-full" />
					<span className="bg-muted-foreground/30 h-3 w-3 rounded-full" />
					<span className="bg-muted-foreground/30 h-3 w-3 rounded-full" />
				</div>
				<div className="bg-background text-muted-foreground text-body-2xs border-border mx-auto flex max-w-[60%] min-w-0 items-center gap-1.5 truncate rounded-md border px-3 py-1">
					<span
						aria-hidden
						className="bg-muted-foreground/40 h-2 w-2 shrink-0 rounded-full"
					/>
					<span className="truncate">{url}</span>
				</div>
			</div>
			<div className="bg-background p-5">{children}</div>
		</div>
	)
}
