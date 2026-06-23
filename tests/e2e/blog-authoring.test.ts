import { prisma } from '#app/utils/db.server.ts'
import { expect, test } from '#tests/playwright-utils.ts'

/**
 * The full authoring loop end-to-end: an admin creates a Draft, sees the live
 * preview, publishes it, and the post becomes readable on the public blog — and
 * the slug locks once it's live (EPT-49).
 */
test('an admin drafts, previews, publishes, and the post goes live', async ({
	page,
	login,
}) => {
	// `login()` signs in a fresh user with the `user` role; grant it `admin` so it
	// holds the `post` permissions the editor guards require.
	const user = await login()
	await prisma.user.update({
		where: { id: user.id },
		data: { roles: { connect: { name: 'admin' } } },
	})

	const unique = Date.now()
	const title = `E2E Authoring ${unique}`
	const slug = `e2e-authoring-${unique}`

	await page.goto('/admin/blog/new')

	await page.getByLabel('Title').fill(title)
	// Take the wheel on the slug so the public URL is predictable.
	await page.getByLabel('Slug').fill(slug)
	await page.getByLabel('Excerpt').fill('A short summary for the feed card.')
	await page.getByLabel('Body (Markdown)').fill('# Hello\n\nThis is the body.')

	// The live preview renders through the public pipeline and shows the heading.
	await expect(
		page.getByLabel('Live preview').getByRole('heading', { name: 'Hello' }),
	).toBeVisible()

	await page.getByRole('button', { name: /create draft/i }).click()

	// Landed on the post's editor; still a Draft, so the slug is editable.
	await expect(page).toHaveURL(/\/admin\/blog\/.+\/edit$/)
	await expect(page.getByLabel('Slug')).toBeEnabled()
	const postId = page.url().match(/\/admin\/blog\/(.+)\/edit$/)?.[1]

	await page.getByRole('button', { name: /^publish$/i }).click()

	// After publishing the slug locks (disabled + helper text), and Unpublish
	// replaces Publish.
	await expect(page.getByLabel('Slug')).toBeDisabled()
	await expect(page.getByText(/locked — changing a live url/i)).toBeVisible()
	await expect(
		page.getByRole('button', { name: /unpublish/i }),
	).toBeVisible()

	// The post is now public: it appears on the feed and reads at its slug.
	await page.goto('/blog')
	await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible()

	await page.goto(`/blog/${slug}`)
	await expect(page.getByRole('heading', { name: title })).toBeVisible()

	// Keep the shared e2e DB tidy — the authored post outlives the user (authorId
	// is SetNull), so remove it explicitly.
	if (postId) {
		await prisma.post.deleteMany({ where: { id: postId } })
	}
})
