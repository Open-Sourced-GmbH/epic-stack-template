import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

/**
 * EPT-22 · the DS-wide "cosy focus" contract (AUDIT §3.5). Focus must be a
 * single shared treatment baked into the control classes — a 1px brand border +
 * soft `--brand-glow` halo — not a per-consumer `ring-2 ring-offset-2` detached
 * ring. This test pins both halves: every interactive control opts into the
 * shared `focus-cosy*` utility, and none still carries the old ring.
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (rel: string) => readFile(join(ROOT, rel), 'utf8')

/** Controls that must adopt the shared cosy-focus treatment. */
const CONTROLS = [
	'app/components/ui/input.tsx',
	'app/components/ui/textarea.tsx',
	'app/components/ui/checkbox.tsx',
	'app/components/ui/slider.tsx',
	'app/components/ui/button.tsx',
	'app/components/ui/input-otp.tsx',
	'app/components/ui/accordion.tsx',
	'app/components/ui/command.tsx',
]

/**
 * The pre-EPT-22 detached ring: the explicit ring width/offset utilities and
 * the bare `ring-ring`/`ring-offset-background` colour anchors that only existed
 * to paint it. A control carrying any of these still relies on the old ring.
 */
const OLD_RING =
	/focus-visible:ring-2|focus-within:ring-2|ring-offset-2|ring-offset-1|focus-visible:ring-ring|ring-offset-background|\bring-ring\b/

test.each(CONTROLS)('%s uses cosy focus, not the old detached ring', async (rel) => {
	const src = await read(rel)
	expect(src).toMatch(/focus-cosy/)
	expect(src).not.toMatch(OLD_RING)
})

test('tailwind defines the cosy-focus utilities from existing tokens', async () => {
	const css = await read('app/styles/tailwind.css')
	// Both the :focus-visible utility and the always-on variant (OTP active slot).
	expect(css).toMatch(/@utility focus-cosy\b/)
	expect(css).toMatch(/@utility focus-cosy-active\b/)
	// Halo is the existing --brand-glow; border is the brand accent. No new token.
	expect(css).toMatch(/var\(--brand-glow\)/)
	expect(css).toMatch(/border-color:\s*var\(--brand\)/)
})

test('cosy-focus easing is gated to prefers-reduced-motion: no-preference', async () => {
	const css = await read('app/styles/tailwind.css')
	const noPref = css.slice(css.indexOf('prefers-reduced-motion: no-preference'))
	expect(noPref).toMatch(/\.focus-cosy/)
	expect(noPref).toMatch(/transition:/)
})
