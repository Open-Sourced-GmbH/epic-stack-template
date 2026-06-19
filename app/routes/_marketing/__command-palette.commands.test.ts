import { expect, test, vi } from 'vitest'
import { landingCommands, type ThemeMode } from './__command-palette.commands.ts'
import { navSections } from './__header.tsx'

test('navigation commands cover Home, every nav section, and Contact as hrefs', () => {
	const commands = landingCommands({ onTheme: () => {} })
	const navigation = commands.filter((c) => c.group === 'Navigation')

	// Every navigation command points somewhere and never runs an action.
	for (const command of navigation) {
		expect(command.href).toBeTypeOf('string')
		expect(command.run).toBeUndefined()
	}

	expect(navigation.map((c) => c.href)).toEqual([
		'/',
		...navSections.map((s) => `/#${s.id}`),
		'/#contact',
	])
})

test('theme commands are run actions (no href) that report the chosen mode', () => {
	const onTheme = vi.fn<(mode: ThemeMode) => void>()
	const commands = landingCommands({ onTheme })
	const theme = commands.filter((c) => c.group === 'Theme')

	expect(theme.map((c) => c.title)).toEqual(['Light', 'Dark', 'System'])

	for (const command of theme) {
		expect(command.href).toBeUndefined()
		expect(command.run).toBeTypeOf('function')
	}

	theme.find((c) => c.title === 'Dark')?.run?.()
	expect(onTheme).toHaveBeenCalledWith('dark')
})

test('theme commands carry appearance keywords so "appearance" matches', () => {
	const theme = landingCommands({ onTheme: () => {} }).filter(
		(c) => c.group === 'Theme',
	)
	for (const command of theme) {
		expect(command.keywords).toContain('appearance')
	}
})
