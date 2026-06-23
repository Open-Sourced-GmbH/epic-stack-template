// Owned preview — mirrors the `command` + `command-empty` specimens. Rendered
// inline (no `open` prop) so the palette snapshots without a portal. `Results`
// shows the grouped registry with brand-soft selection; `EmptyState` forces the
// no-match state with injected suggested-action chips.
import { CommandPalette } from 'epic-stack-template'

// A representative ⌘K registry: Navigation / Theme / Help groups, a mix of
// `href` and `run` commands, each with a leading icon.
const commandRegistry = [
	{ id: 'home', title: 'Home', group: 'Navigation', href: '/', icon: 'arrow-right' },
	{
		id: 'pricing',
		title: 'Pricing',
		group: 'Navigation',
		href: '/#pricing',
		icon: 'file-text',
	},
	{ id: 'work', title: 'Our work', group: 'Navigation', href: '/#work', icon: 'link-2' },
	{
		id: 'toggle-theme',
		title: 'Toggle theme',
		group: 'Theme',
		keywords: ['dark', 'light', 'appearance'],
		icon: 'sun',
		run: () => {},
	},
	{
		id: 'docs',
		title: 'Documentation',
		group: 'Help',
		href: '/docs',
		icon: 'question-mark-circled',
	},
	{
		id: 'support',
		title: 'Contact support',
		group: 'Help',
		icon: 'envelope-closed',
		run: () => {},
	},
]

// Suggested actions for the empty / no-match state, injected by the consumer.
const commandEmptyActions = [
	{ id: 'create-project', title: 'Create project', group: 'Suggestions', icon: 'plus', run: () => {} },
	{ id: 'invite', title: 'Invite', group: 'Suggestions', icon: 'avatar', run: () => {} },
	{ id: 'toggle-theme-empty', title: 'Toggle theme', group: 'Suggestions', icon: 'sun', run: () => {} },
	{
		id: 'contact-support',
		title: 'Contact support',
		group: 'Suggestions',
		icon: 'question-mark-circled',
		run: () => {},
	},
]

export const Results = () => <CommandPalette commands={commandRegistry} />

export const EmptyState = () => (
	<CommandPalette commands={[]} emptyActions={commandEmptyActions} />
)

// Pending remote source: `loading` swaps the list for Skeleton/Spinner
// placeholders so an in-flight fetch never reads as "No results found.".
export const Loading = () => <CommandPalette commands={[]} loading />
