// Owned preview — mirrors the `slider` specimen. The default single-thumb track
// plus a gradient track (an oklch hue sweep) to show the `trackGradient` prop the
// theme customizer paints onto the track.
import { Slider } from 'epic-stack-template'

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
