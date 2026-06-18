import { readFile } from 'node:fs/promises'
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

	expect(barrel.sort()).toEqual(canonical)
	expect(specimens.sort()).toEqual(canonical)
	// Every curated component also needs hand-written prop docs for the bundle.
	expect(Object.keys(config.dtsPropsFor).sort()).toEqual(canonical)
})

test('design-sync componentSrcMap points at real component files', async () => {
	const config = JSON.parse(await read('design-sync.config.json')) as {
		componentSrcMap: Record<string, string>
	}
	for (const rel of Object.values(config.componentSrcMap)) {
		await expect(read(rel)).resolves.toBeTruthy()
	}
})
