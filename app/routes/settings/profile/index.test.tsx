/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import EditUserProfile from './index.tsx'

type LoaderData = Parameters<typeof EditUserProfile>[0]['loaderData']

function makeLoaderData(overrides: Partial<LoaderData> = {}): LoaderData {
	return {
		user: {
			id: 'u1',
			name: 'Ada Lovelace',
			username: 'ada',
			allowProductEmails: true,
			image: null,
			_count: { sessions: 1 },
		},
		allowProductEmails: true,
		...overrides,
	}
}

function renderProfile(data: LoaderData) {
	const Stub = createRoutesStub([
		{
			path: '/settings/profile',
			Component: EditUserProfile,
			loader: () => data,
			HydrateFallback: () => null,
		},
	])
	render(<Stub initialEntries={['/settings/profile']} />)
}

test('the Preferences card shows the product-email switch checked when opted in', async () => {
	renderProfile(makeLoaderData({ allowProductEmails: true }))

	expect(await screen.findByText('Preferences')).toBeInTheDocument()
	const toggle = screen.getByRole('switch', { name: /product emails/i })
	expect(toggle).toBeChecked()
})

test('the product-email switch is unchecked when the user has opted out', async () => {
	renderProfile(makeLoaderData({ allowProductEmails: false }))

	const toggle = await screen.findByRole('switch', { name: /product emails/i })
	expect(toggle).not.toBeChecked()
})

test('the security linkrows moved to the sidebar — only Download stays on General', async () => {
	renderProfile(makeLoaderData())

	// The Download-your-data row stays on the General landing.
	expect(
		await screen.findByRole('link', { name: /download your data/i }),
	).toBeInTheDocument()
	// The security shortcuts now live in the sidebar, not the index body.
	expect(screen.queryByRole('link', { name: /change email/i })).toBeNull()
	expect(screen.queryByRole('link', { name: /connections/i })).toBeNull()
	expect(screen.queryByRole('link', { name: /passkeys/i })).toBeNull()
	expect(screen.queryByRole('link', { name: /password/i })).toBeNull()
})
