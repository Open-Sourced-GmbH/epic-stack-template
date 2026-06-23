/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogOverlay,
	DialogTitle,
	DialogTrigger,
} from './dialog.tsx'

function Sample(props: {
	open?: boolean
	onOpenChange?: (open: boolean) => void
	defaultOpen?: boolean
}) {
	return (
		<Dialog {...props}>
			<DialogTrigger>Open</DialogTrigger>
			<DialogOverlay />
			<DialogContent>
				<DialogTitle>Settings</DialogTitle>
				<DialogDescription>Manage your preferences.</DialogDescription>
				<DialogClose>Done</DialogClose>
			</DialogContent>
		</Dialog>
	)
}

test('the trigger opens a dialog labelled by its title', async () => {
	const user = userEvent.setup()
	render(<Sample />)

	// Closed by default — no dialog in the tree.
	expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

	await user.click(screen.getByRole('button', { name: 'Open' }))

	expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
})

test('escape closes the dialog', async () => {
	const user = userEvent.setup()
	const onOpenChange = vi.fn()
	render(<Sample open onOpenChange={onOpenChange} />)

	expect(screen.getByRole('dialog')).toBeInTheDocument()

	await user.keyboard('{Escape}')
	expect(onOpenChange).toHaveBeenCalledWith(false)
})

test('the close control dismisses the dialog', async () => {
	const user = userEvent.setup()
	const onOpenChange = vi.fn()
	render(<Sample open onOpenChange={onOpenChange} />)

	await user.click(screen.getByRole('button', { name: 'Done' }))
	expect(onOpenChange).toHaveBeenCalledWith(false)
})

test('the description is wired to the dialog via aria-describedby', () => {
	render(<Sample defaultOpen />)

	const dialog = screen.getByRole('dialog', { name: 'Settings' })
	const describedBy = dialog.getAttribute('aria-describedby')
	expect(describedBy).toBeTruthy()
	expect(document.getElementById(describedBy!)).toHaveTextContent(
		'Manage your preferences.',
	)
})
