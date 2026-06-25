import { expect, test } from 'vitest'
import { prisma } from '#app/utils/db.server.ts'
import { createUser } from '#tests/db-utils.ts'
import {
	getSessionCookieFor,
	makeAdmin,
	makeReader,
	statusOf,
} from '#tests/post-admin-utils.ts'
import { BASE_URL } from '#tests/utils.ts'
import { loader } from './index.tsx'

async function requestFor(userId: string, query = '') {
	const cookie = await getSessionCookieFor(userId)
	return new Request(`${BASE_URL}/admin/users${query}`, {
		headers: { cookie },
	})
}

function callLoader(request: Request) {
	return loader({ request } as Parameters<typeof loader>[0])
}

test('an admin sees every account, including their own', async () => {
	const admin = await makeAdmin()
	await prisma.user.create({ select: { id: true }, data: createUser() })

	const { users, total } = await callLoader(await requestFor(admin.id))
	// The admin plus the extra account — at least both are present.
	expect(total).toBeGreaterThanOrEqual(2)
	expect(users.some((u) => u.id === admin.id)).toBe(true)
})

test('the list refuses a non-manager (reader) with a 403', async () => {
	const reader = await makeReader()

	const thrown = await callLoader(await requestFor(reader.id)).catch(
		(error: unknown) => error,
	)
	expect(statusOf(thrown)).toBe(403)
})

test('the loader honours the search query string', async () => {
	const admin = await makeAdmin()
	await prisma.user.create({
		select: { id: true },
		data: { ...createUser(), name: 'Zzyzx Unique', email: 'zzyzx@example.com' },
	})

	const { users, search } = await callLoader(
		await requestFor(admin.id, '?search=zzyzx'),
	)
	expect(search).toBe('zzyzx')
	expect(users.map((u) => u.email)).toEqual(['zzyzx@example.com'])
})
