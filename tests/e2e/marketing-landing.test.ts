import { type Page } from '@playwright/test'
import { expect, test } from '#tests/playwright-utils.ts'

/**
 * Open the ⌘K palette via the global shortcut, retrying until it appears.
 * The listener is attached in a client `useEffect`, so a keypress fired before
 * React hydrates is silently dropped — `toPass` re-presses until it lands.
 */
async function openPalette(page: Page) {
	await expect(async () => {
		await page.keyboard.press('ControlOrMeta+KeyK')
		await expect(page.getByRole('dialog')).toBeVisible({ timeout: 1000 })
	}).toPass()
	return page.getByRole('dialog')
}

test('landing renders its key sections', async ({ page, navigate }) => {
	await navigate('/')

	await expect(page.getByRole('heading', { level: 1 })).toContainText(
		/software that feels/i,
	)
	await expect(
		page.getByRole('heading', { name: /this isn't a screenshot/i }),
	).toBeVisible()
	await expect(
		page.getByRole('heading', { name: /everything is a keystroke away/i }),
	).toBeVisible()
})

test('landing does not scroll horizontally on a narrow viewport', async ({
	page,
	navigate,
}) => {
	// A grid/flex child holding the wide "code is the product" code block defaults
	// to min-width:auto, so without min-w-0 the long source lines blow the cell —
	// and the whole page — wider than the viewport. Assert the document never
	// overflows sideways at a phone width.
	await page.setViewportSize({ width: 375, height: 812 })
	await navigate('/')

	const overflows = await page.evaluate(
		() =>
			document.documentElement.scrollWidth >
			document.documentElement.clientWidth,
	)
	expect(overflows).toBe(false)
})

test('landing renders inside the unified AppShell navbar', async ({
	page,
	navigate,
}) => {
	await navigate('/')

	// The landing now shares the universal AppShell top navbar (marketing variant)
	// with the blog: the Primary nav carries the Über + Blog product links, and —
	// logged out — the guest CTA (→ signup) rather than the `full` Log In button.
	const nav = page.getByRole('navigation', { name: 'Primary' })
	await expect(nav).toBeVisible()
	await expect(nav.getByRole('link', { name: 'Über' })).toBeVisible()
	await expect(nav.getByRole('link', { name: 'Blog' })).toBeVisible()
	await expect(page.getByRole('link', { name: /los geht's/i })).toBeVisible()
})

test('footer sitemap anchors jump to their section', async ({
	page,
	navigate,
}) => {
	await navigate('/')

	// The in-page section nav moved out of the (retired) bespoke header into the
	// footer sitemap; its anchors still jump to the matching section.
	const workLink = page
		.getByRole('navigation', { name: 'Studio' })
		.getByRole('link', { name: 'Work' })
	// The footer sits far down a long page; settle the smooth-scroll before the
	// click so the anchor (not a mid-animation hit) registers the fragment nav.
	await workLink.scrollIntoViewIfNeeded()
	await workLink.click()

	await expect(page).toHaveURL(/#work$/)
})

test('⌘K opens the palette, filters, navigates on Enter, and Esc closes', async ({
	page,
	navigate,
}) => {
	await navigate('/')

	// Global shortcut opens the palette anywhere on the page.
	const palette = await openPalette(page)

	// Filtering narrows the visible results.
	const input = palette.getByPlaceholder(/type a command or search/i)
	await input.fill('pricing')
	await expect(palette.getByRole('option', { name: 'Pricing' })).toBeVisible()
	await expect(palette.getByRole('option', { name: 'Home' })).toHaveCount(0)

	// Enter runs the highlighted navigation command.
	await page.keyboard.press('Enter')
	await expect(palette).toBeHidden()
	await expect(page).toHaveURL(/#pricing$/)

	// Esc closes the palette.
	await openPalette(page)
	await page.keyboard.press('Escape')
	await expect(page.getByRole('dialog')).toBeHidden()
})

test('theme command flips light↔dark and persists across reload', async ({
	page,
	navigate,
}) => {
	await navigate('/')
	// The theme is applied as a class on <html>; there is no role-based locator
	// for the document element.
	// eslint-disable-next-line playwright/no-raw-locators
	const html = page.locator('html')

	async function runThemeCommand(name: 'Light' | 'Dark') {
		const palette = await openPalette(page)
		await palette.getByPlaceholder(/type a command or search/i).fill(name)
		await palette.getByRole('option', { name, exact: true }).first().click()
		await expect(palette).toBeHidden()
	}

	// Start from a known state, then flip to dark.
	await runThemeCommand('Light')
	await expect(html).not.toHaveClass(/dark/)

	await runThemeCommand('Dark')
	await expect(html).toHaveClass(/dark/)

	// The class flip above is optimistic; wait for the `en_theme` cookie to be
	// committed by the theme-switch POST before re-navigating, otherwise the
	// fresh load can race the in-flight request and miss the preference.
	await expect
		.poll(async () => {
			const cookies = await page.context().cookies()
			return cookies.find((c) => c.name === 'en_theme')?.value
		})
		.toBe('dark')

	// A fresh navigation is a full server round-trip carrying the `en_theme`
	// cookie, so it proves the dark preference is persisted (SSR re-applies it).
	// We re-navigate rather than `page.reload()`: under Playwright a reload after
	// several theme switches trips the client-hint check script into a reload
	// loop (a harness/emulation quirk, unrelated to persistence).
	await navigate('/')
	await expect(html).toHaveClass(/dark/)
})

test('navbar accent swatch re-themes and persists without a redirect 404', async ({
	page,
	navigate,
}) => {
	await navigate('/')

	// Pick an accent preset swatch in the navbar (posts to /resources/accent via a
	// JS fetcher). The bespoke customizer dock is retired — the navbar's
	// AccentSwitch now owns accent selection. The submission is fetcher-only and
	// must NOT redirect: a redirect from a single-fetch POST returns a 202 to the
	// index `.data` URL that 404s through the splat route. We assert the page
	// stays put (no error boundary), the swatch reads as active, and the cookie
	// commits.
	await page.getByRole('button', { name: 'Iris' }).click()
	await expect(page.getByText(/can't find this page/i)).toHaveCount(0)
	await expect(page.getByRole('button', { name: 'Iris' })).toHaveAttribute(
		'aria-pressed',
		'true',
	)

	await expect
		.poll(async () => {
			const cookies = await page.context().cookies()
			return cookies.find((c) => c.name === 'en_accent')?.value
		})
		.toBeTruthy()

	// A fresh server round-trip re-applies the accent from its cookie.
	await navigate('/')
	await expect(page.getByRole('button', { name: 'Iris' })).toHaveAttribute(
		'aria-pressed',
		'true',
	)
})
