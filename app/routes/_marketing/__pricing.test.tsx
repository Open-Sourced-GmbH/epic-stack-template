/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import { Pricing } from './__pricing.tsx'

function renderInRouter(ui: React.ReactNode) {
	const Stub = createRoutesStub([{ path: '/', Component: () => ui }])
	render(<Stub initialEntries={['/']} />)
}

test('renders a pricing section landmark labelled by its heading', () => {
	renderInRouter(<Pricing />)

	const heading = screen.getByRole('heading', { level: 2 })
	const region = heading.closest('section')
	expect(region).toHaveAttribute('id', 'pricing')
	expect(region).toHaveAttribute('aria-labelledby', heading.id)
})

test('renders all three tiers by name', () => {
	renderInRouter(<Pricing />)

	for (const tier of ['Sprint', 'Project', 'Embedded']) {
		expect(
			screen.getByRole('heading', { name: tier, level: 3 }),
		).toBeInTheDocument()
	}
})

test('prices every tier in CHF', () => {
	renderInRouter(<Pricing />)

	expect(screen.getAllByText(/CHF/)).toHaveLength(3)
})

test('marks exactly one tier (Project) as the featured option', () => {
	renderInRouter(<Pricing />)

	const badge = screen.getByText(/most popular/i)
	const card = badge.closest('li')
	expect(within(card!).getByRole('heading', { level: 3 })).toHaveTextContent(
		'Project',
	)
	expect(screen.getAllByText(/most popular/i)).toHaveLength(1)
})

test('gives every tier a CTA linking to the contact anchor', () => {
	renderInRouter(<Pricing />)

	const ctas = screen.getAllByRole('link')
	expect(ctas).toHaveLength(3)
	for (const cta of ctas) expect(cta).toHaveAttribute('href', '#contact')
})

test('lists feature bullets for each tier', () => {
	renderInRouter(<Pricing />)

	// Each tier owns a feature list, alongside the outer grid list.
	const lists = screen.getAllByRole('list')
	expect(lists.length).toBeGreaterThanOrEqual(4)
})
