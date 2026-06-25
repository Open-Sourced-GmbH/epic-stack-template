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
				{ path: 'settings', Component: Page },
			],
		},
	])
	render(<Stub initialEntries={[path]} />)
}

test('marketing variant shows the section anchors + Blog and the guest CTA', async () => {
	renderShell('marketing')

	await screen.findByText('shell body')
	// The landing in-page sections lead the bar as scroll-anchor links → /#<id>;
	// Über is dropped (it lives in the footer sitemap now).
	expect(screen.getByRole('link', { name: 'Work' })).toHaveAttribute(
		'href',
		'/#work',
	)
	expect(screen.queryByRole('link', { name: 'Über' })).toBeNull()
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

test('marketing highlights the active route section via aria-current', async () => {
	renderShell('marketing', '/blog')

	const blog = await screen.findByRole('link', { name: 'Blog' })
	expect(blog).toHaveAttribute('aria-current', 'page')
	// Anchor links are scrollspy-driven; with no IntersectionObserver in jsdom
	// none is active, so they never carry aria-current from the pathname.
	expect(screen.getByRole('link', { name: 'Work' })).not.toHaveAttribute(
		'aria-current',
	)
})

test('full variant collapses the work-surface IA to a single „Zurück zur Website" back-link → /', async () => {
	renderShell('full', '/settings')

	await screen.findByText('shell body')
	expect(
		screen.getByRole('link', { name: /zurück zur website/i }),
	).toHaveAttribute('href', '/')
	// The work-surface top links are gone — Blog lives under the marketing nav,
	// Admin under the avatar dropdown.
	expect(screen.queryByRole('link', { name: 'Blog' })).toBeNull()
	expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull()
	// Logged-out guest on a work surface still gets the `full` Log In button.
	expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute(
		'href',
		'/login',
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
