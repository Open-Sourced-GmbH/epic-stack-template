/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Skeleton } from './skeleton.tsx'

test('renders a pulsing placeholder on muted tokens, gated by reduced motion', () => {
	render(<Skeleton data-testid="ph" />)

	const skeleton = screen.getByTestId('ph')
	expect(skeleton).toHaveAttribute('data-slot', 'skeleton')
	expect(skeleton).toHaveClass(
		'bg-muted',
		'rounded',
		'animate-pulse',
		'motion-reduce:animate-none',
	)
})

test('merges a custom className onto the root', () => {
	render(<Skeleton data-testid="ph" className="h-4 w-32" />)

	const skeleton = screen.getByTestId('ph')
	expect(skeleton).toHaveClass('bg-muted', 'h-4', 'w-32')
})

test('forwards native attributes to the underlying element', () => {
	render(<Skeleton data-testid="ph" aria-hidden />)

	expect(screen.getByTestId('ph')).toHaveAttribute('aria-hidden', 'true')
})
