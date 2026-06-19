/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Checkbox } from './checkbox.tsx'

test('paints the invalid border token when aria-invalid is set', () => {
	render(<Checkbox aria-invalid aria-label="Accept" />)

	const checkbox = screen.getByRole('checkbox', { name: 'Accept' })
	expect(checkbox).toHaveAttribute('aria-invalid', 'true')
	// Mirrors the Input treatment: aria-invalid repaints the border.
	expect(checkbox).toHaveClass('aria-[invalid]:border-input-invalid')
})
