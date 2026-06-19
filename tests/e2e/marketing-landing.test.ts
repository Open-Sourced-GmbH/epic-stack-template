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
		page.getByRole('heading', { name: /the design system, running live/i }),
	).toBeVisible()
	await expect(
		page.getByRole('heading', { name: /everything is a keystroke away/i }),
	).toBeVisible()
})

test('header nav anchors jump to their section', async ({ page, navigate }) => {
	await navigate('/')

	await page
		.getByRole('navigation', { name: 'Primary' })
		.getByRole('link', { name: 'Work' })
		.click()

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
