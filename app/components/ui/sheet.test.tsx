/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetOverlay,
	SheetTitle,
	SheetTrigger,
} from './sheet.tsx'

function Sample(props: {
	open?: boolean
	onOpenChange?: (open: boolean) => void
	defaultOpen?: boolean
	side?: 'left' | 'right'
}) {
	const { side, ...root } = props
	return (
		<Sheet {...root}>
			<SheetTrigger>Open</SheetTrigger>
			<SheetOverlay />
			<SheetContent side={side}>
				<SheetTitle>Navigation</SheetTitle>
				<SheetDescription>Jump to a section.</SheetDescription>
				<a href="/home">Home</a>
				<SheetClose>Done</SheetClose>
			</SheetContent>
		</Sheet>
	)
}

test('the trigger opens a slide-over labelled by its title', async () => {
	const user = userEvent.setup()
	render(<Sample />)

	// Closed by default — no panel in the tree.
	expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

	await user.click(screen.getByRole('button', { name: 'Open' }))

	expect(
		screen.getByRole('dialog', { name: 'Navigation' }),
	).toBeInTheDocument()
})

test('opening the sheet moves focus into the panel', async () => {
	const user = userEvent.setup()
	render(<Sample />)

	await user.click(screen.getByRole('button', { name: 'Open' }))

	const panel = screen.getByRole('dialog', { name: 'Navigation' })
	expect(panel.contains(document.activeElement)).toBe(true)
})

test('escape closes the sheet', async () => {
	const user = userEvent.setup()
	const onOpenChange = vi.fn()
	render(<Sample open onOpenChange={onOpenChange} />)

	expect(screen.getByRole('dialog')).toBeInTheDocument()

	await user.keyboard('{Escape}')
	expect(onOpenChange).toHaveBeenCalledWith(false)
})

test('the close control dismisses the sheet', async () => {
	const user = userEvent.setup()
	const onOpenChange = vi.fn()
	render(<Sample open onOpenChange={onOpenChange} />)

	await user.click(screen.getByRole('button', { name: 'Done' }))
	expect(onOpenChange).toHaveBeenCalledWith(false)
})

test('the description is wired to the panel via aria-describedby', () => {
	render(<Sample defaultOpen />)

	const panel = screen.getByRole('dialog', { name: 'Navigation' })
	const describedBy = panel.getAttribute('aria-describedby')
	expect(describedBy).toBeTruthy()
	expect(document.getElementById(describedBy!)).toHaveTextContent(
		'Jump to a section.',
	)
})

test('the side prop drives which edge the panel slides from', () => {
	const { rerender } = render(<Sample defaultOpen side="left" />)

	expect(screen.getByRole('dialog')).toHaveAttribute('data-side', 'left')

	rerender(<Sample defaultOpen side="right" />)
	expect(screen.getByRole('dialog')).toHaveAttribute('data-side', 'right')
})
