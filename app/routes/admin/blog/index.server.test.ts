import { expect, test } from 'vitest'
import { prisma } from '#app/utils/db.server.ts'
import {
	getSessionCookieFor,
	makeAdmin,
	makeReader,
} from '#tests/post-admin-utils.ts'
import { BASE_URL } from '#tests/utils.ts'
import { loader } from './index.tsx'

async function requestFor(userId: string) {
	const cookie = await getSessionCookieFor(userId)
	return new Request(`${BASE_URL}/admin/blog`, { headers: { cookie } })
}

function callLoader(request: Request) {
	return loader({ request } as Parameters<typeof loader>[0])
}

test('an admin sees every post, Drafts included', async () => {
	const admin = await makeAdmin()
	await prisma.post.create({
		data: { title: 'Live', slug: 'live', body: 'b', publishedAt: new Date() },
		select: { id: true },
	})
	await prisma.post.create({
		data: { title: 'Draft', slug: 'draft', body: 'b' },
		select: { id: true },
	})

	const { posts, total, publishedCount } = await callLoader(
		await requestFor(admin.id),
	)
	expect(total).toBe(2)
	expect(publishedCount).toBe(1)
	expect(posts.map((p) => p.title).sort()).toEqual(['Draft', 'Live'])
})

test('the list refuses a non-admin (reader)', async () => {
	const reader = await makeReader()

	const thrown = await callLoader(await requestFor(reader.id)).catch(
		(error: unknown) => error,
	)
	const status =
		thrown instanceof Response
			? thrown.status
			: (thrown as { init?: ResponseInit }).init?.status
	expect(status).toBe(403)
})
