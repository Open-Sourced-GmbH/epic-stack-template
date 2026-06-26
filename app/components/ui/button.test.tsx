/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Button } from './button.tsx'

test('renders children with the default size (h-8, px-3)', () => {
	render(<Button>Save</Button>)

	const button = screen.getByRole('button', { name: 'Save' })
	expect(button).toHaveAttribute('data-slot', 'button')
	expect(button).toHaveClass('h-8', 'px-3')
})

test('sm steps down to a 28px height with px-2.5', () => {
	render(<Button size="sm">Small</Button>)

	expect(screen.getByRole('button')).toHaveClass('h-7', 'px-2.5')
})

test('lg steps up to a 40px height with px-5', () => {
	render(<Button size="lg">Large</Button>)

	expect(screen.getByRole('button')).toHaveClass('h-10', 'px-5')
})

test('pill keeps the default height but goes fully rounded', () => {
	render(<Button size="pill">Pill</Button>)

	const button = screen.getByRole('button')
	expect(button).toHaveClass('h-8', 'px-5', 'rounded-full')
})

test('wide keeps the default height and spans the full width', () => {
	render(<Button size="wide">Wide</Button>)

	expect(screen.getByRole('button')).toHaveClass('h-8', 'w-full')
})

test('icon is a 32px square', () => {
	render(<Button size="icon" aria-label="Icon" />)

	expect(screen.getByRole('button')).toHaveClass('size-8')
})

test('icon-sm is a 28px square', () => {
	render(<Button size="icon-sm" aria-label="Icon small" />)

	expect(screen.getByRole('button')).toHaveClass('size-7')
})

test('icon-lg is a 40px square', () => {
	render(<Button size="icon-lg" aria-label="Icon large" />)

	expect(screen.getByRole('button')).toHaveClass('size-10')
})

test('merges a custom className onto the root', () => {
	render(<Button className="uppercase">Custom</Button>)

	expect(screen.getByRole('button')).toHaveClass('h-8', 'uppercase')
})
