import { type ReactNode } from 'react'
import { Link, Outlet, useLocation, useMatches } from 'react-router'
import { AppShell } from '#app/components/app-shell.tsx'
import { PageHeader } from '#app/components/ui/page-header.tsx'
import { Sidebar, type SidebarGroup } from '#app/components/ui/sidebar.tsx'

// The admin section rides the unified AppShell chrome (ADR-068): the universal
// top navbar (which owns the wordmark, the role-gated Admin link, and the
// accent + theme controls) plus the shared section `Sidebar`.

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

/**
 * The admin sidebar config: a single **Manage** group linking the admin
 * surfaces. The shared {@link Sidebar} renders this as a desktop rail and a
 * mobile drawer, highlighting the active section from the current pathname.
 */
const adminGroups: SidebarGroup[] = [
	{
		label: 'Manage',
		items: [
			{ to: '/admin/blog', label: 'Blog', icon: 'file-text' },
			{ to: '/admin/cache', label: 'Cache', icon: 'clock' },
		],
	},
]

/**
 * Shared layout for every `admin/` route. The unified AppShell (`full` navbar +
 * a section `Sidebar`) frames the routed surface — admin now has a top navbar
 * *and* a sidebar (it previously had only a bespoke left rail). The shell owns
 * the lone `PageHeader`, fed per-surface via `handle.adminHeader`. URLs are
 * unchanged — this pathless layout just nests the existing routes.
 */
export default function AdminLayout() {
	const location = useLocation()
	const matches = useMatches()
	// Deepest surface wins, so a nested route can override its parent's header.
	const adminHeader = [...matches]
		.reverse()
		.map((m) => (m.handle as AdminHeaderHandle | undefined)?.adminHeader)
		.find(Boolean)

	return (
		<AppShell
			variant="full"
			sidebar={
				<Sidebar
					groups={adminGroups}
					pathname={location.pathname}
					label="Admin"
					linkComponent={Link}
				/>
			}
		>
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
		</AppShell>
	)
}
