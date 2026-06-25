/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import RoleEditor from './$id.tsx'

type LoaderData = {
	isNew: boolean
	role: {
		id: string
		name: string
		description: string
		system: boolean
		userCount: number
		grants: string[]
		lockedGrants: string[]
	}
}

function loaderData(overrides: Partial<LoaderData['role']> = {}): LoaderData {
	return {
		isNew: false,
		role: {
			id: 'role-1',
			name: 'Editor',
			description: 'Edits content',
			system: false,
			userCount: 0,
			grants: [],
			lockedGrants: [],
			...overrides,
		},
	}
}

function renderEditor(data: LoaderData, action?: () => unknown) {
	const Stub = createRoutesStub([
		{
			path: '/admin/roles/:id',
			Component: RoleEditor,
			loader: () => data,
			action: action ?? (() => ({ ok: true })),
			HydrateFallback: () => null,
		},
	])
	render(<Stub initialEntries={['/admin/roles/role-1']} />)
}

test('renders the Details and Permissions cards with the matrix', async () => {
	renderEditor(loaderData())

	expect(
		await screen.findByRole('heading', { name: 'Editor', level: 1 }),
	).toBeInTheDocument()
	expect(screen.getByRole('grid', { name: /permission grants/i })).toBeInTheDocument()
	// One chip per supported scope — Users carry both own and any.
	expect(
		screen.getByRole('button', { name: /read users \(own\)/i }),
	).toBeInTheDocument()
	expect(
		screen.getByRole('button', { name: /read users \(any\)/i }),
	).toBeInTheDocument()
	// Posts are never owner-scoped, so only an "any" chip.
	expect(
		screen.queryByRole('button', { name: /read posts \(own\)/i }),
	).not.toBeInTheDocument()
})

test('toggling a grant flips the chip, bumps the count, and reveals the save bar', async () => {
	const user = userEvent.setup()
	renderEditor(loaderData())

	// No unsaved-changes bar before any edit.
	expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument()
	expect(await screen.findByText(/^0 grants$/i)).toBeInTheDocument()

	const chip = screen.getByRole('button', { name: /read posts \(any\)/i })
	expect(chip).toHaveAttribute('aria-pressed', 'false')
	await user.click(chip)

	expect(chip).toHaveAttribute('aria-pressed', 'true')
	expect(screen.getByText(/^1 grant$/i)).toBeInTheDocument()
	expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
	expect(
		screen.getByRole('button', { name: /save changes/i }),
	).toBeInTheDocument()
})

test('a locked grant is non-toggleable and shows no save bar on click', async () => {
	const user = userEvent.setup()
	renderEditor(
		loaderData({
			grants: ['read:user:any', 'read:role:any'],
			lockedGrants: ['read:user:any'],
		}),
	)

	const locked = await screen.findByRole('button', { name: /read users \(any\)/i })
	expect(locked).toHaveAttribute('aria-disabled', 'true')
	expect(locked).toHaveAttribute('aria-pressed', 'true')

	await user.click(locked)
	// Still pressed, and no dirty state — the click was ignored.
	expect(locked).toHaveAttribute('aria-pressed', 'true')
	expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument()
})

test('a system role locks the name input but keeps the matrix editable', async () => {
	const user = userEvent.setup()
	renderEditor(loaderData({ system: true, name: 'admin' }))

	const nameInput = await screen.findByLabelText(/name/i)
	expect(nameInput).toBeDisabled()

	// Grants are still editable on a system role.
	const chip = screen.getByRole('button', { name: /read posts \(any\)/i })
	await user.click(chip)
	expect(chip).toHaveAttribute('aria-pressed', 'true')
	expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
})

test('a blocked save surfaces the change-blocked alert', async () => {
	const user = userEvent.setup()
	renderEditor(loaderData(), () => ({
		ok: false,
		blocked: 'This change would remove the last administrator.',
	}))

	// Make the form dirty, then save to trigger the (stubbed) blocked action.
	await user.click(
		await screen.findByRole('button', { name: /read posts \(any\)/i }),
	)
	await user.click(screen.getByRole('button', { name: /save changes/i }))

	expect(await screen.findByText(/change blocked/i)).toBeInTheDocument()
	expect(
		screen.getByText(/remove the last administrator/i),
	).toBeInTheDocument()
})
