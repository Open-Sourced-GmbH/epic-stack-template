import { faker } from '@faker-js/faker'
import { expect, test } from '#tests/playwright-utils.ts'

test('the navbar theme toggle flips dark mode and persists across a navigation', async ({
	page,
	navigate,
}) => {
	await navigate('/login')

	// eslint-disable-next-line playwright/no-raw-locators
	const html = page.locator('html')
	await expect(html).not.toHaveClass(/dark/)

	// The minimal navbar owns the theme control: a single cycling ThemeSwitch
	// button (system→light→dark), the only button in the Primary nav. It posts
	// to /resources/theme-switch with no redirectTo (a JS fetcher). From the
	// default (system, resolving light) two clicks lands on dark.
	const themeToggle = page
		.getByRole('navigation', { name: 'Primary' })
		.getByRole('button')
	await themeToggle.click()
	await themeToggle.click()
	await expect(html).toHaveClass(/dark/)

	// The class flip is optimistic; wait for the `en_theme` cookie to commit so
	// the fresh navigation below doesn't race the in-flight POST.
	await expect
		.poll(async () => {
			const cookies = await page.context().cookies()
			return cookies.find((c) => c.name === 'en_theme')?.value
		})
		.toBe('dark')

	// A fresh server round-trip re-applies the preference from the cookie (SSR),
	// proving persistence. We navigate rather than reload — a reload after a
	// theme switch trips the client-hint check into a reload loop under
	// Playwright (a known emulation quirk, unrelated to persistence).
	await navigate('/')
	await expect(html).toHaveClass(/dark/)
})

test('invalid credentials surface an error alert and mark the fields invalid', async ({
	page,
	navigate,
}) => {
	await navigate('/login')

	// A format-valid username (letters/numbers/underscores) that matches no user,
	// so validation passes and `login` rejects the credentials.
	await page
		.getByRole('textbox', { name: /username/i })
		.fill(`ghost${faker.string.alphanumeric(8).toLowerCase()}`)
	await page.getByLabel(/^password$/i).fill(faker.internet.password())
	await page.getByRole('button', { name: /log in/i }).click()

	await expect(
		page.getByText(/invalid username or password/i),
	).toBeVisible()
	await expect(page.getByRole('textbox', { name: /username/i })).toHaveAttribute(
		'aria-invalid',
		'true',
	)
})
