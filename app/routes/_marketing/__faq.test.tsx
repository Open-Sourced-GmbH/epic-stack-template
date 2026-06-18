/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import { Faq } from './__faq.tsx'

function renderInRouter(ui: React.ReactNode) {
	const Stub = createRoutesStub([{ path: '/', Component: () => ui }])
	render(<Stub initialEntries={['/']} />)
}

test('renders an FAQ section landmark with a heading', () => {
	renderInRouter(<Faq />)

	const region = screen.getByRole('region', { name: /frequently asked/i })
	expect(region).toHaveAttribute('id', 'faq')
})

test('surfaces every question as an accordion trigger', () => {
	renderInRouter(<Faq />)

	const triggers = screen.getAllByRole('button')
	expect(triggers.length).toBeGreaterThanOrEqual(4)
})

test('opens the first question by default and reveals its answer', () => {
	renderInRouter(<Faq />)

	const triggers = screen.getAllByRole('button')
	expect(triggers[0]).toHaveAttribute('aria-expanded', 'true')
	expect(triggers[1]).toHaveAttribute('aria-expanded', 'false')
})

test('is single-open: opening another question closes the first', async () => {
	const user = userEvent.setup()
	renderInRouter(<Faq />)

	const triggers = screen.getAllByRole('button')
	await user.click(triggers[1]!)

	expect(triggers[1]).toHaveAttribute('aria-expanded', 'true')
	expect(triggers[0]).toHaveAttribute('aria-expanded', 'false')
})

test('offers a "Talk to us" CTA linking to the contact anchor', () => {
	renderInRouter(<Faq />)

	expect(screen.getByRole('link', { name: /talk to us/i })).toHaveAttribute(
		'href',
		'#contact',
	)
})
