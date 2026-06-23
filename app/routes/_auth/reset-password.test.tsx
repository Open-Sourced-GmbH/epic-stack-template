/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import { default as ResetPasswordRoute } from './reset-password.tsx'

// Mismatched passwords fail the client-side Conform/Zod validation before the
// form ever reaches the (frozen) action, so the restyled `Field` raises "The
// passwords must match" in an `ErrorList` and marks the confirm input
// `aria-invalid` (EPT-62 AC).
test('a password mismatch marks the confirm field invalid with an error', async () => {
	const App = createRoutesStub([
		{
			path: '/reset-password',
			Component: ResetPasswordRoute,
			loader: () => ({ resetPasswordUsername: 'kody' }),
			HydrateFallback: () => null,
		},
	])

	render(<App initialEntries={['/reset-password']} />)

	const user = userEvent.setup()
	await user.type(
		await screen.findByLabelText(/^new password$/i),
		'one-good-password',
	)
	await user.type(
		screen.getByLabelText(/^confirm password$/i),
		'a-different-password',
	)
	await user.click(screen.getByRole('button', { name: /reset password/i }))

	expect(await screen.findByText(/the passwords must match/i)).toBeVisible()
	expect(screen.getByLabelText(/^confirm password$/i)).toHaveAttribute(
		'aria-invalid',
		'true',
	)
})
