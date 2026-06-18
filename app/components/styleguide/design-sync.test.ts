import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')

/**
 * The curated design-system component set is declared in three places that must
 * move together: `design-sync.config.json` (the canonical map the bundler
 * reads), the `.design-sync/entry.tsx` barrel (what actually gets bundled), and
 * `specimens.tsx` (what the styleguide renders). They were "kept in lockstep"
 * by hand with no enforcement — add a component to one and forget another and
 * `/design-sync` publishes a stale set with no error. This test enforces the
 * lockstep.
 */
function read(rel: string) {
	return readFile(join(ROOT, rel), 'utf8')
}

/** PascalCase named imports/exports pulled from `#app/components/ui/*` lines. */
function uiComponents(
	source: string,
	keyword: 'import' | 'export',
): Set<string> {
	const re = new RegExp(
		`${keyword}\\s+\\{([^}]+)\\}\\s+from\\s+'#app/components/ui/[^']+'`,
		'g',
	)
	const names = new Set<string>()
	for (const m of source.matchAll(re)) {
		for (const raw of m[1]!.split(',')) {
			const name = raw
				.trim()
				.split(/\s+as\s+/)[0]!
				.trim()
			// Components are PascalCase; skip helpers like `buttonVariants`.
			if (/^[A-Z]/.test(name)) names.add(name)
		}
	}
	return names
}

/**
 * Map a UI export name to its canonical root, or null if it belongs to none.
 * Compound components (DropdownMenu, Tooltip, InputOTP) export sub-parts
 * (DropdownMenuItem, TooltipContent, InputOTPSlot, …) that the design agent
 * needs in order to compose them; each maps back to its root by the longest
 * canonical-name prefix.
 */
function rootOf(name: string, canonical: string[]): string | null {
	const roots = canonical
		.filter((c) => name === c || name.startsWith(c))
		.sort((a, b) => b.length - a.length)
	return roots[0] ?? null
}

test('design-sync curated set is in lockstep across config, barrel, and specimens', async () => {
	const config = JSON.parse(await read('design-sync.config.json')) as {
		componentSrcMap: Record<string, string>
		dtsPropsFor: Record<string, string>
	}
	const canonical = [...Object.keys(config.componentSrcMap)].sort()

	const barrel = [
		...uiComponents(await read('.design-sync/entry.tsx'), 'export'),
	]
	const specimens = [
		...uiComponents(
			await read('app/components/styleguide/specimens.tsx'),
			'import',
		),
	]

	// Every canonical (carded) component is exported by the barrel and imported
	// by a specimen — by its exact root name.
	expect(canonical.filter((c) => !barrel.includes(c))).toEqual([])
	expect(canonical.filter((c) => !specimens.includes(c))).toEqual([])

	// No orphans: every UI name pulled into the barrel / specimens must belong to
	// a canonical root (an exact match, or a compound sub-part like
	// DropdownMenuItem) — so a stray import can never silently ship.
	expect(barrel.filter((n) => !rootOf(n, canonical))).toEqual([])
	expect(specimens.filter((n) => !rootOf(n, canonical))).toEqual([])

	// Every curated component also needs hand-written prop docs for the bundle.
	expect(Object.keys(config.dtsPropsFor).sort()).toEqual(canonical)
})

test('design-sync hand-owned previews track the curated set one-to-one', async () => {
	const config = JSON.parse(await read('design-sync.config.json')) as {
		componentSrcMap: Record<string, string>
	}
	const canonical = [...Object.keys(config.componentSrcMap)].sort()

	const files = await readdir(join(ROOT, '.design-sync/previews'))
	const previews = files
		.filter((f) => f.endsWith('.tsx'))
		.map((f) => f.replace(/\.tsx$/, ''))
		.sort()

	// One PascalCase preview file per curated root — no missing preview, no
	// orphan file. These are hand-owned (no @ds-preview marker), so nothing
	// regenerates them; without this guard a curated component could ship to
	// /design-sync with no preview, or a deleted one could leave a stale file.
	expect(previews).toEqual(canonical)
})

test('design-sync componentSrcMap points at real component files', async () => {
	const config = JSON.parse(await read('design-sync.config.json')) as {
		componentSrcMap: Record<string, string>
	}
	for (const rel of Object.values(config.componentSrcMap)) {
		await expect(read(rel)).resolves.toBeTruthy()
	}
})
