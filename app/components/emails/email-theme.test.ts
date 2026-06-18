import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import { buildEmailThemeModule } from '../../../scripts/generate-email-theme.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')

/**
 * Drift guard: the email-safe tokens are derived from the OKLCH design tokens in
 * `app/styles/tailwind.css`. If the CSS changes and `pnpm email:theme` wasn't
 * re-run, the committed projection is stale - fail here rather than ship emails
 * with outdated colours. This is the "single source of truth, no duplication"
 * guarantee for the one place email rendering forces derived values.
 */
test('email-theme.generated.ts is up to date with tailwind.css', async () => {
	const css = await readFile(join(ROOT, 'app/styles/tailwind.css'), 'utf8')
	const committed = await readFile(
		join(ROOT, 'app/components/emails/email-theme.generated.ts'),
		'utf8',
	)
	// If this fails, the CSS tokens changed - run `pnpm email:theme` to refresh.
	expect(committed).toBe(buildEmailThemeModule(css))
})
