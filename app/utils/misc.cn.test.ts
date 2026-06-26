import { expect, test } from 'vitest'
import { cn } from './misc.tsx'

test('cn merges conflicting utilities, last wins', () => {
	expect(cn('px-2', 'px-4')).toBe('px-4')
})

test('cn keeps a semantic font-size token alongside a text color', () => {
	// Regression: tailwind-merge's default config misreads `text-body-*` as a
	// text color and would drop the real color token in the same call. `cn` is
	// extended (see misc.tsx) so size + color coexist.
	expect(cn('text-muted-foreground text-body-sm')).toBe(
		'text-muted-foreground text-body-sm',
	)
	expect(cn('text-body-xs text-brand')).toBe('text-body-xs text-brand')
})

test('cn still resolves two semantic font sizes to last-wins', () => {
	expect(cn('text-body-sm text-body-lg')).toBe('text-body-lg')
	expect(cn('text-h6 text-h3')).toBe('text-h3')
})
