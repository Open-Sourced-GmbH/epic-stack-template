/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { PageHeader } from './page-header.tsx'

test('renders the title as an accessible heading (h2 by default)', () => {
	render(<PageHeader title="Team members" />)

	const heading = screen.getByRole('heading', { name: 'Team members' })
	expect(heading.tagName).toBe('H2')
	expect(heading).toHaveClass('text-h4')
})

test('headingLevel picks the heading element', () => {
	render(<PageHeader title="Sign in" headingLevel={1} />)

	expect(
		screen.getByRole('heading', { level: 1, name: 'Sign in' }),
	).toBeInTheDocument()
})

test('renders the eyebrow on brand, uppercased', () => {
	render(<PageHeader eyebrow="Admin" title="Blog" />)

	const eyebrow = screen.getByText('Admin')
	expect(eyebrow).toHaveClass('text-brand')
	expect(eyebrow).toHaveClass('uppercase')
})

test('omits the eyebrow when not provided', () => {
	render(<PageHeader title="Blog" />)

	expect(screen.queryByText('Admin')).not.toBeInTheDocument()
})

test('renders an actions slot when provided', () => {
	render(
		<PageHeader
			title="Blog"
			actions={<button type="button">New post</button>}
		/>,
	)

	expect(
		screen.getByRole('button', { name: 'New post' }),
	).toBeInTheDocument()
})

test('omits the actions slot when not provided', () => {
	const { container } = render(<PageHeader title="Blog" />)

	expect(
		container.querySelector('[data-slot="page-header-actions"]'),
	).toBeNull()
})
