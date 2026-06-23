/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, expect, test, vi } from 'vitest'
import { type Command as CommandType } from './command.matcher.ts'
import { CommandPalette } from './command.tsx'

// cmdk calls scrollIntoView on the active item; jsdom has no layout, so stub it.
beforeAll(() => {
	Element.prototype.scrollIntoView = vi.fn()
})

function makeCommands(overrides: Partial<Record<string, () => void>> = {}) {
	const commands: CommandType[] = [
		{ id: 'home', title: 'Home', group: 'Navigation', href: '/', icon: 'arrow-right' },
		{ id: 'pricing', title: 'Pricing', group: 'Navigation', href: '/#pricing' },
		{
			id: 'toggle-theme',
			title: 'Toggle theme',
			group: 'Theme',
			keywords: ['dark', 'light', 'appearance'],
			run: overrides.toggleTheme ?? (() => {}),
		},
	]
	return commands
}

test('renders the full registry grouped by section', () => {
	render(<CommandPalette commands={makeCommands()} />)

	expect(screen.getByText('Navigation')).toBeInTheDocument()
	expect(screen.getByText('Theme')).toBeInTheDocument()
	expect(screen.getByRole('option', { name: /Home/ })).toBeInTheDocument()
	expect(screen.getByRole('option', { name: /Pricing/ })).toBeInTheDocument()
	expect(screen.getByRole('option', { name: /Toggle theme/ })).toBeInTheDocument()
})

test('typing narrows the list via the matcher (incl. keyword match)', async () => {
	const user = userEvent.setup()
	render(<CommandPalette commands={makeCommands()} />)

	await user.type(screen.getByRole('combobox'), 'pri')
	expect(screen.getByRole('option', { name: /Pricing/ })).toBeInTheDocument()
	expect(screen.queryByRole('option', { name: /Home/ })).not.toBeInTheDocument()

	// "dark" only matches Toggle theme's keyword, not any title.
	await user.clear(screen.getByRole('combobox'))
	await user.type(screen.getByRole('combobox'), 'dark')
	expect(screen.getByRole('option', { name: /Toggle theme/ })).toBeInTheDocument()
	expect(screen.queryByRole('option', { name: /Pricing/ })).not.toBeInTheDocument()
})

test('a no-match query shows the empty state with suggested-action chips', async () => {
	const user = userEvent.setup()
	render(
		<CommandPalette
			commands={makeCommands()}
			emptyActions={[
				{ id: 'a', title: 'Create project', group: 'Suggestions', run: () => {} },
				{ id: 'b', title: 'Contact support', group: 'Suggestions', run: () => {} },
			]}
		/>,
	)

	await user.type(screen.getByRole('combobox'), 'zzzznope')

	expect(screen.getByText('No results found.')).toBeInTheDocument()
	expect(
		screen.getByRole('button', { name: 'Create project' }),
	).toBeInTheDocument()
	expect(
		screen.getByRole('button', { name: 'Contact support' }),
	).toBeInTheDocument()
	expect(screen.queryByRole('option')).not.toBeInTheDocument()
})

test('a loading state shows placeholders instead of the empty/no-results state', () => {
	render(
		<CommandPalette
			commands={[]}
			loading
			emptyActions={[
				{ id: 'a', title: 'Create project', group: 'Suggestions', run: () => {} },
			]}
		/>,
	)

	// Loading wins over the empty state: skeleton placeholders, no "No results".
	expect(screen.getByRole('status', { busy: true })).toBeInTheDocument()
	expect(screen.queryByText('No results found.')).not.toBeInTheDocument()
	expect(
		screen.queryByRole('button', { name: 'Create project' }),
	).not.toBeInTheDocument()
})

test('a loading state suppresses matched result options', () => {
	render(<CommandPalette commands={makeCommands()} loading />)

	expect(screen.getByRole('status', { busy: true })).toBeInTheDocument()
	expect(screen.queryByRole('option')).not.toBeInTheDocument()
})

test('pressing ↵ runs the selected action command', async () => {
	const user = userEvent.setup()
	const toggleTheme = vi.fn()
	render(
		<CommandPalette commands={makeCommands({ toggleTheme })} />,
	)

	const input = screen.getByRole('combobox')
	await user.type(input, 'toggle')
	expect(screen.getByRole('option', { name: /Toggle theme/ })).toBeInTheDocument()
	await user.keyboard('{Enter}')

	expect(toggleTheme).toHaveBeenCalledTimes(1)
})

test('selecting a navigation command navigates to its href', async () => {
	const user = userEvent.setup()
	const onNavigate = vi.fn()
	render(<CommandPalette commands={makeCommands()} onNavigate={onNavigate} />)

	const input = screen.getByRole('combobox')
	await user.type(input, 'pricing')
	await user.keyboard('{Enter}')

	expect(onNavigate).toHaveBeenCalledWith('/#pricing')
})

test('overlay form is a labelled dialog that closes on escape', async () => {
	const user = userEvent.setup()
	const onOpenChange = vi.fn()
	render(
		<CommandPalette
			commands={makeCommands()}
			open
			onOpenChange={onOpenChange}
		/>,
	)

	const dialog = screen.getByRole('dialog', { name: 'Command palette' })
	expect(dialog).toBeInTheDocument()

	await user.keyboard('{Escape}')
	expect(onOpenChange).toHaveBeenCalledWith(false)
})

test('arrow keys move the selection and wrap (loop)', async () => {
	const user = userEvent.setup()
	render(<CommandPalette commands={makeCommands()} />)

	// cmdk selects the first item by default.
	await user.click(screen.getByRole('combobox'))
	expect(screen.getByRole('option', { selected: true })).toHaveAccessibleName(
		/Home/,
	)

	await user.keyboard('{ArrowDown}')
	expect(screen.getByRole('option', { selected: true })).toHaveAccessibleName(
		/Pricing/,
	)

	// From the first item, ArrowUp wraps to the last (loop enabled).
	await user.keyboard('{ArrowUp}{ArrowUp}')
	expect(screen.getByRole('option', { selected: true })).toHaveAccessibleName(
		/Toggle theme/,
	)
})
