import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import { radii, semanticColors, typeScale } from './specimens.tsx'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')

/**
 * Drift guard for the foundation specimens. The styleguide claims to be the
 * design-system source of truth, but its token catalogs (`semanticColors`,
 * `typeScale`, `radii`) are hand-maintained lists — nothing stops them from
 * silently falling behind the tokens defined in `app/styles/tailwind.css`.
 * These tests close that gap: add or rename a token in the CSS and the
 * styleguide must reflect it (or the color must be listed below as
 * intentionally not shown) or CI fails.
 */
function readCss() {
	return readFile(join(ROOT, 'app/styles/tailwind.css'), 'utf8')
}

/** Body of the top-level `:root { … }` block (no nested braces inside it). */
function rootBlock(css: string): string {
	const start = css.indexOf(':root')
	const open = css.indexOf('{', start)
	const close = css.indexOf('}', open)
	return css.slice(open + 1, close)
}

/**
 * Names of the color tokens defined in `:root`. A color value is an `oklch()`
 * literal, a `color-mix()` (e.g. `--brand-soft`), or a `var()` alias onto
 * another color token (e.g. `--primary`/`--ring` follow `--brand`, ADR 062).
 */
function cssColorTokens(css: string): Set<string> {
	const tokens = new Set<string>()
	for (const m of rootBlock(css).matchAll(
		/--([a-z0-9-]+)\s*:\s*(?:oklch|color-mix|var)\(/g,
	)) {
		tokens.add(m[1]!)
	}
	return tokens
}

/** Base `--text-*` token names (excludes `--line-height` / `--font-weight`). */
function cssTextTokens(css: string): Set<string> {
	const tokens = new Set<string>()
	for (const m of css.matchAll(/--text-([a-z0-9-]+)\s*:/g)) {
		const name = m[1]!
		if (name.includes('--')) continue // modifier line, not a base size token
		tokens.add(name)
	}
	return tokens
}

/** Names of the `--radius-*` scale tokens (excludes the bare `--radius`). */
function cssRadiusTokens(css: string): Set<string> {
	const tokens = new Set<string>()
	for (const m of css.matchAll(/--radius-([a-z]+)\s*:/g)) tokens.add(m[1]!)
	return tokens
}

/**
 * Real `:root` color tokens that intentionally have no swatch in the semantic
 * Colors specimen. `input-invalid`/`foreground-destructive`/`error-text` are
 * state/utility colors without a surface bg/fg pairing (`error-text` aliases
 * `foreground-destructive` and is demonstrated as message text in the Forms
 * specimens, not as a swatch); the `brand*` accent tokens have their own
 * dedicated `brand-accent` specimen (ADR 062). Listing them here is the explicit,
 * reviewed curation decision — a *new* token is never silently dropped.
 */
const COLORS_NOT_SHOWN = new Set([
	'input-invalid',
	'foreground-destructive',
	'error-text',
	'brand',
	'brand-soft',
	'brand-glow',
])

test('Colors specimen covers every semantic color token', async () => {
	const inCss = cssColorTokens(await readCss())
	const shown = new Set<string>()
	for (const c of semanticColors) {
		shown.add(c.bg)
		if (c.fg) shown.add(c.fg)
	}

	// A specimen swatch must never point at a token the CSS no longer defines.
	const danglingInSpecimen = [...shown].filter((t) => !inCss.has(t))
	expect(danglingInSpecimen).toEqual([])

	// Every CSS color token must be shown, or explicitly listed as not-shown.
	const missingFromSpecimen = [...inCss].filter(
		(t) => !shown.has(t) && !COLORS_NOT_SHOWN.has(t),
	)
	expect(missingFromSpecimen).toEqual([])
})

test('Type specimen covers every --text-* token', async () => {
	const inCss = cssTextTokens(await readCss())
	const shown = new Set(typeScale.map((t) => t.label))
	expect([...shown].sort()).toEqual([...inCss].sort())
})

test('Radii specimen covers every --radius-* token', async () => {
	const inCss = cssRadiusTokens(await readCss())
	const shown = new Set(radii.map((r) => r.label.replace('radius-', '')))
	expect([...shown].sort()).toEqual([...inCss].sort())
})
