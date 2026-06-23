/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { specimens } from '#app/components/styleguide/specimens.tsx'
import { EXCLUDED_GROUPS, Playground } from './__playground.tsx'

// Reduced motion keeps the carousel static (no autoplay) so navigation in these
// tests is deterministic.
beforeEach(() => {
	// jsdom doesn't implement elementFromPoint; input-otp calls it from a
	// deferred timer after typing, which otherwise surfaces as an unhandled error.
	document.elementFromPoint = () => null

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

	const region = screen.getByRole('region', { name: /screenshot/i })
	expect(region).toHaveAttribute('id', 'playground')
})

test('sources a tab for every styleguide specimen group (cannot drift)', () => {
	render(<Playground />)

	const tablist = screen.getByRole('tablist')
	const tabLabels = within(tablist)
		.getAllByRole('tab')
		.map((t) => t.textContent)

	const groups = [...new Set(specimens.map((s) => s.group))].filter(
		(group) => !EXCLUDED_GROUPS.has(group),
	)
	for (const group of groups) {
		expect(tabLabels).toContain(group)
	}

	// Token-gallery groups are deliberately kept out of the showpiece.
	for (const group of EXCLUDED_GROUPS) {
		expect(tabLabels).not.toContain(group)
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

test('the onboarding slide walks register → 2FA → welcome', async () => {
	const user = userEvent.setup()
	render(<Playground />)

	// Register is the opening step; submit drives the StatusButton pending.
	await user.click(screen.getByRole('button', { name: /create account/i }))
	expect(screen.getByTitle('loading')).toBeInTheDocument()

	// Once the simulated request resolves, the 2FA step takes over.
	const otp = await screen.findByLabelText(/two-factor code/i, undefined, {
		timeout: 2_000,
	})

	// A complete code advances to the welcome step.
	await user.type(otp, '248013')
	await screen.findByText(/you're all set/i, undefined, { timeout: 2_000 })
})
