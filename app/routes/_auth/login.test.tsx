/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRoutesStub } from 'react-router'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import { expect, test } from 'vitest'
import { prisma } from '#app/utils/db.server.ts'
import { honeypot } from '#app/utils/honeypot.server.ts'
import { createPassword, createUser } from '#tests/db-utils.ts'
import { default as LoginRoute, action } from './login.tsx'

/** Render the login route wired to its real action + honeypot context. */
async function renderLogin() {
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
}

// Drives the real login action with credentials that match no user: `login`
// returns null, so the submission carries a form-level "Invalid username or
// password" issue. Asserts the restyled shell raises it in an `Alert`
// (`role="alert"`) and marks the fields `aria-invalid` (EPT-58 AC).
test('invalid credentials show an error alert and mark the fields invalid', async () => {
	await renderLogin()

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

// A deactivated user still knows their password, but the auth path refuses a
// session (story 33). Drives the real action: instead of the credential error,
// the route swaps to the "account is deactivated" notice naming the account.
test('a deactivated account sees the suspended notice instead of signing in', async () => {
	const password = 'still-knows-the-password'
	const user = await prisma.user.create({
		select: { username: true, email: true },
		data: {
			...createUser(),
			password: { create: createPassword(password) },
			deactivatedAt: new Date('2026-03-01'),
		},
	})

	await renderLogin()

	const actor = userEvent.setup()
	await actor.type(
		await screen.findByRole('textbox', { name: /username/i }),
		user.username,
	)
	await actor.type(screen.getByLabelText(/^password$/i), password)
	await actor.click(screen.getByRole('button', { name: /log in/i }))

	expect(
		await screen.findByText(/this account is deactivated/i),
	).toBeInTheDocument()
	expect(screen.getByText('Access suspended')).toBeInTheDocument()
	expect(screen.getByText(new RegExp(user.email))).toBeInTheDocument()
	expect(
		screen.getByRole('link', { name: /back to sign in/i }),
	).toHaveAttribute('href', '/login')
})
