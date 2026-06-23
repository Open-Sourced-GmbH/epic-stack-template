/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import { expect, test } from 'vitest'
import { honeypot } from '#app/utils/honeypot.server.ts'
import { default as ForgotPasswordRoute } from './forgot-password.tsx'

// The restyled forgot-password screen must keep the selectors the recovery
// e2e flow drives (heading, username/email field, "Recover password" button)
// while living in the branded auth shell (EPT-62).
test('the restyled forgot-password screen keeps its recovery selectors', async () => {
	const honeyProps = await honeypot.getInputProps()
	const App = createRoutesStub([
		{ path: '/forgot-password', Component: ForgotPasswordRoute },
	])

	render(
		<HoneypotProvider {...honeyProps}>
			<App initialEntries={['/forgot-password']} />
		</HoneypotProvider>,
	)

	expect(
		await screen.findByRole('heading', { name: /forgot password/i }),
	).toBeVisible()
	expect(screen.getByRole('textbox', { name: /username/i })).toBeVisible()
	expect(
		screen.getByRole('button', { name: /recover password/i }),
	).toBeVisible()
})
