/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import AdminUserDetail from './$id.tsx'

type LoaderData = {
	user: {
		id: string
		name: string | null
		username: string
		email: string
		createdAt: Date
		deactivatedAt: Date | null
		image: { objectKey: string } | null
		roles: string[]
	}
	allRoles: string[]
}

function loaderData(overrides: Partial<LoaderData['user']> = {}): LoaderData {
	return {
		user: {
			id: 'user-123',
			name: 'Ada Lovelace',
			username: 'ada',
			email: 'ada@example.com',
			createdAt: new Date('2026-02-01'),
			deactivatedAt: null,
			image: null,
			roles: ['admin'],
			...overrides,
		},
		allRoles: ['admin', 'user'],
	}
}

/** Render the detail route, optionally with a stubbed action (for mutations). */
function renderDetail(
	data: LoaderData,
	action?: () => unknown,
) {
	const Stub = createRoutesStub([
		{
			path: '/admin/users/:id',
			Component: AdminUserDetail,
			loader: () => data,
			action: action ?? (() => ({ ok: true })),
			HydrateFallback: () => null,
		},
	])
	render(<Stub initialEntries={['/admin/users/user-123']} />)
}

test('renders identity, the user id in mono, role chips and the status pill', async () => {
	renderDetail(loaderData())

	// The name heads the page (and repeats in the Identity card).
	expect(
		await screen.findByRole('heading', { name: 'Ada Lovelace', level: 1 }),
	).toBeInTheDocument()
	expect(screen.getByText('ada@example.com')).toBeInTheDocument()
	// The user id renders verbatim (mono).
	expect(screen.getByText('user-123')).toBeInTheDocument()
	// The assigned role shows as a chip with a remove control.
	expect(
		screen.getByRole('button', { name: /remove admin/i }),
	).toBeInTheDocument()
	// Active by default.
	expect(screen.getByText('Active')).toBeInTheDocument()
	// Back-link to the list.
	expect(screen.getByRole('link', { name: /all users/i })).toHaveAttribute(
		'href',
		'/admin/users',
	)
})

test('a deactivated account reads "Deactivated" in the header', async () => {
	renderDetail(loaderData({ deactivatedAt: new Date('2026-03-01') }))

	expect(await screen.findByText('Deactivated')).toBeInTheDocument()
})

test('the assign combobox offers existing roles without a Create row', async () => {
	const user = userEvent.setup()
	renderDetail(loaderData({ roles: [] }))

	const combobox = await screen.findByRole('combobox', { name: /assign roles/i })
	await user.type(combobox, 'us')
	// "user" matches; no "Create" affordance (resolve-to-existing only).
	const options = within(screen.getByRole('listbox')).getAllByRole('option')
	expect(options.map((o) => o.textContent)).toEqual(['user'])
})

test('a blocked revoke surfaces the admin-floor explanatory dialog', async () => {
	const user = userEvent.setup()
	renderDetail(loaderData({ roles: ['admin'] }), () => ({
		ok: false,
		blocked: 'This change would remove the last administrator.',
	}))

	// Revoke the only admin role → the action comes back blocked.
	await user.click(
		await screen.findByRole('button', { name: /remove admin/i }),
	)

	const dialog = await screen.findByRole('dialog')
	expect(
		within(dialog).getByText(/can.t remove the last admin/i),
	).toBeInTheDocument()
	expect(
		within(dialog).getByText(/remove the last administrator/i),
	).toBeInTheDocument()
	expect(within(dialog).getByText(/what to do instead/i)).toBeInTheDocument()
})
