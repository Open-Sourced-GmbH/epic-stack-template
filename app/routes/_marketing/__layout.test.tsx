/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { MarketingLayout } from './__layout.tsx'

beforeEach(() => {
	// The theme customizer reads matchMedia on mount; default to reduced motion.
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

function renderLayout(children: React.ReactNode) {
	const Stub = createRoutesStub([
		{ path: '/', Component: () => <MarketingLayout>{children}</MarketingLayout> },
	])
	render(<Stub initialEntries={['/']} />)
}

test('renders the shared chrome: header, footer, and theme switcher', () => {
	renderLayout(<p>child content</p>)

	expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
	expect(screen.getByRole('contentinfo')).toBeInTheDocument()
	expect(
		screen.getByRole('button', { name: /customize theme/i }),
	).toBeInTheDocument()
})

test('renders its children inside the main landmark', () => {
	renderLayout(<p>child content</p>)

	const main = screen.getByRole('main')
	expect(main).toContainElement(screen.getByText('child content'))
})
