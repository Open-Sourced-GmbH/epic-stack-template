/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { Hero } from './__hero.tsx'

// Drive the reduced-motion path so the entrance effect bails: the hero must
// render its resting/final state (the same state SSR and no-JS visitors get).
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

test('renders the headline with a brand-accented word, eyebrow, and lead', () => {
	render(<Hero />)

	const heading = screen.getByRole('heading', { level: 1 })
	expect(heading).toHaveTextContent(/designed/i)
	expect(screen.getByText(/product engineering studio/i)).toBeVisible()
	expect(screen.getByText(/we design and build/i)).toBeVisible()
})

test('renders both CTAs linking to in-page anchors', () => {
	render(<Hero />)

	expect(screen.getByRole('link', { name: 'Start a project' })).toHaveAttribute(
		'href',
		'#contact',
	)
	expect(screen.getByRole('link', { name: 'See the work' })).toHaveAttribute(
		'href',
		'#work',
	)
})

test('renders the product panel and the "All checks passed" chip', () => {
	render(<Hero />)

	expect(screen.getByText('atlas.app')).toBeVisible()
	expect(screen.getByText('All checks passed')).toBeVisible()
})

test('resting state shows the completed build (full progress) under reduced motion', () => {
	// Reduced motion (stubbed above) makes the entrance effect bail — the same
	// resting state SSR and no-JS visitors get. The build bar must read full.
	render(<Hero />)

	expect(screen.getByText('72%')).toBeVisible()
})
