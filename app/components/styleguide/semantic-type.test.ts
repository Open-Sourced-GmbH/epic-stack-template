import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

// This guard file necessarily names the banned tokens (docstring + the size
// table), so it excludes itself from the scan.
const SELF = fileURLToPath(import.meta.url)

/**
 * Guard: the app uses the semantic display ramp (`text-body-*` / `text-h*` from
 * `app/styles/tailwind.css`), not raw Tailwind font-size utilities, so type
 * stays on one tuned scale. This bans the raw sizes that have an *exact-size*
 * semantic equivalent — code should reach for the token instead:
 *
 *   text-xs   → text-body-2xs   (12px)
 *   text-sm   → text-body-xs    (14px)
 *   text-base → text-body-sm    (16px)   ← still ≥16px, keeps inputs iOS-zoom-safe
 *   text-xl   → text-body-md    (20px)
 *   text-2xl  → text-body-lg    (24px)
 *
 * `text-lg` (18px, no token) and `text-3xl`+ (display) stay an escape hatch for
 * bespoke marketing/editorial type, and arbitrary `text-[…]` is never matched.
 *
 * The banned class names are assembled from parts so this file never contains
 * the literal tokens (it would otherwise flag itself).
 */
const BANNED_SIZES = ['xs', 'sm', 'base', 'xl', '2xl'] as const
const FIX: Record<string, string> = {
	xs: 'text-body-2xs',
	sm: 'text-body-xs',
	base: 'text-body-sm',
	xl: 'text-body-md',
	'2xl': 'text-body-lg',
}

// Whole-token match: not preceded/followed by a word char or hyphen, so variant
// prefixes (`md:`, `file:`, `group-hover:`) are fine and `text-2xl` never
// partial-matches `text-xl`, nor does `text-body-sm` match `text-sm`.
const BANNED = new RegExp(
	`(?<![\\w-])text-(${BANNED_SIZES.join('|')})(?![\\w-])`,
)

function walk(dir: string): string[] {
	const out: string[] = []
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name)
		if (entry.isDirectory()) out.push(...walk(full))
		else if (/\.tsx?$/.test(entry.name)) out.push(full)
	}
	return out
}

test('app code uses the semantic type ramp, not raw Tailwind font sizes', () => {
	const offenders: string[] = []
	for (const file of walk(join(process.cwd(), 'app'))) {
		if (file === SELF) continue
		const lines = readFileSync(file, 'utf8').split('\n')
		lines.forEach((line, i) => {
			const m = line.match(BANNED)
			if (m) {
				const raw = m[0]
				const size = m[1]!
				offenders.push(`${file}:${i + 1}  ${raw} → use ${FIX[size]}`)
			}
		})
	}
	expect(
		offenders,
		`Raw Tailwind font-size utilities found — replace with the semantic ramp:\n${offenders.join('\n')}`,
	).toEqual([])
})
