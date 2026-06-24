import { prisma } from '#app/utils/db.server.ts'
import { expect, test } from '#tests/playwright-utils.ts'

/**
 * The admin blog list's bulk actions end-to-end (EPT-69): an admin selects two
 * Published posts and bulk-unpublishes them (Published → Draft), then selects the
 * same rows and bulk-deletes them. Both ops go through the perm-guarded bulk post
 * mutation and the list revalidates in place.
 */
test('an admin bulk-unpublishes then bulk-deletes selected posts', async ({
	page,
	login,
}) => {
	// `login()` signs in a fresh user with the `user` role; grant `admin` so it
	// holds the `post` permissions the bulk action guards require.
	const user = await login()
	await prisma.user.update({
		where: { id: user.id },
		data: { roles: { connect: { name: 'admin' } } },
	})

	const unique = Date.now()
	const titleA = `Bulk A ${unique}`
	const titleB = `Bulk B ${unique}`
	const a = await prisma.post.create({
		select: { id: true },
		data: {
			title: titleA,
			slug: `bulk-a-${unique}`,
			body: 'body',
			excerpt: 'a',
			publishedAt: new Date(),
		},
	})
	const b = await prisma.post.create({
		select: { id: true },
		data: {
			title: titleB,
			slug: `bulk-b-${unique}`,
			body: 'body',
			excerpt: 'b',
			publishedAt: new Date(),
		},
	})

	try {
		await page.goto('/admin/blog')

		// Select both rows; the bulk-action bar reports the count.
		await page.getByRole('checkbox', { name: new RegExp(titleA, 'i') }).check()
		await page.getByRole('checkbox', { name: new RegExp(titleB, 'i') }).check()
		await expect(page.getByText(/2 selected/i)).toBeVisible()

		// Bulk Unpublish flips both to Draft.
		await page.getByRole('button', { name: /unpublish/i }).click()
		await expect(page.getByText(/unpublished 2 posts/i)).toBeVisible()
		await expect.poll(async () =>
			prisma.post.count({
				where: { id: { in: [a.id, b.id] }, publishedAt: { not: null } },
			}),
		).toBe(0)

		// Re-select and bulk Delete (destructive → double-check confirm).
		await page.getByRole('checkbox', { name: new RegExp(titleA, 'i') }).check()
		await page.getByRole('checkbox', { name: new RegExp(titleB, 'i') }).check()
		await page.getByRole('button', { name: /^delete$/i }).click()
		await page.getByRole('button', { name: /confirm delete/i }).click()
		await expect(page.getByText(/deleted 2 posts/i)).toBeVisible()
		await expect.poll(async () =>
			prisma.post.count({ where: { id: { in: [a.id, b.id] } } }),
		).toBe(0)
	} finally {
		// Tidy the shared e2e DB if the run bailed before the delete landed.
		await prisma.post.deleteMany({ where: { id: { in: [a.id, b.id] } } })
	}
})
