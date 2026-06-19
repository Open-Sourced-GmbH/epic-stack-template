/**
 * Copies the Tailwind-compiled stylesheet from the build output into
 * `.design-sync/styles.compiled.css` — the `cssEntry` the design-sync bundler
 * reads (see design-sync.config.json).
 *
 * The compiled filename carries a content hash that changes every build
 * (`tailwind-<hash>.css`), so this used to be a manual copy keyed on a moving
 * hash — exactly the kind of step that silently ships stale styles to Claude
 * Design. This script globs the hashed file so the copy is reproducible.
 *
 * Run it after `pnpm build`, before `/design-sync`:
 *
 *   pnpm build && pnpm design-sync:css
 */
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanTokenSurface } from './clean-token-surface.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS_DIR = join(ROOT, 'build/client/assets')
const OUT_PATH = join(ROOT, '.design-sync/styles.compiled.css')

function rel(p: string): string {
	return p.replace(ROOT + '/', '')
}

async function main() {
	let entries: string[]
	try {
		entries = await readdir(ASSETS_DIR)
	} catch {
		throw new Error(
			`No build output at ${rel(ASSETS_DIR)} — run \`pnpm build\` first.`,
		)
	}

	const matches = entries.filter((f) => /^tailwind-.*\.css$/.test(f))
	if (matches.length === 0) {
		throw new Error(
			`No tailwind-*.css in ${rel(ASSETS_DIR)} — run \`pnpm build\` first.`,
		)
	}
	if (matches.length > 1) {
		throw new Error(
			`Ambiguous Tailwind stylesheet — found ${matches.length}: ${matches.join(
				', ',
			)}. Clean build/ and rebuild.`,
		)
	}

	const file = matches[0]!
	const src = join(ASSETS_DIR, file)
	// Filter the compiled CSS as it's copied so the design-sync token surface
	// carries only the semantic tokens, not Tailwind plumbing / utility locals.
	const filtered = cleanTokenSurface(await readFile(src, 'utf8'))
	await writeFile(OUT_PATH, filtered, 'utf8')
	console.log(`✓ ${rel(src)} → ${rel(OUT_PATH)} (token surface filtered)`)
}

await main()
