import { Link, useLocation } from 'react-router'
import { AccentSwitch } from '#app/routes/resources/accent.tsx'
import { ThemeSwitch } from '#app/routes/resources/theme-switch.tsx'
import { cn } from '#app/utils/misc.tsx'
import { useOptionalRequestInfo } from '#app/utils/request-info.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import {
	accountCtaLink,
	isSectionActive,
	resolveNavbar,
	type NavbarVariant,
	type NavbarVisibility,
} from './app-shell-nav.ts'
import { Logo } from './logo.tsx'
import { NavbarDrawer } from './navbar-drawer.tsx'
import { Button } from './ui/button.tsx'
import { SidebarRail, type SidebarGroup } from './ui/sidebar.tsx'
import { UserDropdown } from './user-dropdown.tsx'

/**
 * The shared chrome frame for every non-marketing surface (ADR-068): a universal
 * top navbar, an optional section sidebar slot, and the content column. Each
 * section layout wraps its outlet with this; `root.tsx` no longer renders any
 * generic chrome (ADR-068), so every surface owns its frame explicitly. The
 * navbar variant drives what the chrome shows — `full` is the whole-product
 * bar (account/admin), `marketing` is the public bar (landing/blog), and
 * `minimal` is the auth pass-through.
 *
 * On account/admin the section nav is supplied as `sidebarGroups` config (not a
 * pre-rendered node): the shell renders the desktop rail from it via the shared
 * `SidebarNav`, and the navbar's mobile drawer renders the **same** groups — so
 * the rail and the drawer can never drift, and there is exactly one mobile menu
 * (the navbar hamburger). Single-page surfaces like the public blog pass none.
 */
export function AppShell({
	variant = 'full',
	sidebarGroups,
	sidebarLabel = 'Section',
	children,
}: {
	variant?: NavbarVariant
	/** Section nav groups for the account/admin rail + the navbar drawer. */
	sidebarGroups?: SidebarGroup[]
	/** Accessible label for the section nav (e.g. "Account", "Admin"). */
	sidebarLabel?: string
	children: React.ReactNode
}) {
	const location = useLocation()
	return (
		<div className="bg-background text-foreground flex min-h-screen flex-col">
			<AppNavbar
				variant={variant}
				sidebarGroups={sidebarGroups}
				sidebarLabel={sidebarLabel}
			/>
			{sidebarGroups ? (
				<div className="flex flex-1">
					<SidebarRail
						groups={sidebarGroups}
						label={sidebarLabel}
						pathname={location.pathname}
						linkComponent={Link}
					/>
					<div className="flex min-w-0 flex-1 flex-col">{children}</div>
				</div>
			) : (
				<div className="flex flex-1 flex-col">{children}</div>
			)}
		</div>
	)
}

/**
 * Frames a full-page error/404 boundary in the universal navbar (`full`) so a
 * dead end still carries chrome to escape from (ADR-068). It falls back to the
 * bare children when the root loader itself failed — without its request info
 * the navbar's theme/accent switches can't render, and that genuine last resort
 * shouldn't crash the boundary. Section surfaces already nest their boundaries
 * inside their own `AppShell`; this is for the unframed dead ends (root + the
 * `/` splat 404).
 */
export function AppShellBoundary({ children }: { children: React.ReactNode }) {
	const requestInfo = useOptionalRequestInfo()
	return requestInfo ? (
		<AppShell variant="full">{children}</AppShell>
	) : (
		<>{children}</>
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
function AppNavbar({
	variant,
	sidebarGroups,
	sidebarLabel,
}: {
	variant: NavbarVariant
	sidebarGroups?: SidebarGroup[]
	sidebarLabel?: string
}) {
	const user = useOptionalUser()
	const requestInfo = useOptionalRequestInfo()
	const location = useLocation()
	const nav: NavbarVisibility = resolveNavbar({
		variant,
		isLoggedIn: Boolean(user),
	})
	const ctaLink = accountCtaLink(nav.account)

	return (
		<header
			className={cn(
				'bg-background/80 border-border sticky top-0 z-40 backdrop-blur',
				// Minimal (auth) is borderless; every other surface carries the hairline.
				variant !== 'minimal' && 'border-b',
			)}
		>
			<nav
				aria-label="Primary"
				className="container flex h-15 items-center justify-between gap-6"
			>
				<div className="flex items-center gap-6">
					{/* The mobile menu — a hamburger below `md` on marketing/full only;
					    `minimal` (auth) has no links or section nav, so no drawer. */}
					{variant !== 'minimal' ? (
						<NavbarDrawer
							nav={nav}
							sidebarGroups={sidebarGroups}
							sidebarLabel={sidebarLabel}
						/>
					) : null}
					<Logo hideWordmarkOnMobile={variant !== 'minimal'} />
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

				<div className="flex items-center gap-2.5">
					{nav.showAccentPicker ? (
						// Desktop-only: below `md` the accent cycle lives in the drawer's
						// appearance strip, so the bar stays uncluttered on mobile.
						<div className="hidden md:flex">
							<AccentSwitch
								userPreference={requestInfo?.userPrefs.accent ?? undefined}
							/>
						</div>
					) : null}
					<ThemeSwitch userPreference={requestInfo?.userPrefs.theme ?? null} />
					{nav.account === 'avatar' ? <UserDropdown /> : null}
					{ctaLink ? (
						<Button asChild variant="default">
							<Link to={ctaLink.to}>{ctaLink.label}</Link>
						</Button>
					) : null}
				</div>
			</nav>
		</header>
	)
}
