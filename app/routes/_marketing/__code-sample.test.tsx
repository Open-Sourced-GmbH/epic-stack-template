/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, expect, test } from 'vitest'
import { CodeSample } from './__code-sample.tsx'

// Radix Checkbox measures itself via ResizeObserver, which jsdom lacks.
beforeAll(() => {
	globalThis.ResizeObserver ??= class {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
})

test('renders a section landmark labelled by its heading', () => {
	render(<CodeSample />)

	const heading = screen.getByRole('heading', { level: 2 })
	const region = heading.closest('section')
	expect(region).toHaveAttribute('id', 'code-sample')
	expect(region).toHaveAttribute('aria-labelledby', heading.id)
})

test('shows the source on the left as a copyable code block', () => {
	render(<CodeSample />)

	expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
})

test('renders the live sign-in card from real Foundation components', () => {
	render(<CodeSample />)

	expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
	expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
	expect(
		screen.getByRole('checkbox', { name: /remember me/i }),
	).toBeInTheDocument()
	expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
})

test('the live checkbox toggles on click (onCheckedChange wired)', () => {
	render(<CodeSample />)

	const checkbox = screen.getByRole('checkbox', { name: /remember me/i })
	expect(checkbox).not.toBeChecked()

	fireEvent.click(checkbox)
	expect(checkbox).toBeChecked()
})
