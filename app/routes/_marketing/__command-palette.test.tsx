/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRoutesStub } from 'react-router'
import { beforeAll, expect, test, vi } from 'vitest'
import { CommandShowpiece } from './__command-palette.tsx'

// cmdk scrolls the active item into view; jsdom has no layout, so stub it.
beforeAll(() => {
	Element.prototype.scrollIntoView = vi.fn()
})

// Capture toast calls without mounting a Toaster.
const { toastSuccess } = vi.hoisted(() => ({ toastSuccess: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: toastSuccess } }))

type Submission = { action: string; data: Record<string, string> }

/**
 * Render the showpiece inside a router stub whose theme resource route records
 * submissions, so tests can assert what running a theme command persists.
 */
function renderShowpiece() {
	const submissions: Submission[] = []
	const capture =
		(action: string) =>
		async ({ request }: { request: Request }) => {
			const fd = await request.formData()
			submissions.push({
				action,
				data: Object.fromEntries(fd) as Record<string, string>,
			})
			return Response.json({ result: null })
		}
	const Stub = createRoutesStub([
		{ path: '/', Component: () => <CommandShowpiece /> },
		{
			path: '/resources/theme-switch',
			action: capture('/resources/theme-switch'),
		},
	])
	render(<Stub initialEntries={['/']} />)
	return { submissions }
}

test('the global ⌘K shortcut opens the palette and Escape closes it', async () => {
	const user = userEvent.setup()
	renderShowpiece()

	expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

	await user.keyboard('{Control>}k{/Control}')
	expect(await screen.findByRole('dialog')).toBeInTheDocument()

	await user.keyboard('{Escape}')
	await waitFor(() =>
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
	)
})

test('the demo hint pill opens the same palette', async () => {
	const user = userEvent.setup()
	renderShowpiece()

	await user.click(
		screen.getByRole('button', { name: /type a command or search/i }),
	)
	expect(await screen.findByRole('dialog')).toBeInTheDocument()
})

test('the palette is seeded with the Navigation and Theme command groups', async () => {
	const user = userEvent.setup()
	renderShowpiece()

	await user.keyboard('{Control>}k{/Control}')
	const dialog = await screen.findByRole('dialog')

	expect(within(dialog).getByText('Navigation')).toBeInTheDocument()
	expect(within(dialog).getByText('Theme')).toBeInTheDocument()
	expect(within(dialog).getByRole('option', { name: /Pricing/ })).toBeInTheDocument()
})

test('running a theme command persists the mode and fires a toast', async () => {
	const user = userEvent.setup()
	const { submissions } = renderShowpiece()

	await user.keyboard('{Control>}k{/Control}')
	const dialog = await screen.findByRole('dialog')
	await user.type(within(dialog).getByRole('combobox'), 'dark')
	await user.keyboard('{Enter}')

	await waitFor(() => {
		const sub = submissions.find((s) => s.action === '/resources/theme-switch')
		expect(sub?.data.theme).toBe('dark')
	})
	expect(toastSuccess).toHaveBeenCalledWith('Theme: Dark')
})
