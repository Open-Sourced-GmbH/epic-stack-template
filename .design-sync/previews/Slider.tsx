// Owned preview — mirrors the `slider` specimen. The default single-thumb track,
// a gradient track (an oklch hue sweep) for the `trackGradient` prop the theme
// customizer paints, a two-thumb range with a live value output, and a
// Field-paired slider (label + live value) like any other control.
import { Field, Slider } from 'epic-stack-template'

export const Default = () => (
	<div className="flex w-full max-w-sm flex-col gap-6">
		<Slider defaultValue={40} min={0} max={100} aria-label="Default" />
	</div>
)

export const GradientTrack = () => (
	<div className="flex w-full max-w-sm flex-col gap-6">
		<Slider
			defaultValue={172}
			min={0}
			max={360}
			aria-label="Hue"
			trackGradient="linear-gradient(to right, oklch(0.7 0.15 0), oklch(0.7 0.15 60), oklch(0.7 0.15 120), oklch(0.7 0.15 180), oklch(0.7 0.15 240), oklch(0.7 0.15 300), oklch(0.7 0.15 360))"
		/>
	</div>
)

export const Range = () => (
	<div className="flex w-full max-w-sm flex-col gap-6">
		<Slider
			defaultValue={[20, 80]}
			min={0}
			max={100}
			showValue
			aria-label="Price range"
		/>
	</div>
)

export const FieldPaired = () => (
	<div className="flex w-full max-w-sm flex-col gap-6">
		<Field label="Volume" htmlFor="preview-volume">
			<Slider defaultValue={60} min={0} max={100} showValue />
		</Field>
	</div>
)
