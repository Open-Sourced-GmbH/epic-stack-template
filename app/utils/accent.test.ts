import { expect, test } from 'vitest'
import {
	ACCENT_LIGHT_MAX,
	ACCENT_LIGHT_MIN,
	DEFAULT_ACCENT,
	accentVars,
	brandColor,
	clampLight,
	parseAccentPrefs,
	serializeAccentPrefs,
	type AccentPrefs,
} from './accent.ts'

test('brandColor builds an oklch string with Light clamped to the band', () => {
	expect(brandColor({ l: 10, c: 0.135, h: 172 })).toBe(
		`oklch(${ACCENT_LIGHT_MIN}% 0.135 172)`,
	)
	expect(brandColor({ l: 60, c: 0.135, h: 172 })).toBe('oklch(60% 0.135 172)')
})

test('clampLight holds the Light value inside the safe band', () => {
	expect(clampLight(10)).toBe(ACCENT_LIGHT_MIN)
	expect(clampLight(99)).toBe(ACCENT_LIGHT_MAX)
	expect(clampLight(60)).toBe(60)
})

test('clampLight falls back to the default Light for non-finite input', () => {
	expect(clampLight(NaN)).toBe(DEFAULT_ACCENT.l)
})

test('accentVars maps {l,c,h} onto the brand vars with clamped Light', () => {
	const vars = accentVars({ l: 10, c: 0.135, h: 172 })
	// Light is clamped into the band before it reaches --brand.
	expect(vars['--brand']).toBe(`oklch(${ACCENT_LIGHT_MIN}% 0.135 172)`)
	// --primary and --ring follow --brand so the override cascades to them.
	expect(vars['--primary']).toBe('var(--brand)')
	expect(vars['--ring']).toBe('var(--brand)')
	// soft/glow derive from --brand, so one numeric source re-tints everything.
	expect(vars['--brand-soft']).toContain('var(--brand)')
	expect(vars['--brand-glow']).toContain('var(--brand)')
})

test('serialize → parse round-trips an accent + cursor preference', () => {
	const prefs: AccentPrefs = {
		accent: { l: 60, c: 0.135, h: 172 },
		cursor: 'pointer',
	}
	const parsed = parseAccentPrefs(serializeAccentPrefs(prefs))
	expect(parsed).toEqual(prefs)
})

test('parseAccentPrefs clamps an out-of-band Light on the way in', () => {
	const parsed = parseAccentPrefs(
		JSON.stringify({ l: 95, c: 0.1, h: 200, cursor: 'default' }),
	)
	expect(parsed?.accent.l).toBe(ACCENT_LIGHT_MAX)
})

test('parseAccentPrefs defaults an absent/invalid cursor to "default"', () => {
	const parsed = parseAccentPrefs(JSON.stringify({ l: 60, c: 0.135, h: 172 }))
	expect(parsed?.cursor).toBe('default')
})

test('parseAccentPrefs rejects malformed or empty values', () => {
	expect(parseAccentPrefs(undefined)).toBeNull()
	expect(parseAccentPrefs('')).toBeNull()
	expect(parseAccentPrefs('not json')).toBeNull()
	expect(parseAccentPrefs(JSON.stringify({ l: 60, c: 0.1 }))).toBeNull()
})
