/**
 * Accent customizer model — isomorphic (server + client), no server-only deps,
 * so the root loader can apply the accent server-side AND the client can update
 * it optimistically from the same source (see ADR 062). Cookie I/O lives in
 * `accent.server.ts`; everything that is pure model logic lives here.
 *
 * The accent is the brand color expressed as oklch `{l, c, h}`. Per ADR 062 the
 * picker is *constrained*: Light is held inside a safe band so the fixed
 * near-white `--primary-foreground` always reads — there is no runtime contrast
 * math. Hue and Chroma stay free.
 */

/** Safe band for the oklch Light value (percent), per ADR 062 (constrained picker). */
export const ACCENT_LIGHT_MIN = 45
export const ACCENT_LIGHT_MAX = 68

/** The brand accent as oklch components: Light (%), Chroma, Hue. */
export type Accent = { l: number; c: number; h: number }

/** Whether buttons show a pointer cursor (carried by the customizer). */
export type ButtonCursor = 'default' | 'pointer'

/** Everything the `en_accent` cookie persists. */
export type AccentPrefs = { accent: Accent; cursor: ButtonCursor }

/** A named accent the tracer/customizer can apply in one click. */
export type AccentPreset = { id: string; name: string; accent: Accent }

/**
 * Preset accents. All Light values sit inside the safe band, including a
 * **Volt** retuned darker into the band so near-white text never breaks
 * (ADR 062). The first preset is the default brand, Pine `oklch(60% 0.135 172)`.
 */
export const accentPresets: AccentPreset[] = [
	{ id: 'pine', name: 'Pine', accent: { l: 60, c: 0.135, h: 172 } },
	{ id: 'iris', name: 'Iris', accent: { l: 56, c: 0.16, h: 280 } },
	{ id: 'coral', name: 'Coral', accent: { l: 64, c: 0.16, h: 28 } },
	{ id: 'volt', name: 'Volt', accent: { l: 60, c: 0.17, h: 130 } },
]

export const DEFAULT_ACCENT: Accent = accentPresets[0]!.accent

/** Hold the oklch Light value inside the safe band; non-finite → default Light. */
export function clampLight(l: number): number {
	if (!Number.isFinite(l)) return DEFAULT_ACCENT.l
	return Math.min(ACCENT_LIGHT_MAX, Math.max(ACCENT_LIGHT_MIN, l))
}

/** The `oklch(…)` string for an accent's `--brand`, with Light clamped to band. */
export function brandColor(accent: Accent): string {
	return `oklch(${clampLight(accent.l)}% ${accent.c} ${accent.h})`
}

/**
 * Map an accent onto the brand CSS variables, ready for `<html style>`. Only
 * `--brand` carries the numbers; `--primary`, `--ring`, `--brand-soft`, and
 * `--brand-glow` reference `var(--brand)` exactly as `tailwind.css` does, so a
 * single inline override cascades to all of them (the inline style sits on
 * `<html>` — the same element as `:root` — and wins). The full set is emitted
 * to match the ADR 062 contract and stay robust if a derivation is ever
 * flattened.
 */
export function accentVars(accent: Accent): Record<string, string> {
	return {
		'--brand': brandColor(accent),
		'--brand-soft': 'color-mix(in srgb, var(--brand) 13%, transparent)',
		'--brand-glow': 'oklch(from var(--brand) l c h / 0.32)',
		'--primary': 'var(--brand)',
		'--ring': 'var(--brand)',
	}
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value)
}

/** Serialize prefs to the compact JSON payload stored in the `en_accent` cookie. */
export function serializeAccentPrefs(prefs: AccentPrefs): string {
	const { accent, cursor } = prefs
	return JSON.stringify({
		l: clampLight(accent.l),
		c: accent.c,
		h: accent.h,
		cursor,
	})
}

/**
 * Parse the `en_accent` cookie payload back into prefs, clamping Light and
 * defaulting the cursor. Returns `null` for anything malformed so the caller
 * falls back to the default accent.
 */
export function parseAccentPrefs(
	value: string | null | undefined,
): AccentPrefs | null {
	if (!value) return null
	let raw: unknown
	try {
		raw = JSON.parse(value)
	} catch {
		return null
	}
	if (typeof raw !== 'object' || raw === null) return null
	const { l, c, h, cursor } = raw as Record<string, unknown>
	if (!isFiniteNumber(l) || !isFiniteNumber(c) || !isFiniteNumber(h)) return null
	return {
		accent: { l: clampLight(l), c, h },
		cursor: cursor === 'pointer' ? 'pointer' : 'default',
	}
}
