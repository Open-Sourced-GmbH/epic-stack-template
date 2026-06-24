/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import AuthLayout from './_layout.tsx'

/**
 * Render the auth shell with a stub root that supplies the `requestInfo` the
 * navbar's theme toggle reads, plus a routed auth surface so the centered
 * brand-glow composition around the `<Outlet />` is exercised.
 */
function renderAuth() {
	const Stub = createRoutesStub([
		{
			id: 'root',
			path: '/',
			loader: () => ({
				requestInfo: {
					hints: { theme: 'light', timeZone: 'UTC' },
					userPrefs: { theme: 'light' },
				},
			}),
			HydrateFallback: () => null,
			children: [
				{
					Component: AuthLayout,
					children: [
						{ path: 'login', Component: () => <p>auth surface body</p> },
					],
				},
			],
		},
	])
	render(<Stub initialEntries={['/login']} />)
}

test('renders the minimal AppShell navbar around the routed auth surface', async () => {
	renderAuth()

	expect(await screen.findByText('auth surface body')).toBeInTheDocument()
	// The universal navbar is present...
	expect(
		screen.getByRole('navigation', { name: 'Primary' }),
	).toBeInTheDocument()
	// ...and the logo links home.
	expect(screen.getByRole('link', { name: /open sourced home/i })).toHaveAttribute(
		'href',
		'/',
	)
	// The branded centered composition is preserved in the content area.
	expect(screen.getByText('Epic Notes')).toBeInTheDocument()
})

test('the minimal navbar shows the theme toggle but no product links, identity, or accent picker', async () => {
	renderAuth()

	await screen.findByText('auth surface body')
	// The navbar owns the theme toggle (the cycling switch — it labels the
	// current mode, `light` per the stubbed preference).
	expect(screen.getByRole('button', { name: /light/i })).toBeInTheDocument()
	// No product links (Blog / Admin).
	expect(screen.queryByRole('link', { name: /blog/i })).toBeNull()
	expect(screen.queryByRole('link', { name: /admin/i })).toBeNull()
	// No identity slot — neither a Log In button nor an avatar dropdown.
	expect(screen.queryByRole('link', { name: /log in/i })).toBeNull()
	// No accent picker (the ADR-062/067 accent boundary) — it is a hue slider.
	expect(screen.queryByRole('slider')).toBeNull()
})

test('the old floating in-shell binary dark-mode toggle is gone', async () => {
	renderAuth()

	await screen.findByText('auth surface body')
	// The floating ThemeToggle (a `switch` labelled "Toggle dark mode") is
	// replaced by the navbar's theme switch.
	expect(screen.queryByRole('switch', { name: /toggle dark mode/i })).toBeNull()
})
