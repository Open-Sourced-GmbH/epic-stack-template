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

test('the ⌘K palette has a Blog command that navigates to /blog', async ({
	page,
	navigate,
}) => {
	await navigate('/')

	const palette = await openPalette(page)
	await palette.getByPlaceholder(/type a command or search/i).fill('Blog')
	await palette.getByRole('option', { name: 'Blog', exact: true }).first().click()

	await expect(palette).toBeHidden()
	await expect(page).toHaveURL(/\/blog$/)
	await expect(
		page.getByRole('heading', { name: /notes on building/i }),
	).toBeVisible()
})

test('the blog renders inside the shared marketing chrome', async ({
	page,
	navigate,
}) => {
	await navigate('/blog')

	// The same branded header/footer the landing uses wrap the blog route.
	await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible()
	await expect(page.getByRole('contentinfo')).toBeVisible()
	await expect(
		page.getByRole('heading', { name: /notes on building/i }),
	).toBeVisible()
})
