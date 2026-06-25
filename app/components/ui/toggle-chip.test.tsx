/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { ToggleChip } from './toggle-chip.tsx'

test('off renders aria-pressed="false" and the muted/background tokens', () => {
	render(<ToggleChip pressed={false}>read</ToggleChip>)

	const chip = screen.getByRole('button', { name: 'read' })
	expect(chip).toHaveAttribute('aria-pressed', 'false')
	expect(chip).toHaveClass('bg-background')
	expect(chip).toHaveClass('text-muted-foreground')
})

test('on renders aria-pressed="true" and the brand fill', () => {
	render(<ToggleChip pressed>read</ToggleChip>)

	const chip = screen.getByRole('button', { name: 'read' })
	expect(chip).toHaveAttribute('aria-pressed', 'true')
	expect(chip).toHaveClass('bg-brand')
	expect(chip).toHaveClass('text-primary-foreground')
})

test('toggles on click and reports the new state via onPressedChange', async () => {
	const user = userEvent.setup()
	const onPressedChange = vi.fn()
	render(
		<ToggleChip pressed={false} onPressedChange={onPressedChange}>
			read
		</ToggleChip>,
	)

	await user.click(screen.getByRole('button', { name: 'read' }))

	expect(onPressedChange).toHaveBeenCalledWith(true)
})

test('is keyboard-operable — Space toggles a focused chip', async () => {
	const user = userEvent.setup()
	const onPressedChange = vi.fn()
	render(
		<ToggleChip pressed onPressedChange={onPressedChange}>
			read
		</ToggleChip>,
	)

	screen.getByRole('button', { name: 'read' }).focus()
	await user.keyboard(' ')

	expect(onPressedChange).toHaveBeenCalledWith(false)
})

test('locked renders the brand-soft tonal + a lock glyph and is non-toggleable', async () => {
	const user = userEvent.setup()
	const onPressedChange = vi.fn()
	const { container } = render(
		<ToggleChip pressed locked onPressedChange={onPressedChange}>
			read
		</ToggleChip>,
	)

	const chip = screen.getByRole('button', { name: /read/i })
	expect(chip).toHaveClass('bg-brand-soft')
	expect(chip).toHaveClass('text-brand')
	// Lock glyph present.
	expect(container.querySelector('svg')).toBeInTheDocument()

	// Non-toggleable: aria-disabled keeps it focusable, but it never fires.
	expect(chip).toHaveAttribute('aria-disabled', 'true')
	await user.click(chip)
	chip.focus()
	await user.keyboard(' ')
	expect(onPressedChange).not.toHaveBeenCalled()
})

test('locked exposes a focusable affordance + tooltip', async () => {
	const user = userEvent.setup()
	render(
		<ToggleChip pressed locked lockedReason="Protected by the admin floor">
			read
		</ToggleChip>,
	)

	const chip = screen.getByRole('button', { name: /read/i })
	// Focusable (not `disabled`, which would drop it from the focus order).
	expect(chip).toBeEnabled()
	await user.hover(chip)
	// Radix renders the tooltip content twice (visible + a11y copy).
	expect(
		(await screen.findAllByText('Protected by the admin floor')).length,
	).toBeGreaterThan(0)
})
