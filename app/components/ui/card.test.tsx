/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from './card.tsx'

test('Card renders children on a card surface', () => {
	render(<Card>Surface content</Card>)

	const card = screen.getByText('Surface content')
	expect(card).toHaveAttribute('data-slot', 'card')
	expect(card).toHaveClass('bg-card', 'text-card-foreground', 'border')
})

test('composes header/title/description/content/footer sub-parts', () => {
	render(
		<Card>
			<CardHeader>
				<CardTitle>Plan</CardTitle>
				<CardDescription>Everything you need</CardDescription>
			</CardHeader>
			<CardContent>Body</CardContent>
			<CardFooter>Footer</CardFooter>
		</Card>,
	)

	expect(screen.getByText('Plan')).toHaveAttribute('data-slot', 'card-title')
	expect(screen.getByText('Everything you need')).toHaveAttribute(
		'data-slot',
		'card-description',
	)
	expect(screen.getByText('Body')).toHaveAttribute('data-slot', 'card-content')
	expect(screen.getByText('Footer')).toHaveAttribute('data-slot', 'card-footer')
})

test('merges a custom className onto the root surface', () => {
	render(<Card className="max-w-sm">Surface</Card>)

	const card = screen.getByText('Surface')
	expect(card).toHaveClass('bg-card', 'max-w-sm')
})
