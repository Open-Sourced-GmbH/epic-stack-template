/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Avatar, AvatarFallback, AvatarImage } from './avatar.tsx'

test('renders the initials fallback when the image has not loaded', () => {
	// jsdom never fires the <img> load event, so Radix shows the fallback —
	// the same path a real browser takes for a missing/slow image.
	render(
		<Avatar>
			<AvatarImage src="/broken.png" alt="Ada Lovelace" />
			<AvatarFallback>AL</AvatarFallback>
		</Avatar>,
	)

	expect(screen.getByText('AL')).toBeInTheDocument()
})

test('the fallback uses the muted token pair (no hardcoded colors)', () => {
	render(
		<Avatar>
			<AvatarImage src="/broken.png" alt="Ada Lovelace" />
			<AvatarFallback>AL</AvatarFallback>
		</Avatar>,
	)

	const fallback = screen.getByText('AL')
	expect(fallback).toHaveClass('bg-muted')
	expect(fallback).toHaveClass('text-muted-foreground')
})

test('the root is a clipped circle that accepts size overrides', () => {
	render(
		<Avatar className="size-16">
			<AvatarFallback>AL</AvatarFallback>
		</Avatar>,
	)

	// The fallback's parent is the Avatar root.
	const root = screen.getByText('AL').parentElement
	expect(root).toHaveClass('rounded-full')
	expect(root).toHaveClass('overflow-hidden')
	// Caller overrides merge over the default size.
	expect(root).toHaveClass('size-16')
})
