/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Services } from './__services.tsx'

test('renders a services section landmark with a heading', () => {
	render(<Services />)

	const region = screen.getByRole('region', { name: /under one roof/i })
	expect(region).toHaveAttribute('id', 'services')
})

test('renders the three service offerings', () => {
	render(<Services />)

	const region = screen.getByRole('region', { name: /under one roof/i })
	const cards = within(region).getAllByRole('heading', { level: 3 })
	expect(cards.map((c) => c.textContent)).toEqual([
		'Product design',
		'Front-end engineering',
		'Launch & iterate',
	])
})
