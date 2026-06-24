import { Link, useLocation } from 'react-router'
import { AccentSwitch } from '#app/routes/resources/accent.tsx'
import { ThemeSwitch } from '#app/routes/resources/theme-switch.tsx'
import { cn } from '#app/utils/misc.tsx'
import { useOptionalRequestInfo } from '#app/utils/request-info.ts'
import { useOptionalUser, userHasRole } from '#app/utils/user.ts'
import {
	isSectionActive,
	resolveNavbar,
	type NavbarVariant,
} from './app-shell-nav.ts'
import { Logo } from './logo.tsx'
import { Button } from './ui/button.tsx'
import { UserDropdown } from './user-dropdown.tsx'

/**
 * The shared chrome frame for every non-marketing surface (ADR-068): a universal
 * top navbar, an optional section sidebar slot, and the content column. Each
 * section layout wraps its outlet with this instead of leaning on `root.tsx`'s
 * generic chrome (which it suppresses via `handle.hideChrome` during the
 * migration). The navbar variant drives what the chrome shows — `full` is the
 * whole-product bar; `minimal` is the auth pass-through (wired in a later slice).
 *
 * The sidebar slot is unused on single-page surfaces like the public blog; the
 * shared `Sidebar` that fills it for account/admin lands in a later slice.
 */
export function AppShell({
	variant = 'full',
	sidebar,
	children,
}: {
	variant?: NavbarVariant
	sidebar?: React.ReactNode
	children: React.ReactNode
}) {
	return (
		<div className="bg-background text-foreground flex min-h-screen flex-col">
			<AppNavbar variant={variant} />
			{sidebar ? (
				<div className="flex flex-1">
					{sidebar}
					<div className="flex min-w-0 flex-1 flex-col">{children}</div>
				</div>
			) : (
				<div className="flex flex-1 flex-col">{children}</div>
			)}
		</div>
	)
}

/**
 * The universal top navbar. Its visible affordances are decided by the pure
 * {@link resolveNavbar} resolver, so this component is a thin projection: the
 * logo (→ `/`), the resolved product links with the active section highlighted,
 * and a right cluster of accent picker + theme toggle + identity (the avatar
 * dropdown or a Log In button). The accent picker and theme toggle reuse the
 * existing cookie-backed switches (ADR-005), and the identity reuses the shared
 * `UserDropdown` — none of it is re-implemented here.
 */
function AppNavbar({ variant }: { variant: NavbarVariant }) {
	const user = useOptionalUser()
	const requestInfo = useOptionalRequestInfo()
	const location = useLocation()
	const nav = resolveNavbar({
		variant,
		isLoggedIn: Boolean(user),
		isAdmin: user ? userHasRole(user, 'admin') : false,
	})

	return (
		<header className="bg-background/80 border-border sticky top-0 z-40 border-b backdrop-blur">
			<nav
				aria-label="Primary"
				className="container flex h-16 items-center justify-between gap-8"
			>
				<div className="flex items-center gap-8">
					<Logo />
					{nav.productLinks.length > 0 ? (
						<ul className="hidden items-center gap-6 md:flex">
							{nav.productLinks.map((link) => {
								const active = isSectionActive(location.pathname, link)
								return (
									<li key={link.section}>
										<Link
											to={link.to}
											aria-current={active ? 'page' : undefined}
											className={cn(
												'text-sm transition-colors',
												active
													? 'text-brand'
													: 'text-muted-foreground hover:text-foreground',
											)}
										>
											{link.label}
										</Link>
									</li>
								)
							})}
						</ul>
					) : null}
				</div>

				<div className="flex items-center gap-2 md:gap-4">
					{nav.showAccentPicker ? (
						<AccentSwitch
							userPreference={requestInfo?.userPrefs.accent ?? undefined}
						/>
					) : null}
					<ThemeSwitch userPreference={requestInfo?.userPrefs.theme ?? null} />
					{nav.account === 'avatar' ? <UserDropdown /> : null}
					{nav.account === 'login' ? (
						<Button asChild variant="default">
							<Link to="/login">Log In</Link>
						</Button>
					) : null}
				</div>
			</nav>
		</header>
	)
}
