import { useState } from 'react'
import { useFetcher } from 'react-router'
import { Icon } from '#app/components/ui/icon.tsx'
import { Slider } from '#app/components/ui/slider.tsx'
import { useOptimisticThemeMode } from '#app/routes/resources/theme-switch.tsx'
import {
	type Accent,
	ACCENT_LIGHT_MAX,
	ACCENT_LIGHT_MIN,
	type ButtonCursor,
	accentPresets,
	brandColor,
	findAccentPreset,
} from '#app/utils/accent.ts'
import { cn } from '#app/utils/misc.tsx'
import { type Theme } from '#app/utils/theme.server.ts'

/** The theme *preference* the segment can set — the resolved `Theme` plus `system`. */
type ThemeMode = Theme | 'system'

const themeModes: Array<{
	value: ThemeMode
	label: string
	icon: 'sun' | 'moon' | 'laptop'
}> = [
	{ value: 'light', label: 'Light', icon: 'sun' },
	{ value: 'dark', label: 'Dark', icon: 'moon' },
	{ value: 'system', label: 'System', icon: 'laptop' },
]

const cursorModes: Array<{ value: ButtonCursor; label: string }> = [
	{ value: 'default', label: 'Default' },
	{ value: 'pointer', label: 'Pointer' },
]

/**
 * Theme customizer — the floating dock that lets a visitor re-theme the page
 * live (ADR 062). Minimized it's a FAB showing the active accent; expanded it's
 * a card of controls: accent preset swatches, free Hue/Chroma/Light sliders
 * (Light clamped to the safe band), the 3-way theme segment, and the
 * button-cursor segment.
 *
 * Every change rides the existing cookie + SSR plumbing — accent + cursor post
 * to `/resources/accent`, theme to `/resources/theme-switch` — so the whole page
 * re-tints live (optimistic) and persists across reload with no flash (EPT-10).
 * Motion is progressive enhancement (the `.tc-pop` open animation is gated on
 * `prefers-reduced-motion: no-preference`); tokens only. The dock's own controls
 * always keep `cursor: pointer`, independent of the cursor pref.
 */
