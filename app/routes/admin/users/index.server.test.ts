import { expect, test } from 'vitest'
import { getSessionExpirationDate } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { createUser } from '#tests/db-utils.ts'
import {
	getSessionCookieFor,
	makeAdmin,
	makeReader,
	statusOf,
} from '#tests/post-admin-utils.ts'
import { BASE_URL } from '#tests/utils.ts'
import { action, loader } from './index.tsx'

async function requestFor(userId: string, query = '') {
	const cookie = await getSessionCookieFor(userId)
	return new Request(`${BASE_URL}/admin/users${query}`, {
		headers: { cookie },
	})
}

function callLoader(request: Request) {
	return loader({ request } as Parameters<typeof loader>[0])
}

/** A POST to `/admin/users` carrying a bulk `op` over the given user ids. */
async function bulkRequest(actingUserId: string, op: string, userIds: string[]) {
	const cookie = await getSessionCookieFor(actingUserId)
	const body = new URLSearchParams({ op })
	for (const id of userIds) body.append('userId', id)
	return new Request(`${BASE_URL}/admin/users`, {
		method: 'POST',
		headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
		body,
	})
}

function callAction(request: Request) {
	return action({ request } as Parameters<typeof action>[0])
}

/** The `data()`-wrapped payload of a bulk action result. */
function dataOf(result: Awaited<ReturnType<typeof action>>) {
	if (result instanceof Response) {
		throw new Error('expected a data() result, got a Response')
	}
	return result.data
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

test('the bulk action refuses a non-manager (reader) with a 403', async () => {
	const reader = await makeReader()
	const target = await prisma.user.create({
		select: { id: true },
		data: createUser(),
	})

	const thrown = await callAction(
		await bulkRequest(reader.id, 'deactivate', [target.id]),
	).catch((error: unknown) => error)
	expect(statusOf(thrown)).toBe(403)
})

test('a bulk deactivate applies per-user and toasts the count', async () => {
	const admin = await makeAdmin()
	const a = await prisma.user.create({ select: { id: true }, data: createUser() })
	const b = await prisma.user.create({ select: { id: true }, data: createUser() })

	const response = await callAction(
		await bulkRequest(admin.id, 'deactivate', [a.id, b.id]),
	)

	expect(dataOf(response)).toMatchObject({ status: 'success' })
	// A success toast rides on the response without navigating away.
	expect((response as { init?: ResponseInit }).init?.headers).toBeDefined()
	for (const id of [a.id, b.id]) {
		const fresh = await prisma.user.findUniqueOrThrow({
			where: { id },
			select: { deactivatedAt: true },
		})
		expect(fresh.deactivatedAt).toBeInstanceOf(Date)
	}
})

test('a bulk force-logout clears every selected user’s sessions', async () => {
	const admin = await makeAdmin()
	const a = await prisma.user.create({ select: { id: true }, data: createUser() })
	await prisma.session.create({
		data: { expirationDate: getSessionExpirationDate(), userId: a.id },
	})

	const response = await callAction(
		await bulkRequest(admin.id, 'force-logout', [a.id]),
	)

	expect(dataOf(response)).toMatchObject({ status: 'success' })
	expect(await prisma.session.count({ where: { userId: a.id } })).toBe(0)
})

test('a bulk delete that includes the acting admin skips their own row', async () => {
	// The admin selects themselves plus another user. The self-guard skips the
	// admin's own account (you can't delete yourself) while the other delete lands —
	// a partial apply, never navigating away.
	const admin = await makeAdmin()
	const other = await prisma.user.create({
		select: { id: true },
		data: createUser(),
	})

	const response = await callAction(
		await bulkRequest(admin.id, 'delete', [admin.id, other.id]),
	)

	expect(dataOf(response)).toMatchObject({ status: 'success' })
	// The admin survived their own batch; the other user is gone.
	expect(
		await prisma.user.findUnique({ where: { id: admin.id }, select: { id: true } }),
	).not.toBeNull()
	expect(
		await prisma.user.findUnique({ where: { id: other.id }, select: { id: true } }),
	).toBeNull()
})

test('the bulk action rejects an unknown op with a 400', async () => {
	const admin = await makeAdmin()
	const target = await prisma.user.create({
		select: { id: true },
		data: createUser(),
	})

	const thrown = await callAction(
		await bulkRequest(admin.id, 'frobnicate', [target.id]),
	).catch((error: unknown) => error)
	expect(statusOf(thrown)).toBe(400)
})
