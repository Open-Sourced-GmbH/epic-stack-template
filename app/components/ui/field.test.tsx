/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Field, FormField } from './field.tsx'
import { Input } from './input.tsx'

test('renders the label wired to the control by htmlFor↔id', () => {
	render(
		<Field label="Email" htmlFor="email">
			<Input type="email" />
		</Field>,
	)

	const input = screen.getByLabelText('Email')
	expect(input).toHaveAttribute('id', 'email')
})

test('error marks the control aria-invalid and links it to the error text', () => {
	render(
		<Field label="Email" htmlFor="email" error="Enter a valid email">
			<Input type="email" />
		</Field>,
	)

	const input = screen.getByLabelText('Email')
	const error = screen.getByText('Enter a valid email')
	expect(input).toHaveAttribute('aria-invalid', 'true')
	expect(input.getAttribute('aria-describedby')).toBe(error.id)
	expect(error.id).toBeTruthy()
})

test('no error → control is not aria-invalid and has no describedby', () => {
	render(
		<Field label="Email" htmlFor="email">
			<Input type="email" />
		</Field>,
	)

	const input = screen.getByLabelText('Email')
	expect(input).not.toHaveAttribute('aria-invalid')
	expect(input).not.toHaveAttribute('aria-describedby')
})

test('description is rendered and linked via aria-describedby', () => {
	render(
		<Field
			label="Email"
			htmlFor="email"
			description="We never share it."
			error="Enter a valid email"
		>
			<Input type="email" />
		</Field>,
	)

	const input = screen.getByLabelText('Email')
	const description = screen.getByText('We never share it.')
	const error = screen.getByText('Enter a valid email')
	const describedBy = input.getAttribute('aria-describedby')?.split(' ')
	expect(describedBy).toContain(description.id)
	expect(describedBy).toContain(error.id)
})

test('required conveys an asterisk and aria-required on the control', () => {
	render(
		<Field label="Email" htmlFor="email" required>
			<Input type="email" />
		</Field>,
	)

	const input = screen.getByRole('textbox')
	expect(input).toHaveAttribute('id', 'email')
	expect(input).toHaveAttribute('aria-required', 'true')
	expect(screen.getByText('*')).toBeInTheDocument()
})

test('FormField is an alias for Field', () => {
	expect(FormField).toBe(Field)
})
