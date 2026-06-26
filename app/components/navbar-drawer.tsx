import * as React from 'react'
import { Form, Link, useLocation } from 'react-router'
import { AccentSwitch } from '#app/routes/resources/accent.tsx'
import { ThemeSwitch } from '#app/routes/resources/theme-switch.tsx'
import { cn } from '#app/utils/misc.tsx'
import { useOptionalRequestInfo } from '#app/utils/request-info.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import {
	accountCtaLink,
	isLinkActive,
	type NavbarVisibility,
} from './app-shell-nav.ts'
import { Logo } from './logo.tsx'
import { Button } from './ui/button.tsx'
import { Icon } from './ui/icon.tsx'
import { Separator } from './ui/separator.tsx'
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetOverlay,
	SheetPortal,
	SheetTitle,
	SheetTrigger,
} from './ui/sheet.tsx'
import {
	itemActive,
	itemBase,
	itemIdle,
	MenuGlyph,
	SidebarNav,
	type SidebarGroup,
} from './ui/sidebar.tsx'
import { UserAvatar } from './user-avatar.tsx'

/**
 * The mobile story for the universal navbar (EPT-83). Below `md` (and only on
 * the `marketing` / `full` variants, never the auth `minimal` bar) a „Menü"
 * hamburger opens a left-anchored {@link Sheet} drawer that carries what the
 * top bar drops at that width: the variant's product links, then — on the
 * account / admin work surfaces — the section nav groups rendered through the
 * **same** {@link SidebarNav} renderer as the desktop rail (so the rail and the
 * drawer can never drift), and a footer with the identity row plus a compact
 * appearance strip (accent + theme) since the desktop accent picker is
 * desktop-only.
 *
 * The panel base is fully opaque — the translucent `--brand-soft` wash is
 * composited over `--background` so content never shows through (the Sheet's
 * default `bg-popover` is replaced). It inherits focus-trap, esc-to-close, and
 * the labelled `role="dialog"` from `Sheet`; choosing any item closes it. The
 * entrance animation is suppressed under `prefers-reduced-motion`.
 */
export function NavbarDrawer({
	nav,
	activeSection = null,
	sidebarGroups,
	sidebarLabel = 'Section',
}: {
	/** The resolved navbar affordances (product links + identity slot). */
	nav: NavbarVisibility
	/** The landing section currently in view (scrollspy), for anchor highlighting. */
	activeSection?: string | null
	/** The section nav groups on account / admin (mirrors the desktop rail). */
	sidebarGroups?: SidebarGroup[]
	/** Accessible label for the section nav (e.g. "Account", "Admin"). */
	sidebarLabel?: string
}) {
	const [open, setOpen] = React.useState(false)
	const location = useLocation()
	const user = useOptionalUser()
	const requestInfo = useOptionalRequestInfo()
	const ctaLink = accountCtaLink(nav.account)
	const close = () => setOpen(false)

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Menü"
					className="md:hidden"
				>
					<MenuGlyph />
				</Button>
			</SheetTrigger>
			{/* Portal to the body: the navbar is a sticky `backdrop-blur` header,
			    which establishes the containing block for fixed descendants — an
			    in-place panel would be clipped to the ~60px header strip (and the
			    page would show through). The portal lets the rail fill the viewport. */}
			<SheetPortal>
				<SheetOverlay className="motion-reduce:animate-none" />
				<SheetContent
					side="left"
					// The dialog is named by its sr-only SheetTitle below.
					// Opaque base: composite the translucent --brand-soft wash over
					// --background so nothing behind the panel bleeds through.
					style={{
						background:
							'linear-gradient(var(--brand-soft), var(--brand-soft)), var(--background)',
					}}
					className="gap-0 p-0 motion-reduce:animate-none"
				>
					{/* Header — logo + close. */}
					<div className="border-border flex items-center justify-between border-b px-4 py-3">
						<SheetTitle className="sr-only">Menü</SheetTitle>
						<Logo />
						<SheetClose asChild>
							<Button variant="ghost" size="icon" aria-label="Menü schließen">
								<Icon name="cross-1" className="size-4" />
							</Button>
						</SheetClose>
					</div>

					{/* Nav — product links, then (account/admin) the section groups. */}
					<div className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 py-4">
						{nav.productLinks.length > 0 ? (
							<nav aria-label="Seiten" className="flex flex-col gap-1">
								{nav.productLinks.map((link) => {
									const active = isLinkActive(link, {
										pathname: location.pathname,
										activeSection,
									})
									return (
										<Link
											key={link.section}
											to={link.to}
											onClick={close}
											aria-current={active ? 'page' : undefined}
											className={cn(itemBase, active ? itemActive : itemIdle)}
										>
											{link.label}
										</Link>
									)
								})}
							</nav>
						) : null}
						{sidebarGroups ? (
							<>
								<Separator />
								<SidebarNav
									groups={sidebarGroups}
									label={sidebarLabel}
									pathname={location.pathname}
									linkComponent={Link}
									onNavigate={close}
								/>
							</>
						) : null}
					</div>

					{/* Footer — identity (or guest CTA) + the appearance strip. */}
					<div className="border-border flex flex-col gap-4 border-t px-4 py-4">
						{user ? (
							<div className="flex items-center gap-3">
								<UserAvatar
									name={user.name ?? user.username}
									imageObjectKey={user.image?.objectKey}
									className="size-9"
								/>
								<div className="min-w-0 flex-1">
									<p className="text-body-sm truncate font-bold">
										{user.name ?? user.username}
									</p>
									<p className="text-muted-foreground truncate text-body-2xs">
										{user.email}
									</p>
								</div>
								<Form action="/logout" method="POST">
									<Button
										type="submit"
										variant="ghost"
										size="icon"
										aria-label="Logout"
									>
										<Icon name="exit" className="size-4" />
									</Button>
								</Form>
							</div>
						) : ctaLink ? (
							<Button asChild variant="default" onClick={close}>
								<Link to={ctaLink.to}>{ctaLink.label}</Link>
							</Button>
						) : null}

						<div className="flex items-center justify-between gap-3">
							<span className="text-muted-foreground text-body-2xs font-medium tracking-wide uppercase">
								Darstellung
							</span>
							<div className="flex items-center gap-3">
								<AccentSwitch
									userPreference={requestInfo?.userPrefs.accent ?? undefined}
								/>
								<ThemeSwitch
									userPreference={requestInfo?.userPrefs.theme ?? null}
								/>
							</div>
						</div>
					</div>
				</SheetContent>
			</SheetPortal>
		</Sheet>
	)
}
