/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { Field } from './field.tsx'
import {
	Slider,
	toThumbValues,
	fromThumbValues,
	formatSliderValue,
} from './slider.tsx'

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

test('pairs with Field for a label + live value', () => {
	const { container } = render(
		<Field label="Volume" htmlFor="volume">
			<Slider defaultValue={40} min={0} max={100} showValue />
		</Field>,
	)

	// Field wires its htmlFor onto the slider root via the cloned `id`.
	const root = container.querySelector('[data-slot="slider"]')
	expect(root).toHaveAttribute('id', 'volume')
	expect(container.querySelector('label')).toHaveAttribute('for', 'volume')
	expect(
		container.querySelector('[data-slot="slider-value"]'),
	).toHaveTextContent('40')
})

test('value-mapping helpers round-trip single and array values', () => {
	expect(toThumbValues(40)).toEqual([40])
	expect(toThumbValues([20, 80])).toEqual([20, 80])
	expect(toThumbValues(undefined)).toBeUndefined()

	expect(fromThumbValues([45], false)).toBe(45)
	expect(fromThumbValues([20, 85], true)).toEqual([20, 85])

	expect(formatSliderValue(60)).toBe('60')
	expect(formatSliderValue([20, 80])).toBe('20 – 80')
})

test('showValue renders a live value output that follows the thumb', async () => {
	const user = userEvent.setup()
	const { container } = render(
		<Slider
			defaultValue={40}
			min={0}
			max={100}
			step={5}
			showValue
			aria-label="Volume"
		/>,
	)

	const output = container.querySelector('[data-slot="slider-value"]')
	expect(output).toHaveTextContent('40')

	screen.getByRole('slider', { name: 'Volume' }).focus()
	await user.keyboard('{ArrowRight}')

	expect(output).toHaveTextContent('45')
})

test('showValue formats a range as "lo – hi" and honours formatValue', () => {
	const { container, rerender } = render(
		<Slider value={[20, 80]} min={0} max={100} showValue aria-label="Range" />,
	)
	expect(
		container.querySelector('[data-slot="slider-value"]'),
	).toHaveTextContent('20 – 80')

	rerender(
		<Slider
			value={60}
			min={0}
			max={100}
			showValue
			formatValue={(v) => `${v}%`}
			aria-label="Range"
		/>,
	)
	expect(
		container.querySelector('[data-slot="slider-value"]'),
	).toHaveTextContent('60%')
})

test('range mode reports an array through onChange (array round-trips)', async () => {
	const user = userEvent.setup()
	const onChange = vi.fn()
	render(
		<Slider
			defaultValue={[20, 80]}
			min={0}
			max={100}
			step={5}
			onChange={onChange}
			aria-label="Price range"
		/>,
	)

	const thumbs = screen.getAllByRole('slider', { name: 'Price range' })
	thumbs[1]!.focus()
	await user.keyboard('{ArrowRight}')

	expect(onChange).toHaveBeenCalledWith([20, 85])
	expect(onChange.mock.calls.every(([v]) => Array.isArray(v))).toBe(true)
})

test('range mode renders two thumbs reflecting an array value', () => {
	render(
		<Slider
			value={[20, 80]}
			min={0}
			max={100}
			aria-label="Price range"
		/>,
	)

	const thumbs = screen.getAllByRole('slider', { name: 'Price range' })
	expect(thumbs).toHaveLength(2)
	expect(thumbs[0]).toHaveAttribute('aria-valuenow', '20')
	expect(thumbs[1]).toHaveAttribute('aria-valuenow', '80')
})
