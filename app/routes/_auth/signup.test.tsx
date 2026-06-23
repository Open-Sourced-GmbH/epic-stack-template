/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import { beforeAll, expect, test } from 'vitest'
import { honeypot } from '#app/utils/honeypot.server.ts'
import { default as SignupRoute } from './signup.tsx'

// The signup form embeds the Turnstile widget, which reads
// `ENV.TURNSTILE_SITE_KEY`. Without a configured key the widget renders
// nothing, so a defined-but-empty ENV keeps the render server-parity.
beforeAll(() => {
	globalThis.ENV ??= {} as typeof globalThis.ENV
})

// Renders the restyled signup surface (EPT-61) inside the auth shell and
// asserts the registration entry points survive the FormCard/Separator
// restyle: the email Field, the Submit button, the labeled OAuth separator
// with its provider row, and the cross-link back to login.
test('renders the restyled signup shell with email, OAuth row, and login link', async () => {
	const honeyProps = await honeypot.getInputProps()
	const App = createRoutesStub([
		{ path: '/signup', Component: SignupRoute },
	])

	render(
		<HoneypotProvider {...honeyProps}>
			<App initialEntries={['/signup']} />
		</HoneypotProvider>,
	)

	await expect(
		screen.findByRole('textbox', { name: /email/i }),
	).resolves.toBeVisible()
	expect(screen.getByRole('button', { name: /submit/i })).toBeVisible()
	expect(screen.getByText(/or continue with/i)).toBeVisible()
	expect(
		screen.getByRole('button', { name: /signup with github/i }),
	).toBeVisible()
	expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute(
		'href',
		'/login',
	)
})
