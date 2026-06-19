/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Spinner } from './spinner.tsx'

test('renders an inline status region with a spinning icon', () => {
	render(<Spinner />)

	const status = screen.getByRole('status')
	expect(status.querySelector('svg')).toHaveClass('animate-spin')
})

test('drops the animation under prefers-reduced-motion', () => {
	render(<Spinner />)

	expect(screen.getByRole('status').querySelector('svg')).toHaveClass(
		'motion-reduce:animate-none',
	)
})

test('forwards a custom title as the accessible label', () => {
	render(<Spinner title="Saving…" />)

	expect(screen.getByTitle('Saving…')).toBeInTheDocument()
})

test('merges a custom className onto the status wrapper', () => {
	render(<Spinner className="size-4" />)

	expect(screen.getByRole('status')).toHaveClass('size-4')
})
