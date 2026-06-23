/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { Switch } from './switch.tsx'

test('toggles on click and reports the new state via onCheckedChange', async () => {
	const user = userEvent.setup()
	const onCheckedChange = vi.fn()
	render(<Switch aria-label="Wifi" onCheckedChange={onCheckedChange} />)

	const toggle = screen.getByRole('switch', { name: 'Wifi' })
	expect(toggle).not.toBeChecked()

	await user.click(toggle)

	expect(onCheckedChange).toHaveBeenCalledWith(true)
	expect(toggle).toBeChecked()
})

test('is keyboard-operable — Space toggles a focused switch', async () => {
	const user = userEvent.setup()
	const onCheckedChange = vi.fn()
	render(
		<Switch aria-label="Wifi" defaultChecked onCheckedChange={onCheckedChange} />,
	)

	const toggle = screen.getByRole('switch', { name: 'Wifi' })
	expect(toggle).toBeChecked()

	toggle.focus()
	await user.keyboard(' ')

	expect(onCheckedChange).toHaveBeenCalledWith(false)
	expect(toggle).not.toBeChecked()
})

test('disabled does not toggle or fire onCheckedChange', async () => {
	const user = userEvent.setup()
	const onCheckedChange = vi.fn()
	render(
		<Switch aria-label="Wifi" disabled onCheckedChange={onCheckedChange} />,
	)

	const toggle = screen.getByRole('switch', { name: 'Wifi' })
	expect(toggle).toBeDisabled()

	await user.click(toggle)

	expect(onCheckedChange).not.toHaveBeenCalled()
	expect(toggle).not.toBeChecked()
})

test('paints the brand track when on and carries the cosy-focus halo', () => {
	render(<Switch aria-label="Wifi" defaultChecked />)

	const toggle = screen.getByRole('switch', { name: 'Wifi' })
	// On = brand fill (off = muted); focus-visible takes the shared cosy halo.
	expect(toggle).toHaveClass('data-[state=checked]:bg-brand')
	expect(toggle).toHaveClass('bg-muted')
	expect(toggle).toHaveClass('focus-cosy')
})

test('drops the thumb/track transition under prefers-reduced-motion', () => {
	const { container } = render(<Switch aria-label="Wifi" />)

	const track = container.querySelector('[data-slot="switch"]')
	const thumb = container.querySelector('[data-slot="switch-thumb"]')
	expect(track).toHaveClass('motion-reduce:transition-none')
	expect(thumb).toHaveClass('motion-reduce:transition-none')
})
