/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Work } from './__work.tsx'

test('renders a work section landmark with a heading', () => {
	render(<Work />)

	const region = screen.getByRole('region', { name: /shipped/i })
	expect(region).toHaveAttribute('id', 'work')
})

test('shows the three reference projects', () => {
	render(<Work />)

	const region = screen.getByRole('region', { name: /shipped/i })
	const projects = within(region).getAllByRole('heading', { level: 3 })
	expect(projects.map((p) => p.textContent)).toEqual([
		'Open Sourced',
		'Xiquell',
		'Livediag',
	])
})

test('gives each project a static preview image with descriptive alt text', () => {
	render(<Work />)

	const region = screen.getByRole('region', { name: /shipped/i })
	const images = within(region).getAllByRole('img')
	expect(images).toHaveLength(3)
	for (const image of images) {
		expect(image).toHaveAttribute('src')
		expect(image.getAttribute('alt')).toBeTruthy()
	}
})

test('links each project to its real domain, opening safely in a new tab', () => {
	render(<Work />)

	const link = screen.getByRole('link', { name: /opensourced\.ch/i })
	expect(link).toHaveAttribute('href', 'https://opensourced.ch')
	expect(link).toHaveAttribute('target', '_blank')
	expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
})
