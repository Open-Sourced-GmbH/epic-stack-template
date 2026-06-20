/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import { CodeSample } from './__code-sample.tsx'

/**
 * Render the section inside a router stub whose `/resources/honeypot-demo` action
 * mirrors the real one: a filled `name__confirm` trap is spam (400), an empty one
 * passes. Lets the tests drive the actual fetcher roundtrip the demo relies on.
 */
function renderSection() {
	const Stub = createRoutesStub([
		{ path: '/', Component: () => <CodeSample /> },
		{
			path: '/resources/honeypot-demo',
			action: async ({ request }) => {
				const formData = await request.formData()
				const trap = formData.get('name__confirm')
				if (trap) {
					return Response.json(
						{ verdict: 'rejected', reason: 'Field "name__confirm" was not empty' },
						{ status: 400 },
					)
				}
				return Response.json({ verdict: 'accepted' })
			},
		},
	])
	render(<Stub />)
}

test('renders a section landmark labelled by its heading', () => {
	renderSection()

	const heading = screen.getByRole('heading', { level: 2 })
	const region = heading.closest('section')
	expect(region).toHaveAttribute('id', 'code-sample')
	expect(region).toHaveAttribute('aria-labelledby', heading.id)
})

test('shows the honeypot source on the left as a copyable code block', () => {
	renderSection()

	expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
	expect(screen.getByText(/honeypot\.check/i)).toBeInTheDocument()
})

test('renders the live form with both the human and the bot path', () => {
	renderSection()

	expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
	expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
	expect(
		screen.getByRole('button', { name: /simulate bot/i }),
	).toBeInTheDocument()
})

test('a clean "Sign in" submit is accepted by the server', async () => {
	const user = userEvent.setup()
	renderSection()

	await user.click(screen.getByRole('button', { name: /sign in/i }))

	const status = await screen.findByRole('status')
	expect(status).toHaveTextContent(/accepted/i)
})

test('"Simulate bot" fills the hidden trap and is rejected with a 400', async () => {
	const user = userEvent.setup()
	renderSection()

	await user.click(screen.getByRole('button', { name: /simulate bot/i }))

	const status = await screen.findByRole('status')
	await waitFor(() => expect(status).toHaveTextContent(/rejected \(400\)/i))
	expect(status).toHaveTextContent(/SpamError/i)
})
