/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { specimens } from '#app/components/styleguide/specimens.tsx'
import { Playground } from './__playground.tsx'

// Reduced motion keeps the carousel static (no autoplay) so navigation in these
// tests is deterministic.
beforeEach(() => {
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: query.includes('reduce'),
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}))
})

afterEach(() => {
	vi.unstubAllGlobals()
})

test('renders a playground section landmark with a heading', () => {
	render(<Playground />)

	const region = screen.getByRole('region', { name: /running live/i })
	expect(region).toHaveAttribute('id', 'playground')
})

test('sources a tab for every styleguide specimen group (cannot drift)', () => {
	render(<Playground />)

	const tablist = screen.getByRole('tablist')
	const tabLabels = within(tablist)
		.getAllByRole('tab')
		.map((t) => t.textContent)

	const groups = [...new Set(specimens.map((s) => s.group))]
	for (const group of groups) {
		expect(tabLabels).toContain(group)
	}
})

test('mounts every styleguide specimen through the playground without error', async () => {
	const user = userEvent.setup()
	render(<Playground />)

	const tablist = screen.getByRole('tablist')
	const tabs = within(tablist).getAllByRole('tab')

	// Visiting each tab mounts that group's specimens; a throwing specimen would
	// surface here. The active tabpanel must always render.
	for (const tab of tabs) {
		await user.click(tab)
		expect(screen.getByRole('tabpanel')).toBeInTheDocument()
	}
})

test('the onboarding slide drives a StatusButton from idle to success', async () => {
	const user = userEvent.setup()
	render(<Playground />)

	// Onboarding is the opening slide; submit drives the StatusButton.
	await user.click(screen.getByRole('button', { name: /create account/i }))

	// Pending immediately, then success once the simulated request resolves.
	expect(screen.getByTitle('loading')).toBeInTheDocument()
	await screen.findByTitle('success', undefined, { timeout: 2_000 })
})
