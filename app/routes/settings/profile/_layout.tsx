import { invariantResponse } from '@epic-web/invariant'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { Link, Outlet, useLocation } from 'react-router'
import { z } from 'zod'
import { AppShell } from '#app/components/app-shell.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { PageHeader } from '#app/components/ui/page-header.tsx'
import { Sidebar, type SidebarGroup } from '#app/components/ui/sidebar.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { type Route } from './+types/_layout.tsx'

// The account section rides the unified AppShell chrome (ADR-068): the universal
// top navbar (which owns the wordmark + the accent + theme controls) plus the
// shared section `Sidebar`. The generic root.tsx chrome is suppressed here until
// the root-cleanup slice (EPT-78) retires the `hideChrome` seam wholesale.
//
// `BreadcrumbHandle` lives on for the account sub-routes that still type their
// `handle` against it; the breadcrumb *trail* is gone — the sidebar replaces it.
export const BreadcrumbHandle = z.object({ breadcrumb: z.any() })
export type BreadcrumbHandle = z.infer<typeof BreadcrumbHandle>

export const handle: BreadcrumbHandle & SEOHandle & { hideChrome: true } = {
	breadcrumb: <Icon name="file-text">Edit Profile</Icon>,
	getSitemapEntries: () => null,
	hideChrome: true,
}

/**
 * The account sidebar config: an **Account** group (the General landing) and a
 * **Security** group linking the standalone security sub-routes. The shared
 * {@link Sidebar} renders this as a desktop rail and a mobile drawer,
 * highlighting the active section from the current pathname. `Password` points
 * at `/settings/profile/password`, which itself redirects to `…/password/create`
 * for accounts that have no password yet.
 */
const accountGroups: SidebarGroup[] = [
	{
		label: 'Account',
		items: [{ to: '/settings/profile', label: 'General', icon: 'avatar' }],
	},
	{
		label: 'Security',
		items: [
			{
				to: '/settings/profile/change-email',
				label: 'Email',
				icon: 'envelope-closed',
			},
			{
				to: '/settings/profile/password',
				label: 'Password',
				icon: 'dots-horizontal',
			},
			{
				to: '/settings/profile/two-factor',
				label: 'Two-Factor',
				icon: 'lock-closed',
			},
			{
				to: '/settings/profile/connections',
				label: 'Connections',
				icon: 'link-2',
			},
			{ to: '/settings/profile/passkeys', label: 'Passkeys', icon: 'passkey' },
		],
	},
]

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { username: true },
	})
	invariantResponse(user, 'User not found', { status: 404 })
	return {}
}

/**
 * Shared layout for every `settings/profile/` route. The unified AppShell
 * (`full` navbar + the account `Sidebar`) frames the routed surface; the lone
 * `PageHeader` and the `<main>` landmark live here so the General landing and
 * each security sub-page share one consistent header. The old breadcrumb trail
 * is gone — the sidebar's active-section highlight tells you where you are.
 */
export default function EditUserProfile() {
	const location = useLocation()

	return (
		<AppShell
			variant="full"
			sidebar={
				<Sidebar
					groups={accountGroups}
					pathname={location.pathname}
					label="Account"
					linkComponent={Link}
				/>
			}
		>
			<main className="container max-w-(--shell-max) py-10">
				<PageHeader
					eyebrow="Account"
					title="Settings"
					headingLevel={1}
					className="mb-8"
				/>
				<Outlet />
			</main>
		</AppShell>
	)
}
