/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Alert, AlertDescription, AlertTitle } from './alert.tsx'

test('renders the default (info) tone as a polite status region', () => {
	render(
		<Alert>
			<AlertTitle>Heads up</AlertTitle>
			<AlertDescription>Something you should know.</AlertDescription>
		</Alert>,
	)

	const alert = screen.getByRole('status')
	expect(alert).toHaveAttribute('data-slot', 'alert')
	expect(alert).toHaveClass('bg-muted', 'text-foreground')
	expect(screen.getByText('Heads up')).toHaveAttribute(
		'data-slot',
		'alert-title',
	)
	expect(screen.getByText('Something you should know.')).toHaveAttribute(
		'data-slot',
		'alert-description',
	)
})

test('success tone uses the brand surface and stays a status region', () => {
	render(<Alert tone="success">Saved</Alert>)

	const alert = screen.getByRole('status')
	expect(alert).toHaveClass('border-brand', 'bg-brand-soft')
})

test('warning tone is a status region on the destructive ramp', () => {
	render(<Alert tone="warning">Careful</Alert>)

	expect(screen.getByRole('status')).toHaveClass(
		'border-destructive/40',
		'bg-destructive/5',
	)
})

test('error tone is announced assertively and uses the error-text token', () => {
	render(<Alert tone="error">It broke</Alert>)

	const alert = screen.getByRole('alert')
	expect(alert).toHaveClass('border-destructive', 'text-error-text')
})

test('an explicit role overrides the tone default', () => {
	render(
		<Alert tone="error" role="status">
			Quiet failure
		</Alert>,
	)

	expect(screen.getByRole('status')).toBeInTheDocument()
	expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('merges a custom className onto the root', () => {
	render(<Alert className="mt-4">Spaced</Alert>)

	expect(screen.getByRole('status')).toHaveClass('bg-muted', 'mt-4')
})
