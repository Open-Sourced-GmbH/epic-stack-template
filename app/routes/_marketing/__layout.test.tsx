/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import { MarketingLayout } from './__layout.tsx'

/**
 * Render the marketing layout inside a stub `root` route whose loader supplies
 * the `requestInfo` the navbar's accent/theme switches read (they throw without
 * it). The layout now wraps its children in the universal AppShell navbar
 * (`marketing` variant), so the chrome assertions mirror the public blog's.
 */
function renderLayout(children: React.ReactNode) {
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
					index: true,
					Component: () => <MarketingLayout>{children}</MarketingLayout>,
				},
			],
		},
	])
	render(<Stub initialEntries={['/']} />)
}

test('renders the unified AppShell navbar: Über + Blog links and the guest CTA', async () => {
	renderLayout(<p>child content</p>)

	const nav = await screen.findByRole('navigation', { name: 'Primary' })
	expect(nav).toBeInTheDocument()
	expect(screen.getByRole('link', { name: 'Über' })).toHaveAttribute(
		'href',
		'/about',
	)
	expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute(
		'href',
		'/blog',
	)
	// Logged-out guest CTA → signup (the marketing variant), not a Log In button.
	expect(screen.getByRole('link', { name: /los geht's/i })).toHaveAttribute(
		'href',
		'/signup',
	)
})

test('preserves the branded footer as a contentinfo landmark', async () => {
	renderLayout(<p>child content</p>)

	expect(await screen.findByRole('contentinfo')).toBeInTheDocument()
})

test('renders its children inside the main landmark', async () => {
	renderLayout(<p>child content</p>)

	const main = await screen.findByRole('main')
	expect(main).toContainElement(screen.getByText('child content'))
})
