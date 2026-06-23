/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRoutesStub } from 'react-router'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import { expect, test } from 'vitest'
import { honeypot } from '#app/utils/honeypot.server.ts'
import { default as LoginRoute, action } from './login.tsx'

// Drives the real login action with credentials that match no user: `login`
// returns null, so the submission carries a form-level "Invalid username or
// password" issue. Asserts the restyled shell raises it in an `Alert`
// (`role="alert"`) and marks the fields `aria-invalid` (EPT-58 AC).
test('invalid credentials show an error alert and mark the fields invalid', async () => {
	const honeyProps = await honeypot.getInputProps()
	const App = createRoutesStub([
		{
			path: '/login',
			Component: LoginRoute,
			action,
			HydrateFallback: () => null,
		},
	])

	render(
		<HoneypotProvider {...honeyProps}>
			<App initialEntries={['/login']} />
		</HoneypotProvider>,
	)

	const user = userEvent.setup()
	await user.type(
		await screen.findByRole('textbox', { name: /username/i }),
		'nobodyhere123',
	)
	await user.type(screen.getByLabelText(/^password$/i), 'wrongpassword')
	await user.click(screen.getByRole('button', { name: /log in/i }))

	const alert = await screen.findByRole('alert')
	expect(alert).toHaveTextContent(/invalid username or password/i)
	expect(
		screen.getByRole('textbox', { name: /username/i }),
	).toHaveAttribute('aria-invalid', 'true')
})
