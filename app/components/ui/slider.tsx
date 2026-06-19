import * as SliderPrimitive from '@radix-ui/react-slider'
import * as React from 'react'

import { cn } from '#app/utils/misc.tsx'

type SliderProps = Omit<
	React.ComponentProps<typeof SliderPrimitive.Root>,
	// Drop Radix's array `value`/`defaultValue`/`onValueChange` and the DOM
	// `onChange` so the friendlier single-number `onChange` below is the only
	// definition (otherwise the two intersect and reject a typed handler).
	'value' | 'defaultValue' | 'onValueChange' | 'onChange'
> & {
	/** Controlled single value. */
	value?: number
	/** Uncontrolled initial value. */
	defaultValue?: number
	/** Fires with the new single value as the thumb moves. */
	onChange?: (value: number) => void
	/**
	 * CSS background applied to the track — e.g. an oklch hue sweep, a chroma
	 * `0 → 0.3` ramp, or a constrained lightness band for the theme customizer.
	 * Passed in by the consumer so no colors are hardcoded here; when set, the
	 * filled range goes transparent so the gradient reads as the whole track.
	 */
	trackGradient?: string
	/** Accessible label forwarded to the thumb (the element with `slider` role). */
	'aria-label'?: string
	'aria-labelledby'?: string
}

/**
 * Slider — a single-thumb Foundation component (ADR 019) on the Radix base, so
 * keyboard (arrows/Home/End) and ARIA come for free. Styled with design tokens
 * only; the thumb's focus ring follows `--ring` (i.e. the brand accent).
 *
 * The wrapper presents a friendlier single-number API (`value`/`defaultValue`/
 * `onChange`) over Radix's array form, and exposes `trackGradient` so the theme
 * customizer can paint hue / chroma / light sweeps onto the track without this
 * component knowing any colors.
 */
function Slider({
	className,
	value,
	defaultValue,
	onChange,
	trackGradient,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledby,
	...props
}: SliderProps) {
	return (
		<SliderPrimitive.Root
			data-slot="slider"
			className={cn(
				'group relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50',
				className,
			)}
			value={value === undefined ? undefined : [value]}
			defaultValue={defaultValue === undefined ? undefined : [defaultValue]}
			onValueChange={onChange ? (next) => onChange(next[0] ?? 0) : undefined}
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
			<SliderPrimitive.Thumb
				data-slot="slider-thumb"
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledby}
				className="border-border bg-background ring-ring focus-visible:ring-ring group-aria-[invalid]:border-input-invalid block size-4 rounded-full border-2 shadow-sm transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-hidden"
			/>
		</SliderPrimitive.Root>
	)
}

export { Slider }
