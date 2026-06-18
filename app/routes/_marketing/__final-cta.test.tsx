/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import { FinalCta } from './__final-cta.tsx'

function renderInRouter(ui: React.ReactNode) {
	const Stub = createRoutesStub([{ path: '/', Component: () => ui }])
	render(<Stub initialEntries={['/']} />)
}

test('renders the closing contact section landmark with a heading', () => {
	renderInRouter(<FinalCta />)

	const region = screen.getByRole('region', { name: /worth shipping/i })
	expect(region).toHaveAttribute('id', 'contact')
})

test('offers a primary "Start a project" action and a secondary "Book a call"', () => {
	renderInRouter(<FinalCta />)

	expect(
		screen.getByRole('link', { name: /start a project/i }),
	).toBeInTheDocument()
	expect(screen.getByRole('link', { name: /book a call/i })).toBeInTheDocument()
})
