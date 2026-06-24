// Owned preview — mirrors the `sidebar` specimen (the account / admin section
// rail). Driven by plain `groups` data; the active item (and its group label)
// is resolved from `pathname`. Below the md breakpoint the rail collapses to a
// hamburger that opens the same groups in a Sheet drawer. Sidebar renders its
// own item icons internally (the curated bundle doesn't export Icon), so the
// preview only supplies the config.
import { Sidebar } from 'epic-stack-template'

const accountGroups = [
	{
		label: 'Account',
		items: [{ to: '/settings/profile', label: 'General', icon: 'avatar' }],
	},
	{
		label: 'Security',
		items: [
			{ to: '/settings/profile/password', label: 'Password', icon: 'lock-closed' },
			{
				to: '/settings/profile/two-factor',
				label: 'Two-Factor',
				icon: 'lock-open-1',
			},
			{ to: '/settings/profile/connections', label: 'Connections', icon: 'link-2' },
		],
	},
]

const adminGroups = [
	{
		label: 'Manage',
		items: [
			{ to: '/admin/blog', label: 'Blog', icon: 'file-text' },
			{ to: '/admin/cache', label: 'Cache', icon: 'clock' },
		],
	},
]

export const AccountRail = () => (
	<div className="flex h-80 overflow-hidden rounded-lg">
		<Sidebar
			label="Account"
			pathname="/settings/profile/password"
			groups={accountGroups}
		/>
	</div>
)

export const AdminRail = () => (
	<div className="flex h-80 overflow-hidden rounded-lg">
		<Sidebar label="Admin" pathname="/admin/blog" groups={adminGroups} />
	</div>
)
