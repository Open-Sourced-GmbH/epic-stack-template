import * as React from 'react'

import { cn } from '#app/utils/misc.tsx'
import { Button } from './button.tsx'
import { Icon, type IconName } from './icon.tsx'
import {
	Sheet,
	SheetContent,
	SheetOverlay,
	SheetTitle,
	SheetTrigger,
} from './sheet.tsx'

/** One navigable section in a {@link SidebarGroup}. */
export type SidebarItem = {
	/** The section's path; active when the current pathname is it or a child. */
	to: string
	label: string
	icon: IconName
}

/** A labelled cluster of {@link SidebarItem}s (the label is optional). */
export type SidebarGroup = {
	label?: string
	items: SidebarItem[]
}

/**
 * The link element each item renders as. Defaults to a plain `<a href={to}>`
 * (so the primitive — and its design-sync bundle — never depends on a router);
 * the app passes react-router's `Link`, which takes the same `to` prop, to get
 * client-side transitions.
 */
export type SidebarLinkProps = {
	to: string
	className?: string
	'aria-current'?: 'page'
	onClick?: () => void
	children: React.ReactNode
}
export type SidebarLinkComponent = React.ComponentType<SidebarLinkProps>

const AnchorLink: SidebarLinkComponent = ({ to, ...props }) => (
	<a href={to} {...props} />
)

/**
 * The active-section resolver: an item is active when the current `pathname`
 * equals its `to` or sits under it (`to + '/'`). This generalizes the admin
 * rail's original `isActiveSection` into the one tested predicate every Sidebar
 * consumer shares.
 */
export function isActiveSection(pathname: string, to: string): boolean {
	return pathname === to || pathname.startsWith(`${to}/`)
}

/**
 * The `to` of the single active item across all groups: the **longest** match,
 * so a nested route (`/admin/blog/new`) lights up `/admin/blog` rather than a
 * shorter `/admin` sibling that also prefix-matches. `null` when nothing in the
 * config matches the pathname.
 */
export function activeItemTo(
	pathname: string,
	groups: SidebarGroup[],
): string | null {
	let active: string | null = null
	for (const group of groups) {
		for (const item of group.items) {
			if (
				isActiveSection(pathname, item.to) &&
				(active === null || item.to.length > active.length)
			) {
				active = item.to
			}
		}
	}
	return active
}

const itemBase =
	'flex items-center gap-3 rounded-md px-3 py-2 text-body-sm font-medium transition-colors'
const itemActive = 'bg-brand text-primary-foreground'
const itemIdle =
	'text-muted-foreground hover:bg-background hover:text-foreground'

/**
 * The grouped item list shared by the desktop rail and the mobile drawer, so
 * the two always render identical groups/labels. `onNavigate` lets the drawer
 * close itself when an item is chosen.
 */
function SidebarNav({
	groups,
	label,
	pathname,
	linkComponent: Link,
	onNavigate,
}: {
	groups: SidebarGroup[]
	label: string
	pathname: string
	linkComponent: SidebarLinkComponent
	onNavigate?: () => void
}) {
	const activeTo = activeItemTo(pathname, groups)
	return (
		<nav aria-label={label} className="flex flex-col gap-4">
			{groups.map((group, groupIndex) => {
				const groupActive = group.items.some((item) => item.to === activeTo)
				return (
					<div key={group.label ?? groupIndex} className="flex flex-col gap-1">
						{group.label ? (
							<p
								className={cn(
									'px-3 pt-1 text-xs font-medium tracking-wide uppercase',
									groupActive ? 'text-foreground' : 'text-muted-foreground',
								)}
							>
								{group.label}
							</p>
						) : null}
						{group.items.map((item) => {
							const active = item.to === activeTo
							return (
								<Link
									key={item.to}
									to={item.to}
									aria-current={active ? 'page' : undefined}
									onClick={onNavigate}
									className={cn(itemBase, active ? itemActive : itemIdle)}
								>
									<Icon name={item.icon} className="size-4 shrink-0" />
									<span>{item.label}</span>
								</Link>
							)
						})}
					</div>
				)
			})}
		</nav>
	)
}

/** The inline hamburger glyph — the sprite has no menu icon (cf. PineAdminMark). */
function MenuGlyph() {
	return (
		<svg viewBox="0 0 24 24" className="size-5" aria-hidden focusable="false">
			<path
				d="M4 7h16M4 12h16M4 17h16"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	)
}

/**
 * Sidebar — the shared, config-driven section navigation for the account and
 * admin shells (the sidebar slot of `AppShell`). Driven by plain `groups` data:
 * a desktop rail of grouped items (faint `bg-brand-soft` wash, `border-r`) and,
 * below the `md` breakpoint, a hamburger trigger that opens the **same** grouped
 * items inside the `Sheet` slide-over drawer — so the rail and the drawer never
 * drift. The active item (and its group's label) is highlighted via the pure
 * {@link activeItemTo} / {@link isActiveSection} resolver fed the current
 * `pathname`.
 *
 * Router-agnostic: items render through `linkComponent` (default `<a>`); the app
 * passes react-router's `Link` for client-side transitions. The drawer inherits
 * focus-trap / esc-to-close / labelled `role="dialog"` from `Sheet`. Tokens only.
 */
export function Sidebar({
	groups,
	pathname,
	label = 'Section',
	linkComponent = AnchorLink,
	className,
}: {
	/** Grouped navigation items (each group's label is optional). */
	groups: SidebarGroup[]
	/** The current location pathname, driving the active-section highlight. */
	pathname: string
	/** Accessible label for the nav + mobile drawer (e.g. "Account", "Admin"). */
	label?: string
	/** Link element each item renders as. @default a plain `<a href={to}>` */
	linkComponent?: SidebarLinkComponent
	className?: string
}) {
	const [open, setOpen] = React.useState(false)
	return (
		<>
			<aside
				className={cn(
					'bg-brand-soft hidden w-60 shrink-0 flex-col border-r px-2 py-4 md:flex',
					className,
				)}
			>
				<SidebarNav
					groups={groups}
					label={label}
					pathname={pathname}
					linkComponent={linkComponent}
				/>
			</aside>

			<div className="md:hidden">
				<Sheet open={open} onOpenChange={setOpen}>
					<SheetTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							aria-label={`Open ${label} menu`}
						>
							<MenuGlyph />
						</Button>
					</SheetTrigger>
					<SheetOverlay />
					<SheetContent side="left" className="px-2">
						<SheetTitle className="px-3">{label}</SheetTitle>
						<SidebarNav
							groups={groups}
							label={label}
							pathname={pathname}
							linkComponent={linkComponent}
							onNavigate={() => setOpen(false)}
						/>
					</SheetContent>
				</Sheet>
			</div>
		</>
	)
}
