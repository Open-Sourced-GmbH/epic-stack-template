import * as React from 'react'
import { Link, useLocation } from 'react-router'
import { ThemeSwitch } from '#app/routes/resources/theme-switch.tsx'
import { DEFAULT_ACCENT } from '#app/utils/accent.ts'
import { cn } from '#app/utils/misc.tsx'
import { useOptionalRequestInfo } from '#app/utils/request-info.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import {
	accountCtaLink,
	isLinkActive,
	resolveNavbar,
	type NavbarVariant,
	type NavbarVisibility,
} from './app-shell-nav.ts'
import { Logo } from './logo.tsx'
import { NavbarDrawer } from './navbar-drawer.tsx'
import { ThemeCustomizer } from './theme-customizer.tsx'
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
 * Scrollspy for the navbar's in-page anchor links: observes the landing section
 * elements (by id) and returns whichever is currently in view, so the matching
 * nav link can highlight as the visitor scrolls. Pure progressive enhancement —
 * the resting state is `null` (no section active), and where the sections don't
 * exist (e.g. the blog) the observer simply finds nothing. Guards on
 * `IntersectionObserver` so SSR and jsdom are no-ops.
 */
function useActiveSection(anchorIds: Array<string>): string | null {
	const [active, setActive] = React.useState<string | null>(null)
	// Join to a primitive so the effect only re-subscribes when the ids change,
	// not on every render's fresh array identity.
	const key = anchorIds.join(',')
	React.useEffect(() => {
		if (typeof IntersectionObserver === 'undefined') return
		const ids = key ? key.split(',') : []
		if (ids.length === 0) return
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) setActive(entry.target.id)
				}
			},
			// The mid-viewport band: a section counts as in view once it crosses the
			// centre line, matching the retired marketing header's scrollspy feel.
			{ rootMargin: '-50% 0px -50% 0px' },
		)
		for (const id of ids) {
			const el = document.getElementById(id)
			if (el) observer.observe(el)
		}
		return () => observer.disconnect()
	}, [key])
	return active
}

/**
 * The universal top navbar. Its visible affordances are decided by the pure
 * {@link resolveNavbar} resolver, so this component is a thin projection: the
 * logo (→ `/`), the resolved product links with the active section highlighted,
 * and a right cluster of design customizer + theme toggle + identity (the avatar
 * dropdown or a Log In button). On surfaces that expose the accent picker the
 * desktop cluster is the full `ThemeCustomizer` popover (accent + theme + cursor),
 * with a bare `ThemeSwitch` as the mobile/auth fallback; all of it rides the
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
	// Scrollspy over the resolved anchor links (the landing in-page sections), so
	// the link for the section in view highlights as you scroll.
	const anchorIds = nav.productLinks
		.map((link) => link.anchorId)
		.filter((id): id is string => Boolean(id))
	const activeSection = useActiveSection(anchorIds)

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
							activeSection={activeSection}
							sidebarGroups={sidebarGroups}
							sidebarLabel={sidebarLabel}
						/>
					) : null}
					<Logo hideWordmarkOnMobile={variant !== 'minimal'} />
					{nav.productLinks.length > 0 ? (
						<ul className="hidden items-center gap-6 md:flex">
							{nav.productLinks.map((link) => {
								const active = isLinkActive(link, {
									pathname: location.pathname,
									activeSection,
								})
								return (
									<li key={link.section}>
										<Link
											to={link.to}
											aria-current={active ? 'page' : undefined}
											// A brand underline that scales in from the left on hover
											// (and stays drawn for the active section) — the resting
											// state is server-rendered, so the animation is pure
											// enhancement on top of a plain coloured link.
											className={cn(
												'after:bg-brand hover:text-brand relative py-1 text-body-xs transition-colors',
												'after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:transition-transform hover:after:scale-x-100',
												active
													? 'text-brand after:scale-x-100'
													: 'text-muted-foreground after:scale-x-0',
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
						<>
							{/* Desktop: the full design customizer popover (accent presets +
							    Hue/Chroma/Light sliders + theme + cursor). It subsumes the bare
							    accent swatches and theme toggle on these surfaces (ADR 062). */}
							<div className="hidden md:flex">
								<ThemeCustomizer
									accent={requestInfo?.userPrefs.accent ?? DEFAULT_ACCENT}
									cursor={requestInfo?.userPrefs.cursor ?? 'default'}
									theme={requestInfo?.userPrefs.theme ?? null}
								/>
							</div>
							{/* Mobile: a quick theme toggle; the accent + cursor controls live
							    in the navbar drawer's appearance strip below `md`. */}
							<div className="md:hidden">
								<ThemeSwitch
									userPreference={requestInfo?.userPrefs.theme ?? null}
								/>
							</div>
						</>
					) : (
						<ThemeSwitch userPreference={requestInfo?.userPrefs.theme ?? null} />
					)}
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
