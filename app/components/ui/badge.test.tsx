/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Badge } from './badge.tsx'

test('renders children on the default (primary) variant', () => {
	render(<Badge>New</Badge>)

	const badge = screen.getByText('New')
	expect(badge).toHaveAttribute('data-slot', 'badge')
	expect(badge).toHaveClass('bg-primary', 'text-primary-foreground')
})

test('applies the secondary variant', () => {
	render(<Badge variant="secondary">Secondary</Badge>)

	expect(screen.getByText('Secondary')).toHaveClass(
		'bg-secondary',
		'text-secondary-foreground',
	)
})

test('applies the destructive variant', () => {
	render(<Badge variant="destructive">Destructive</Badge>)

	expect(screen.getByText('Destructive')).toHaveClass(
		'bg-destructive',
		'text-destructive-foreground',
	)
})

test('applies the outline variant with a hairline border', () => {
	render(<Badge variant="outline">Outline</Badge>)

	expect(screen.getByText('Outline')).toHaveClass('border-border', 'text-foreground')
})

test('merges a custom className onto the root', () => {
	render(<Badge className="uppercase">Custom</Badge>)

	const badge = screen.getByText('Custom')
	expect(badge).toHaveClass('bg-primary', 'uppercase')
})
