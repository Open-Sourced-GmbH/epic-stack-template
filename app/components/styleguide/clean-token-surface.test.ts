import { expect, test } from 'vitest'
import { cleanTokenSurface } from '../../../scripts/clean-token-surface.ts'

test('strips Tailwind plumbing (--tw-*) custom properties', () => {
	const css = `:root {
		--brand: oklch(60% 0.135 172);
		--tw-ring-color: blue;
	}`
	const out = cleanTokenSurface(css)
	expect(out).not.toMatch(/--tw-/)
	expect(out).toContain('--brand:')
})

test('retains tokens declared in theme scopes (:root / .dark / [data-*] / @theme)', () => {
	const css = `:root { --brand: oklch(60% 0.135 172); }
.dark { --background: oklch(13% 0 0); }
[data-theme='sea'] { --accent: oklch(70% 0.1 200); }
@theme inline { --color-brand: var(--brand); }`
	const out = cleanTokenSurface(css)
	expect(out).toContain('--brand:')
	expect(out).toContain('--background:')
	expect(out).toContain('--accent:')
	expect(out).toContain('--color-brand:')
})

test('drops custom properties declared under non-theme (utility) selectors', () => {
	const css = `.some-utility { --local-gap: 4px; color: red; }
:root { --brand: oklch(60% 0.135 172); }`
	const out = cleanTokenSurface(css)
	expect(out).not.toContain('--local-gap')
	// non-custom-property declarations in the same rule are left intact
	expect(out).toContain('color: red')
	expect(out).toContain('--brand:')
})

test('reduces a noisy compiled stylesheet to just its semantic tokens', () => {
	// Mirrors the shape of build/client/assets/tailwind-*.css: @property
	// registrations, `*`-scoped plumbing, and utility locals around the real
	// :root / .dark token blocks.
	const css = `@property --tw-ring-color { syntax: "*"; inherits: false; }
@property --tw-translate-x { syntax: "<length>"; inherits: false; initial-value: 0; }
*, ::before, ::after { --tw-ring-color: initial; --tw-translate-x: 0; }
.translate-x-2 { --tw-translate-x: 0.5rem; translate: var(--tw-translate-x) 0; }
:root {
	--brand: oklch(60% 0.135 172);
	--background: oklch(100% 0 0);
	--foreground: oklch(13% 0.03 258);
	--primary: var(--brand);
	--destructive: oklch(57% 0.21 27);
	--foreground-destructive: oklch(51% 0.19 16);
	--ring: var(--brand);
	--tw-leaked: nope;
}
.dark { --background: oklch(13% 0.03 258); --foreground: oklch(98% 0 0); }`

	const out = cleanTokenSurface(css)

	// No --tw-* *declaration* survives (value references like
	// `var(--tw-translate-x)` are fine — they aren't part of the token surface).
	expect(out).not.toMatch(/--tw-[A-Za-z0-9_-]*\s*:/)
	expect(out).not.toMatch(/@property/)
	const names = new Set([...out.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)].map((m) => m[1]))
	expect(names).toEqual(
		new Set([
			'--brand',
			'--background',
			'--foreground',
			'--primary',
			'--destructive',
			'--foreground-destructive',
			'--ring',
		]),
	)
})
