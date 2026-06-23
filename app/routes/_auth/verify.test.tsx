/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import { expect, test } from 'vitest'
import { honeypot } from '#app/utils/honeypot.server.ts'
import { default as VerifyRoute } from './verify.tsx'

// The restyled verify screen carries the OTP entry for onboarding/reset-password
// /change-email and the login-time 2FA challenge. The reset-password and 2fa
// e2e flows scope to the `main` landmark and drive the "Code" field + "Submit"
// button, so the shell restyle must preserve those (EPT-62).
test('the restyled verify screen keeps the main landmark, code field and submit', async () => {
	const honeyProps = await honeypot.getInputProps()
	const App = createRoutesStub([{ path: '/verify', Component: VerifyRoute }])

	render(
		<HoneypotProvider {...honeyProps}>
			<App
				initialEntries={['/verify?type=reset-password&target=kody@kcd.dev']}
			/>
		</HoneypotProvider>,
	)

	const main = await screen.findByRole('main')
	expect(main).toHaveTextContent(/check your email/i)
	expect(screen.getByRole('textbox', { name: /code/i })).toBeVisible()
	expect(screen.getByRole('button', { name: /submit/i })).toBeVisible()
})

test('the verify screen renders the 2FA challenge heading for type=2fa', async () => {
	const honeyProps = await honeypot.getInputProps()
	const App = createRoutesStub([{ path: '/verify', Component: VerifyRoute }])

	render(
		<HoneypotProvider {...honeyProps}>
			<App initialEntries={['/verify?type=2fa']} />
		</HoneypotProvider>,
	)

	expect(await screen.findByRole('main')).toHaveTextContent(/check your 2fa app/i)
	expect(screen.getByRole('button', { name: /submit/i })).toBeVisible()
})
