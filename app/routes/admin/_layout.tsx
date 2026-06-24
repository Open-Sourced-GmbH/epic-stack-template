import { type ReactNode } from 'react'
import { Link, Outlet, useLocation, useMatches } from 'react-router'
import { Icon, type IconName } from '#app/components/ui/icon.tsx'
import { PageHeader } from '#app/components/ui/page-header.tsx'
import { AccentSwitch } from '#app/routes/resources/accent.tsx'
import { ThemeToggle } from '#app/routes/resources/theme-switch.tsx'
import { cn } from '#app/utils/misc.tsx'
import { useOptionalRequestInfo } from '#app/utils/request-info.ts'

// The admin surfaces ship their own standalone shell (left nav rail + branded
// PageHeader), so the generic app chrome from root.tsx is suppressed here. The
// shell is purpose-built, not a fork of `_marketing/__app-frame`. It exposes the
// accent preset picker + binary theme toggle (the whole-product accent showcase,
// ADR-067 superseding ADR-062/066) — but never the marketing `ThemeCustomizer`
// dock (hue slider + cursor), which stays marketing-only.
export const handle = { hideChrome: true }

/**
 * The page-header content a routed admin surface feeds into the shell. The shell
 * owns the one `PageHeader` (eyebrow defaults to "Admin"); each surface supplies
 * its title and optional actions via `handle.adminHeader` so headings never
 * double up.
 */
export type AdminHeader = {
	eyebrow?: ReactNode
	/** The page title — a plain string (matching `PageHeader`'s `title`). */
	title: string
	actions?: ReactNode
}

type AdminHeaderHandle = { adminHeader?: AdminHeader }

const navItems: Array<{ to: string; label: string; icon: IconName }> = [
	{ to: '/admin/blog', label: 'Blog', icon: 'file-text' },
	{ to: '/admin/cache', label: 'Cache', icon: 'clock' },
]

/**
 * The "Pine Admin" logo lockup: the pine glyph in a `bg-brand` tile (the sprite
 * has no pine icon, so it's drawn inline with `currentColor`, matching the auth
 * shell) beside the wordmark. The wordmark hides when the rail collapses.
 */
function PineAdminMark() {
	return (
		<span className="flex items-center gap-2">
			<span className="bg-brand text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg shadow-sm">
				<svg viewBox="0 0 24 24" className="size-5" aria-hidden focusable="false">
					<polygon points="12,3 7,11 17,11" fill="currentColor" />
					<polygon points="12,8 6,16 18,16" fill="currentColor" />
					<rect x="11" y="15" width="2" height="5" rx="0.5" fill="currentColor" />
				</svg>
			</span>
			<span className="hidden text-body-sm font-semibold tracking-tight md:inline">
				Pine Admin
			</span>
		</span>
	)
}

/** True when `pathname` is within the nav item's section (the item or a child). */
function isActiveSection(pathname: string, to: string) {
	return pathname === to || pathname.startsWith(`${to}/`)
}

/**
 * Shared admin-shell layout for every `admin/` route. A standalone shell (no
 * marketing chrome, no accent customizer — ADR-066): a persistent left nav rail
 * (faint `bg-brand-soft` wash, `border-r`, "Pine Admin" lockup, Blog / Cache
 * items with `bg-brand` active state) and an in-shell binary theme toggle, with
 * the routed surface rendered in the content column. The shell owns the lone
 * `PageHeader`, fed per-surface via `handle.adminHeader`. URLs are unchanged —
 * this pathless layout just nests the existing routes.
 */
export default function AdminLayout() {
	const location = useLocation()
	const matches = useMatches()
	const requestInfo = useOptionalRequestInfo()
	// Deepest surface wins, so a nested route can override its parent's header.
	const adminHeader = [...matches]
		.reverse()
		.map((m) => (m.handle as AdminHeaderHandle | undefined)?.adminHeader)
		.find(Boolean)

	return (
		<div className="bg-background flex min-h-screen">
			<aside className="bg-brand-soft flex w-16 shrink-0 flex-col border-r md:w-50">
				<div className="flex h-16 items-center px-3 md:px-4">
					<PineAdminMark />
				</div>
				<nav
					aria-label="Admin"
					className="flex flex-1 flex-col gap-1 px-2 py-2"
				>
					{navItems.map((item) => {
						const active = isActiveSection(location.pathname, item.to)
						return (
							<Link
								key={item.to}
								to={item.to}
								aria-current={active ? 'page' : undefined}
								className={cn(
									'flex items-center gap-3 rounded-md px-3 py-2 text-body-sm font-medium transition-colors',
									active
										? 'bg-brand text-primary-foreground'
										: 'text-muted-foreground hover:bg-background hover:text-foreground',
								)}
							>
								<Icon name={item.icon} className="size-4 shrink-0" />
								<span className="hidden md:inline">{item.label}</span>
							</Link>
						)
					})}
				</nav>
				<div className="flex flex-col items-center gap-3 border-t px-3 py-4 md:items-start md:px-4">
					<ThemeToggle />
					{/* Accent preset picker — the whole-product accent showcase reaches
					    the backend too (ADR-067). Hidden on the collapsed mobile rail. */}
					<div className="hidden md:block">
						<AccentSwitch
							userPreference={requestInfo?.userPrefs.accent ?? undefined}
						/>
					</div>
				</div>
			</aside>
			<div className="flex min-w-0 flex-1 flex-col">
				{adminHeader ? (
					<div className="container max-w-(--shell-max) pt-10">
						<PageHeader
							eyebrow={adminHeader.eyebrow ?? 'Admin'}
							title={adminHeader.title}
							actions={adminHeader.actions}
							headingLevel={1}
						/>
					</div>
				) : null}
				<Outlet />
			</div>
		</div>
	)
}
