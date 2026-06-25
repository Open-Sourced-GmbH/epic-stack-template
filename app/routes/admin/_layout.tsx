import { type ReactNode } from 'react'
import { Outlet, useMatches } from 'react-router'
import { AppShell } from '#app/components/app-shell.tsx'
import { PageHeader } from '#app/components/ui/page-header.tsx'
import { type SidebarGroup } from '#app/components/ui/sidebar.tsx'
import { useOptionalUser, userHasPermission } from '#app/utils/user.ts'

// The admin section rides the unified AppShell chrome (ADR-068): the universal
// top navbar (which owns the wordmark, the role-gated Admin link, and the
// accent + theme controls) plus the shared section sidebar.

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
 * surfaces. {@link AppShell} renders it as a desktop rail and inside the navbar's
 * mobile drawer, highlighting the active section from the current pathname.
 */
const adminGroups: SidebarGroup[] = [
	{
		label: 'Blog',
		items: [{ to: '/admin/blog', label: 'Blog', icon: 'file-text' }],
	},
	{
		label: 'System',
		items: [{ to: '/admin/cache', label: 'Cache', icon: 'clock' }],
	},
]

/**
 * Build the access-management group — Users and Roles now, Audit as its slice
 * lands. Each item renders only for a viewer holding *its own* read permission, so
 * a plain user who somehow reaches an admin surface never sees a link they'd be
 * 403'd on, and the group itself disappears when it would be empty.
 */
function accessGroupFor(
	user: ReturnType<typeof useOptionalUser>,
): SidebarGroup | null {
	const items: SidebarGroup['items'] = []
	if (userHasPermission(user, 'read:user:any')) {
		items.push({ to: '/admin/users', label: 'Users', icon: 'avatar' })
	}
	if (userHasPermission(user, 'read:role:any')) {
		items.push({ to: '/admin/roles', label: 'Roles', icon: 'lock-closed' })
	}
	return items.length ? { label: 'Access', items } : null
}

/**
 * Shared layout for every `admin/` route. The unified AppShell (`full` navbar +
 * a section `Sidebar`) frames the routed surface — admin now has a top navbar
 * *and* a sidebar (it previously had only a bespoke left rail). The shell owns
 * the lone `PageHeader`, fed per-surface via `handle.adminHeader`. URLs are
 * unchanged — this pathless layout just nests the existing routes.
 */
export default function AdminLayout() {
	const matches = useMatches()
	// Deepest surface wins, so a nested route can override its parent's header.
	const adminHeader = [...matches]
		.reverse()
		.map((m) => (m.handle as AdminHeaderHandle | undefined)?.adminHeader)
		.find(Boolean)

	// Show each Access link only to viewers who can manage that surface; the route
	// guards enforce it server-side, this just hides the link for everyone else.
	const user = useOptionalUser()
	const accessGroup = accessGroupFor(user)
	const groups = accessGroup ? [...adminGroups, accessGroup] : adminGroups

	return (
		<AppShell variant="full" sidebarGroups={groups} sidebarLabel="Admin">
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
