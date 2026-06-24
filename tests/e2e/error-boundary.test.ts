import { expect, test } from '#tests/playwright-utils.ts'

test('Test root error boundary caught', async ({ page, navigate }) => {
	const pageUrl = '/does-not-exist'
	const res = await navigate(pageUrl as any)

	expect(res?.status()).toBe(404)
	await expect(page.getByText(/We can't find this page/i)).toBeVisible()

	// The dead end still carries the universal AppShell navbar to escape from
	// (ADR-068, EPT-78): the Primary nav and, for an anonymous visitor, a Log In
	// affordance are both present on the 404 page.
	const nav = page.getByRole('navigation', { name: 'Primary' })
	await expect(nav).toBeVisible()
	await expect(nav.getByRole('link', { name: 'Log In' })).toBeVisible()
})
