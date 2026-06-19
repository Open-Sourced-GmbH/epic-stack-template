import * as SliderPrimitive from '@radix-ui/react-slider'
import * as React from 'react'

import { cn } from '#app/utils/misc.tsx'

/** A slider's value: a single number, or `[lo, hi]` in range (two-thumb) mode. */
type SliderValue = number | number[]

/**
 * Map the friendly single-or-array value to Radix's array form. A lone number
 * becomes a one-element array; an array (range mode) passes through; `undefined`
 * stays `undefined` so controlled/uncontrolled detection is unaffected.
 */
function toThumbValues(value: SliderValue | undefined): number[] | undefined {
	if (value === undefined) return undefined
	return Array.isArray(value) ? value : [value]
}

/**
 * Map Radix's array callback back to the friendly shape: the same array in range
 * mode, otherwise the single first number — so the default API stays a number.
 */
function fromThumbValues(next: number[], range: boolean): SliderValue {
	return range ? next : (next[0] ?? 0)
}

/** Default value-output formatter: a single number, or `lo – hi` for a range. */
function formatSliderValue(value: SliderValue): string {
	return Array.isArray(value) ? `${value[0]} – ${value[1]}` : String(value)
}

type SliderProps<V extends SliderValue = number> = Omit<
	React.ComponentProps<typeof SliderPrimitive.Root>,
	// Drop Radix's array `value`/`defaultValue`/`onValueChange` and the DOM
	// `onChange` so the friendlier `onChange` below is the only definition
	// (otherwise the two intersect and reject a typed handler).
	'value' | 'defaultValue' | 'onValueChange' | 'onChange'
> & {
	/** Controlled value — a number, or `[lo, hi]` for range (two-thumb) mode. */
	value?: V
	/** Uncontrolled initial value (number or `[lo, hi]`). */
	defaultValue?: V
	/** Fires with the new value as a thumb moves — a number, or `[lo, hi]`. */
	onChange?: (value: V) => void
	/** Render the current value(s) in an output alongside the track. */
	showValue?: boolean
	/** Customize the value-output text; defaults to `n` or `lo – hi`. */
	formatValue?: (value: V) => React.ReactNode
	/**
	 * CSS background applied to the track — e.g. an oklch hue sweep, a chroma
	 * `0 → 0.3` ramp, or a constrained lightness band for the theme customizer.
	 * Passed in by the consumer so no colors are hardcoded here; when set, the
	 * filled range goes transparent so the gradient reads as the whole track.
	 */
	trackGradient?: string
	/** Accessible label forwarded to the thumb(s) (the elements with `slider` role). */
	'aria-label'?: string
	'aria-labelledby'?: string
}

/**
 * Slider — a Foundation component (ADR 019) on the Radix base, so keyboard
 * (arrows/Home/End) and ARIA come for free. Styled with design tokens only; the
 * thumb takes the shared cosy-focus treatment (brand border + halo).
 *
 * The wrapper presents a friendly API (`value`/`defaultValue`/`onChange`) over
 * Radix's array form. Passing a single number is the default single-thumb mode;
 * passing `[lo, hi]` opts into a two-thumb range — both round-trip through the
 * single↔array mapping so `onChange` reports the same shape it was given. Set
 * `showValue` for a live value output (pairs with `Field` for label + value),
 * and `trackGradient` to paint hue / chroma / light sweeps onto the track
 * without this component knowing any colors.
 */
function Slider<V extends SliderValue = number>({
	className,
	value,
	defaultValue,
	onChange,
	showValue = false,
	formatValue,
	trackGradient,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledby,
	...props
}: SliderProps<V>) {
	const range = Array.isArray(value) || Array.isArray(defaultValue)
	const format = (formatValue ?? formatSliderValue) as (
		value: SliderValue,
	) => React.ReactNode

	// Track the current value so the optional output stays live in the
	// uncontrolled case; in the controlled case `value` is the source of truth.
	const [current, setCurrent] = React.useState<SliderValue>(
		value ?? defaultValue ?? 0,
	)
	const displayed = value ?? current
	const thumbCount = toThumbValues(value ?? defaultValue)?.length ?? 1

	const handleValueChange = (next: number[]) => {
		const mapped = fromThumbValues(next, range)
		// Only re-render for the value output when it's actually shown.
		if (showValue) setCurrent(mapped)
		onChange?.(mapped as V)
	}

	const root = (
		<SliderPrimitive.Root
			data-slot="slider"
			className={cn(
				'group relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50',
				className,
			)}
			value={toThumbValues(value)}
			defaultValue={toThumbValues(defaultValue)}
			onValueChange={handleValueChange}
			{...props}
		>
			<SliderPrimitive.Track
				data-slot="slider-track"
				className="bg-muted relative h-2 w-full grow overflow-hidden rounded-full"
				style={trackGradient ? { background: trackGradient } : undefined}
			>
				<SliderPrimitive.Range
					data-slot="slider-range"
					className={cn(
						'absolute h-full',
						trackGradient ? 'bg-transparent' : 'bg-primary',
					)}
				/>
			</SliderPrimitive.Track>
			{/* One thumb per value; in range mode both share `aria-label` (each
			    thumb still announces its own min/now/max via Radix). */}
			{Array.from({ length: thumbCount }, (_, i) => (
				<SliderPrimitive.Thumb
					key={i}
					data-slot="slider-thumb"
					aria-label={ariaLabel}
					aria-labelledby={ariaLabelledby}
					className="focus-cosy border-border bg-background group-aria-[invalid]:border-input-invalid block size-4 rounded-full border-2 shadow-sm hover:border-primary"
				/>
			))}
		</SliderPrimitive.Root>
	)

	if (!showValue) return root

	return (
		<div data-slot="slider-with-value" className="flex flex-col gap-1">
			{root}
			<output
				data-slot="slider-value"
				className="text-muted-foreground text-body-2xs tabular-nums"
			>
				{format(displayed)}
			</output>
		</div>
	)
}

export { Slider, toThumbValues, fromThumbValues, formatSliderValue }
export type { SliderValue, SliderProps }
