/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import {
	activeItemTo,
	isActiveSection,
	Sidebar,
	type SidebarGroup,
} from './sidebar.tsx'

const groups: SidebarGroup[] = [
	{
		label: 'Account',
		items: [{ to: '/settings/profile', label: 'General', icon: 'avatar' }],
	},
	{
		label: 'Security',
		items: [
			{ to: '/settings/profile/password', label: 'Password', icon: 'lock-closed' },
			{ to: '/settings/profile/two-factor', label: 'Two-Factor', icon: 'lock-open-1' },
		],
	},
]

test('isActiveSection: exact match, child-section match, and no-match', () => {
	// Exact match.
	expect(isActiveSection('/admin/blog', '/admin/blog')).toBe(true)
	// `to + '/'` child section (a nested route is within the section).
	expect(isActiveSection('/admin/blog/new', '/admin/blog')).toBe(true)
	// No match — neither equal nor a child.
	expect(isActiveSection('/admin/cache', '/admin/blog')).toBe(false)
	// A shared prefix that is NOT a path boundary must not match.
	expect(isActiveSection('/admin/blogger', '/admin/blog')).toBe(false)
})

test('activeItemTo picks the longest matching section and returns null on no match', () => {
	const nested: SidebarGroup[] = [
		{ items: [{ to: '/admin', label: 'Home', icon: 'laptop' }] },
		{ items: [{ to: '/admin/blog', label: 'Blog', icon: 'file-text' }] },
	]
	// Both `/admin` and `/admin/blog` prefix-match, but the longest (most
	// specific) wins so only one item lights up.
	expect(activeItemTo('/admin/blog/123', nested)).toBe('/admin/blog')
	expect(activeItemTo('/nowhere', nested)).toBeNull()
})

test('renders grouped items with their optional group labels', () => {
	render(<Sidebar groups={groups} pathname="/settings/profile" label="Account" />)

	// Group labels.
	expect(screen.getByText('Account')).toBeInTheDocument()
	expect(screen.getByText('Security')).toBeInTheDocument()
	// The desktop nav is labelled and lists every item.
	const nav = screen.getByRole('navigation', { name: 'Account' })
	expect(within(nav).getByRole('link', { name: 'General' })).toBeInTheDocument()
	expect(within(nav).getByRole('link', { name: 'Password' })).toBeInTheDocument()
	expect(within(nav).getByRole('link', { name: 'Two-Factor' })).toBeInTheDocument()
})

test('highlights the active item via aria-current and the brand fill', () => {
	render(
		<Sidebar
			groups={groups}
			pathname="/settings/profile/password"
			label="Account"
		/>,
	)

	const nav = screen.getByRole('navigation', { name: 'Account' })
	const active = within(nav).getByRole('link', { name: 'Password' })
	expect(active).toHaveAttribute('aria-current', 'page')
	expect(active).toHaveClass('bg-brand')

	const idle = within(nav).getByRole('link', { name: 'General' })
	expect(idle).not.toHaveAttribute('aria-current')
})

test('default link renders an <a href> so the primitive needs no router', () => {
	render(<Sidebar groups={groups} pathname="/settings/profile" label="Account" />)

	const nav = screen.getByRole('navigation', { name: 'Account' })
	expect(within(nav).getByRole('link', { name: 'General' })).toHaveAttribute(
		'href',
		'/settings/profile',
	)
})

test('mobile drawer opens the same grouped items inside the Sheet', async () => {
	const user = userEvent.setup()
	render(<Sidebar groups={groups} pathname="/settings/profile" label="Account" />)

	// The drawer is closed: only the desktop nav exists.
	expect(screen.getAllByRole('navigation', { name: 'Account' })).toHaveLength(1)

	await user.click(screen.getByRole('button', { name: 'Open Account menu' }))

	// The Sheet is a labelled dialog holding a second copy of the same nav/items.
	const dialog = screen.getByRole('dialog')
	const drawerNav = within(dialog).getByRole('navigation', { name: 'Account' })
	expect(within(drawerNav).getByRole('link', { name: 'General' })).toHaveAttribute(
		'href',
		'/settings/profile',
	)
	expect(within(drawerNav).getByRole('link', { name: 'Password' })).toBeInTheDocument()
})
