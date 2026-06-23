/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { FormCard } from './form-card.tsx'

test('renders body children inside a padded surface', () => {
	render(
		<FormCard>
			<button type="button">Save</button>
		</FormCard>,
	)

	expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
})

test('renders the title as an accessible heading (h2 by default) at text-h6', () => {
	render(<FormCard title="Profile" />)

	const heading = screen.getByRole('heading', { name: 'Profile' })
	expect(heading.tagName).toBe('H2')
	expect(heading).toHaveClass('text-h6')
})

test('headingLevel picks the heading element', () => {
	render(<FormCard title="Sign in" headingLevel={1} />)

	expect(
		screen.getByRole('heading', { level: 1, name: 'Sign in' }),
	).toBeInTheDocument()
})

test('renders the description as muted text under the title', () => {
	render(
		<FormCard title="Profile" description="Update your name and username." />,
	)

	const description = screen.getByText('Update your name and username.')
	expect(description).toHaveClass('text-muted-foreground')
})

test('omits the header entirely when neither title nor description is given', () => {
	const { container } = render(
		<FormCard>
			<span>body</span>
		</FormCard>,
	)

	expect(
		container.querySelector('[data-slot="form-card-header"]'),
	).toBeNull()
})

test('renders a header for a description-only section', () => {
	const { container } = render(<FormCard description="Standalone note." />)

	expect(
		container.querySelector('[data-slot="form-card-header"]'),
	).not.toBeNull()
	expect(screen.queryByRole('heading')).not.toBeInTheDocument()
})

test('destructive variant tints the surface and the title', () => {
	const { container } = render(
		<FormCard variant="destructive" title="Delete account & data" />,
	)

	const card = container.querySelector('[data-slot="form-card"]')
	expect(card).toHaveClass('bg-destructive/5')
	expect(card).toHaveClass('border-destructive/35')
	expect(screen.getByRole('heading', { name: 'Delete account & data' })).toHaveClass(
		'text-destructive',
	)
})

test('default variant uses the card surface', () => {
	const { container } = render(<FormCard title="Profile" />)

	const card = container.querySelector('[data-slot="form-card"]')
	expect(card).toHaveClass('bg-card')
	expect(card).toHaveClass('border-border')
})
