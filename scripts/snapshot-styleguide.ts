/**
 * Snapshots the live `/styleguide` route into a self-contained HTML bundle for
 * publishing to Claude Design via the `/design-sync` skill.
 *
 * Why a live snapshot (not a static generator): the route renders the real
 * `#app/components/ui/*` components, so the published design system can never
 * drift from what ships. Playwright captures the post-hydration DOM plus the
 * actually-applied CSS, so tokens (oklch), variants, and interactive resting
 * states all render faithfully.
 *
 * Usage:
 *   1. Start the dev server (the route is dev-only): `pnpm dev`
 *   2. In another terminal: `pnpm styleguide:snapshot`
 *   3. Review `styleguide/`, then publish with `/design-sync`.
 *
 * Env:
 *   STYLEGUIDE_URL   base URL of the running dev server (default http://localhost:3000)
 *   STYLEGUIDE_OUT   output directory (default ./styleguide)
 */
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { chromium, type Page } from '@playwright/test'

const BASE_URL = (
	process.env.STYLEGUIDE_URL ?? 'http://localhost:3000'
).replace(/\/+$/, '')
const OUT_DIR = process.env.STYLEGUIDE_OUT ?? 'styleguide'
const THEMES = ['light', 'dark'] as const
type Theme = (typeof THEMES)[number]

type SpecimenCapture = {
	name: string
	group: string
	subtitle: string
	width: number
	height: number | null
	html: string
}

/** All applied CSS, serialized from the live document's stylesheets. */
async function extractCss(page: Page): Promise<string> {
	return page.evaluate(() => {
		let css = ''
		for (const sheet of Array.from(document.styleSheets)) {
			try {
				for (const rule of Array.from(sheet.cssRules))
					css += rule.cssText + '\n'
			} catch {
				// cross-origin sheet — skip
			}
		}
		return css
	})
}

/** Inline the icon sprite so `<use href="…#name">` resolves in a standalone file. */
async function extractSprite(
	page: Page,
): Promise<{ href: string; svg: string } | null> {
	const href = await page.evaluate(() => {
		const use = document.querySelector('svg use')
		const h = use?.getAttribute('href') ?? use?.getAttribute('xlink:href')
		return h ? h.split('#')[0]! : null
	})
	if (!href) return null
	const absolute = new URL(href, BASE_URL).toString()
	const res = await page.request.get(absolute)
	if (!res.ok()) return null
	return { href, svg: await res.text() }
}

async function captureSpecimens(page: Page): Promise<SpecimenCapture[]> {
	return page.$$eval('[data-specimen]', (els) =>
		els.map((el) => ({
			name: el.getAttribute('data-specimen') ?? 'unknown',
			group: el.getAttribute('data-group') ?? 'Components',
			subtitle: el.getAttribute('data-subtitle') ?? '',
			width: Number(el.getAttribute('data-vw')) || 480,
			height: el.getAttribute('data-vh')
				? Number(el.getAttribute('data-vh'))
				: null,
			html: el.innerHTML,
		})),
	)
}

function buildHtml({
	theme,
	css,
	sprite,
	body,
}: {
	theme: Theme
	css: string
	sprite: { href: string; svg: string } | null
	body: string
}): string {
	let inner = body
	let spriteMarkup = ''
	if (sprite) {
		// rewrite resolved sprite URLs to bare fragment refs, then inline symbols
		inner = inner.split(sprite.href).join('')
		spriteMarkup = `<div aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">${sprite.svg}</div>`
	}
	return `<!doctype html>
<html class="${theme}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>${css}</style>
</head>
<body class="bg-background text-foreground">
${spriteMarkup}
<div style="padding:2rem">${inner}</div>
</body>
</html>
`
}

async function write(path: string, content: string) {
	await mkdir(dirname(path), { recursive: true })
	await writeFile(path, content, 'utf8')
}