export function ThemeCustomizer({
	accent,
	cursor,
	theme,
}: {
	accent: Accent
	cursor: ButtonCursor
	theme: Theme | null
}) {
	const [open, setOpen] = useState(false)
	// Local accent/cursor track the controls so the dock's own UI reacts instantly
	// while the optimistic re-tint and cookie persistence catch up.
	const [draft, setDraft] = useState<Accent>(accent)
	const [draftCursor, setDraftCursor] = useState<ButtonCursor>(cursor)

	const accentFetcher = useFetcher()
	const themeFetcher = useFetcher()
	const activeTheme = useOptimisticThemeMode() ?? theme ?? 'system'

	const activePreset = findAccentPreset(draft)

	// The dock is a JS-only component (no `<noscript>` form), so it never sends
	// `redirectTo`. That field is the *no-JS* progressive-enhancement escape hatch
	// (see the `<ServerOnly>`-gated inputs on AccentSwitch/ThemeSwitch); sending it
	// from a fetcher makes the action return a single-fetch redirect to the index
	// `.data` URL, which 404s through the splat route. Omitting it lets the action
	// return `data()` — cookie still set, page still re-tints optimistically.

	/** Persist an accent change (preset or sliders) and re-tint optimistically. */
	function commitAccent(next: Accent, presetId?: string) {
		setDraft(next)
		void accentFetcher.submit(
			presetId ? { presetId } : { l: next.l, c: next.c, h: next.h },
			{ method: 'POST', action: '/resources/accent' },
		)
	}

	function commitCursor(next: ButtonCursor) {
		setDraftCursor(next)
		void accentFetcher.submit(
			{ cursor: next },
			{ method: 'POST', action: '/resources/accent' },
		)
	}

	function commitTheme(next: ThemeMode) {
		void themeFetcher.submit(
			{ theme: next },
			{ method: 'POST', action: '/resources/theme-switch' },
		)
	}

	const accentName = activePreset?.name ?? 'Custom'

	// Anchored in the marketing navbar: an inline trigger pill that toggles a
	// popover card hung below it (`absolute top-full right-0`), rather than a
	// page-fixed dock. The trigger owns `aria-expanded`; the card renders in the
	// header's stacking context (`z-50`) so it floats over the page content.
	return (
		<div className="relative">
			<button
				type="button"
				aria-expanded={open}
				aria-label="Customize theme"
				onClick={() => setOpen((current) => !current)}
				className="bg-card text-card-foreground border-border focus-visible:ring-ring flex cursor-pointer items-center gap-2 rounded-full border py-1.5 pr-3 pl-1.5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
			>
				<span
					className="size-5 rounded-full"
					style={{ backgroundColor: brandColor(draft) }}
				/>
				<span className="hidden text-sm font-medium sm:inline">
					{accentName}
				</span>
			</button>

			{open ? (
				<div
					role="region"
					aria-label="Theme customizer"
					className="bg-card text-card-foreground border-border tc-pop absolute top-full right-0 z-50 mt-2 w-72 rounded-xl border p-4 shadow-xl"
				>
					<div className="flex items-center justify-between">
						<p className="text-sm font-semibold">Customize</p>
						<button
							type="button"
							aria-label="Close customizer"
							onClick={() => setOpen(false)}
							className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex size-7 cursor-pointer items-center justify-center rounded-md focus-visible:ring-2 focus-visible:outline-hidden"
						>
							<Icon name="cross-1" />
						</button>
					</div>

					{/* Accent preset swatches. */}
					<div className="mt-4 flex items-center gap-2">
						{accentPresets.map((preset) => {
							const active = preset.id === activePreset?.id
							return (
								<button
									key={preset.id}
									type="button"
									aria-pressed={active}
									title={preset.name}
									onClick={() => commitAccent(preset.accent, preset.id)}
									className={cn(
										'focus-visible:ring-ring size-7 cursor-pointer rounded-full outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2',
										active && 'ring-foreground ring-2 ring-offset-2',
									)}
									style={{ backgroundColor: brandColor(preset.accent) }}
								>
									<span className="sr-only">{preset.name}</span>
								</button>
							)
						})}
					</div>

					{/* Free oklch sliders — gradient tracks built from the live accent. */}
					<div className="mt-5 grid gap-4">
						<AccentSlider
							label="Hue"
							value={draft.h}
							min={0}
							max={360}
							step={1}
							trackGradient={`linear-gradient(to right in oklch, oklch(${draft.l}% ${draft.c} 0), oklch(${draft.l}% ${draft.c} 120), oklch(${draft.l}% ${draft.c} 240), oklch(${draft.l}% ${draft.c} 360))`}
							onChange={(h) => commitAccent({ ...draft, h })}
						/>
						<AccentSlider
							label="Chroma"
							value={draft.c}
							min={0}
							max={0.3}
							step={0.005}
							trackGradient={`linear-gradient(to right in oklch, oklch(${draft.l}% 0 ${draft.h}), oklch(${draft.l}% 0.3 ${draft.h}))`}
							onChange={(c) => commitAccent({ ...draft, c })}
						/>
						<AccentSlider
							label="Light"
							value={draft.l}
							min={ACCENT_LIGHT_MIN}
							max={ACCENT_LIGHT_MAX}
							step={1}
							trackGradient={`linear-gradient(to right in oklch, oklch(${ACCENT_LIGHT_MIN}% ${draft.c} ${draft.h}), oklch(${ACCENT_LIGHT_MAX}% ${draft.c} ${draft.h}))`}
							onChange={(l) => commitAccent({ ...draft, l })}
						/>
					</div>

					{/* Theme segment — reuses the existing theme cookie + optimistic hook. */}
					<Segment label="Theme" className="mt-5">
						{themeModes.map((mode) => (
							<SegmentButton
								key={mode.value}
								active={mode.value === activeTheme}
								onClick={() => commitTheme(mode.value)}
							>
								<Icon name={mode.icon} className="mr-1.5" />
								{mode.label}
							</SegmentButton>
						))}
					</Segment>

					{/* Button-cursor segment. */}
					<Segment label="Cursor" className="mt-3">
						{cursorModes.map((mode) => (
							<SegmentButton
								key={mode.value}
								active={mode.value === draftCursor}
								onClick={() => commitCursor(mode.value)}
							>
								{mode.label}
							</SegmentButton>
						))}
					</Segment>
				</div>
			) : null}
		</div>
	)
}

/** A labelled accent slider row built on the Foundation `Slider`. */
function AccentSlider({
	label,
	value,
	min,
	max,
	step,
	trackGradient,
	onChange,
}: {
	label: string
	value: number
	min: number
	max: number
	step: number
	trackGradient: string
	onChange: (value: number) => void
}) {
	return (
		<div className="grid gap-1.5">
			<span className="text-muted-foreground text-xs font-medium">{label}</span>
			<Slider
				aria-label={label}
				value={value}
				min={min}
				max={max}
				step={step}
				trackGradient={trackGradient}
				onChange={onChange}
			/>
		</div>
	)
}

/** A labelled segmented control (a `role="group"` of toggle buttons). */
function Segment({
	label,
	className,
	children,
}: {
	label: string
	className?: string
	children: React.ReactNode
}) {
	return (
		<div className={className}>
			<span className="text-muted-foreground text-xs font-medium">{label}</span>
			<div
				role="group"
				aria-label={label}
				className="border-border mt-1.5 flex gap-1 rounded-lg border p-1"
			>
				{children}
			</div>
		</div>
	)
}

function SegmentButton({
	active,
	onClick,
	children,
}: {
	active: boolean
	onClick: () => void
	children: React.ReactNode
}) {
	return (
		<button
			type="button"
			aria-pressed={active}
			onClick={onClick}
			className={cn(
				'focus-visible:ring-ring flex flex-1 cursor-pointer items-center justify-center rounded-md px-2 py-1.5 text-xs font-medium focus-visible:ring-2 focus-visible:outline-hidden',
				active
					? 'bg-brand-soft text-brand'
					: 'text-muted-foreground hover:text-foreground',
			)}
		>
			{children}
		</button>
	)
}
