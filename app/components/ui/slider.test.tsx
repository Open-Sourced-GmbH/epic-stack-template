/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { Slider } from './slider.tsx'

test('renders a slider thumb reflecting the controlled value', () => {
	render(<Slider value={40} min={0} max={100} aria-label="Hue" />)

	const thumb = screen.getByRole('slider', { name: 'Hue' })
	expect(thumb).toHaveAttribute('aria-valuenow', '40')
	expect(thumb).toHaveAttribute('aria-valuemin', '0')
	expect(thumb).toHaveAttribute('aria-valuemax', '100')
})

test('arrow keys move the value by step and report a single number', async () => {
	const user = userEvent.setup()
	const onChange = vi.fn()
	render(
		<Slider
			defaultValue={40}
			min={0}
			max={100}
			step={5}
			onChange={onChange}
			aria-label="Hue"
		/>,
	)

	screen.getByRole('slider', { name: 'Hue' }).focus()
	await user.keyboard('{ArrowRight}')

	expect(onChange).toHaveBeenCalledWith(45)
	expect(onChange.mock.calls.every(([v]) => typeof v === 'number')).toBe(true)
})

test('trackGradient paints the track and drops the filled range', () => {
	const gradient =
		'linear-gradient(to right, oklch(0.6 0.135 0), oklch(0.6 0.135 360))'
	const { container } = render(
		<Slider value={50} trackGradient={gradient} aria-label="Hue" />,
	)

	const track = container.querySelector('[data-slot="slider-track"]')
	const range = container.querySelector('[data-slot="slider-range"]')
	expect(track).toHaveStyle({ background: gradient })
	// The range overlay is hidden so the gradient reads as the whole track.
	expect(range).toHaveClass('bg-transparent')
})

test('paints the invalid border token on the thumb when aria-invalid is set', () => {
	const { container } = render(
		<Slider value={50} aria-invalid aria-label="Hue" />,
	)

	const root = container.querySelector('[data-slot="slider"]')
	const thumb = screen.getByRole('slider', { name: 'Hue' })
	// aria-invalid lands on the root; the thumb repaints via the group variant.
	expect(root).toHaveAttribute('aria-invalid', 'true')
	expect(root).toHaveClass('group')
	expect(thumb).toHaveClass('group-aria-[invalid]:border-input-invalid')
})

test('omitting trackGradient leaves a token-styled track with a filled range', () => {
	const { container } = render(<Slider value={50} aria-label="Hue" />)

	const track = container.querySelector('[data-slot="slider-track"]')
	const range = container.querySelector('[data-slot="slider-range"]')
	expect(track).not.toHaveAttribute('style')
	expect(range).toHaveClass('bg-primary')
})
