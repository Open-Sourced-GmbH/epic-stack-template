/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import { type NavbarVariant } from './app-shell-nav.ts'
import { AppShell } from './app-shell.tsx'

/**
 * Render the universal navbar at a given variant. A stub `root` loader supplies
 * the `requestInfo` the accent/theme switches read (they throw without it), and
 * a routed page exercises the navbar as real chrome around an outlet.
 */
function renderShell(variant: NavbarVariant, path = '/') {
	const Page = () => (
		<AppShell variant={variant}>
			<p>shell body</p>
		</AppShell>
	)
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
				{ index: true, Component: Page },
				{ path: 'blog', Component: Page },
				{ path: 'login', Component: Page },
			],
		},
	])
	render(<Stub initialEntries={[path]} />)
}

test('marketing variant shows the Über + Blog product links and the guest CTA', async () => {
	renderShell('marketing')

	await screen.findByText('shell body')
	expect(screen.getByRole('link', { name: 'Über' })).toHaveAttribute(
		'href',
		'/about',
	)
	expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute(
		'href',
		'/blog',
	)
	// Logged-out guest CTA → signup, not the `full` Log In button.
	expect(screen.getByRole('link', { name: /los geht's/i })).toHaveAttribute(
		'href',
		'/signup',
	)
	expect(screen.queryByRole('link', { name: /log in/i })).toBeNull()
})

test('marketing highlights the active product section via aria-current', async () => {
	renderShell('marketing', '/blog')

	const blog = await screen.findByRole('link', { name: 'Blog' })
	expect(blog).toHaveAttribute('aria-current', 'page')
	expect(screen.getByRole('link', { name: 'Über' })).not.toHaveAttribute(
		'aria-current',
	)
})

test('minimal variant still shows logo + theme only — no links, identity, or accent picker', async () => {
	renderShell('minimal', '/login')

	await screen.findByText('shell body')
	// Theme toggle present (cycling switch labels the current mode).
	expect(screen.getByRole('button', { name: /light/i })).toBeInTheDocument()
	// No product links, no identity, no accent picker (hue slider).
	expect(screen.queryByRole('link', { name: 'Über' })).toBeNull()
	expect(screen.queryByRole('link', { name: 'Blog' })).toBeNull()
	expect(screen.queryByRole('link', { name: /los geht's/i })).toBeNull()
	expect(screen.queryByRole('link', { name: /log in/i })).toBeNull()
	expect(screen.queryByRole('slider')).toBeNull()
})
