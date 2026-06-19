/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { HowItWorks } from './__how-it-works.tsx'

test('renders a how-it-works section landmark with a heading', () => {
	render(<HowItWorks />)

	const region = screen.getByRole('region', { name: /four steps/i })
	expect(region).toHaveAttribute('id', 'how-it-works')
})

test('lays out the four process steps in order', () => {
	render(<HowItWorks />)

	const region = screen.getByRole('region', { name: /four steps/i })
	const steps = within(region).getAllByRole('heading', { level: 3 })
	expect(steps.map((s) => s.textContent)).toEqual([
		'Brief',
		'Prototype',
		'Build',
		'Launch',
	])
})

test('tags each step with a duration chip', () => {
	render(<HowItWorks />)

	for (const duration of ['Day 1', 'Week 1', 'Weeks 2–4', 'Ship day']) {
		expect(screen.getByText(duration)).toBeVisible()
	}
})
