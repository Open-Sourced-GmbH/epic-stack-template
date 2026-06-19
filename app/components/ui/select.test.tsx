/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from './select.tsx'

test('trigger is a combobox styled to match Input', () => {
	render(
		<Select>
			<SelectTrigger aria-label="Fruit">
				<SelectValue placeholder="Pick one" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="apple">Apple</SelectItem>
			</SelectContent>
		</Select>,
	)

	const trigger = screen.getByRole('combobox', { name: 'Fruit' })
	// Mirrors the Input treatment: same border/background tokens and height.
	expect(trigger).toHaveClass('border-input')
	expect(trigger).toHaveClass('bg-background')
})

test('paints the invalid border token when aria-invalid is set', () => {
	render(
		<Select>
			<SelectTrigger aria-invalid aria-label="Fruit">
				<SelectValue placeholder="Pick one" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="apple">Apple</SelectItem>
			</SelectContent>
		</Select>,
	)

	const trigger = screen.getByRole('combobox', { name: 'Fruit' })
	expect(trigger).toHaveAttribute('aria-invalid', 'true')
	// Mirrors the Input treatment: aria-invalid repaints the border.
	expect(trigger).toHaveClass('aria-[invalid]:border-input-invalid')
})

test('renders the placeholder until a value is selected', () => {
	render(
		<Select>
			<SelectTrigger aria-label="Fruit">
				<SelectValue placeholder="Pick a fruit" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="apple">Apple</SelectItem>
				<SelectItem value="banana">Banana</SelectItem>
			</SelectContent>
		</Select>,
	)

	expect(screen.getByText('Pick a fruit')).toBeInTheDocument()
})

test('reflects the controlled value in the trigger', () => {
	render(
		<Select value="banana">
			<SelectTrigger aria-label="Fruit">
				<SelectValue placeholder="Pick a fruit" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="apple">Apple</SelectItem>
				<SelectItem value="banana">Banana</SelectItem>
			</SelectContent>
		</Select>,
	)

	const trigger = screen.getByRole('combobox', { name: 'Fruit' })
	expect(trigger).toHaveTextContent('Banana')
})