async function main() {
	const browser = await chromium.launch()
	const page = await browser.newPage()

	// Verify the dev server + route are reachable before clobbering output.
	const reachErr = () =>
		new Error(
			`Could not load ${BASE_URL}/styleguide.\n` +
				`The /styleguide route is dev-only, so the dev server must be running:\n` +
				`  1. \`pnpm dev\` (wait for ${BASE_URL})\n` +
				`  2. re-run \`pnpm styleguide:snapshot\`\n` +
				`Override the URL with STYLEGUIDE_URL if the server is elsewhere.`,
		)
	let res
	try {
		// connection-refused makes goto reject before we can read the response
		res = await page.goto(`${BASE_URL}/styleguide`, {
			waitUntil: 'networkidle',
		})
	} catch {
		await browser.close()
		throw reachErr()
	}
	if (!res || !res.ok()) {
		await browser.close()
		throw reachErr()
	}

	const sprite = await extractSprite(page)

	// Capture ALL page-dependent data BEFORE touching the filesystem. The output
	// dir lives inside the project the dev server watches, so writing into it
	// triggers vite's HMR page reload — which navigates the live page and
	// destroys Playwright's execution context mid-capture (the dark pass would
	// crash with "Execution context was destroyed"). Read everything first,
	// close the browser, then write.
	const captures: Array<{
		theme: Theme
		css: string
		specimens: SpecimenCapture[]
	}> = []
	for (const theme of THEMES) {
		await page.evaluate((t) => {
			document.documentElement.classList.toggle('dark', t === 'dark')
		}, theme)
		// let any theme-dependent styles settle
		await page.waitForTimeout(100)

		const css = await extractCss(page)
		const specimens = await captureSpecimens(page)
		captures.push({ theme, css, specimens })
		process.stderr.write(`captured ${specimens.length} specimens (${theme})\n`)
	}

	await browser.close()

	// The live page is gone — now it's safe to write (HMR reloads can't hurt us).
	await rm(OUT_DIR, { recursive: true, force: true })
	// Specimen metadata is theme-independent; use the light pass for the manifest.
	let manifestSpecimens: SpecimenCapture[] = []
	for (const { theme, css, specimens } of captures) {
		if (theme === 'light') manifestSpecimens = specimens
		for (const s of specimens) {
			const html = buildHtml({ theme, css, sprite, body: s.html })
			await write(join(OUT_DIR, theme, `${s.name}.html`), html)
		}
	}

	// Manifest for `/design-sync` → DesignSync register_assets. Cards point at the
	// light-theme files; the dark variants ship alongside for reference.
	const manifest = {
		generatedFrom: `${BASE_URL}/styleguide`,
		themes: THEMES,
		assets: manifestSpecimens.map((s) => ({
			name: s.name,
			path: join(OUT_DIR, 'light', `${s.name}.html`),
			darkPath: join(OUT_DIR, 'dark', `${s.name}.html`),
			group: s.group,
			subtitle: s.subtitle || undefined,
			viewport: s.height
				? { width: s.width, height: s.height }
				: { width: s.width },
		})),
	}
	await write(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))

	// Human-browsable index of the exported bundle.
	const index = `<!doctype html><html class="light"><head><meta charset="utf-8" />
<title>Styleguide bundle</title></head>
<body style="font-family:system-ui;padding:2rem;max-width:60rem;margin:0 auto">
<h1>Styleguide bundle</h1>
<p>Snapshot of <code>${BASE_URL}/styleguide</code>. Publish with <code>/design-sync</code>.</p>
${manifestSpecimens
	.map(
		(s) =>
			`<h2>${s.group} · ${s.name}</h2>
<iframe src="light/${s.name}.html" style="width:100%;height:${(s.height ?? 240) + 80}px;border:1px solid #ddd;border-radius:8px"></iframe>`,
	)
	.join('\n')}
</body></html>`
	await write(join(OUT_DIR, 'index.html'), index)

	process.stderr.write(
		`\nWrote ${manifestSpecimens.length} specimens × ${THEMES.length} themes to ${OUT_DIR}/\n` +
			`Open ${OUT_DIR}/index.html to review, then run /design-sync to publish.\n`,
	)
}

main().catch((err: unknown) => {
	process.stderr.write(
		`\n${err instanceof Error ? err.message : String(err)}\n`,
	)
	process.exit(1)
})
