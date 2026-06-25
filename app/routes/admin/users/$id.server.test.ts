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
import { action } from './$id.tsx'

/** A POST request to `/admin/users/:id` carrying the given role names. */
async function roleRequest(actingUserId: string, roleNames: string[]) {
	const cookie = await getSessionCookieFor(actingUserId)
	const body = new URLSearchParams()
	for (const name of roleNames) body.append('roles', name)
	return new Request(`${BASE_URL}/admin/users/x`, {
		method: 'POST',
		headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
		body,
	})
}

/** A POST to `/admin/users/:id` carrying a single `intent` (the lifecycle ops). */
async function intentRequest(actingUserId: string, intent: string) {
	const cookie = await getSessionCookieFor(actingUserId)
	const body = new URLSearchParams({ intent })
	return new Request(`${BASE_URL}/admin/users/x`, {
		method: 'POST',
		headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
		body,
	})
}

function callAction(request: Request, targetId: string) {
	return action({
		request,
		params: { id: targetId },
		context: {},
	} as unknown as Parameters<typeof action>[0])
}

/**
 * The `data()`-wrapped payload of an action result. The delete path returns a
 * redirect `Response`, so narrow it out — the role/blocked paths under test never
 * redirect.
 */
function dataOf(result: Awaited<ReturnType<typeof action>>) {
	if (result instanceof Response) {
		throw new Error('expected a data() result, got a Response')
	}
	return result.data
}

async function roleNamesOf(userId: string) {
	const fresh = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: { roles: { select: { name: true } } },
	})
	return fresh.roles.map((r) => r.name)
}

test('the action refuses a non-manager (reader) with a 403', async () => {
	const reader = await makeReader()
	const target = await prisma.user.create({
		select: { id: true },
		data: createUser(),
	})

	const thrown = await callAction(
		await roleRequest(reader.id, []),
		target.id,
	).catch((error: unknown) => error)
	expect(statusOf(thrown)).toBe(403)
})

test('an admin assigns a role through the action, persisting the change', async () => {
	const admin = await makeAdmin()
	const target = await prisma.user.create({
		select: { id: true },
		data: createUser(),
	})
	const role = await prisma.role.create({
		select: { name: true },
		data: { name: 'editor-action' },
	})

	const response = await callAction(
		await roleRequest(admin.id, [role.name]),
		target.id,
	)
	expect(dataOf(response)).toMatchObject({ ok: true })
	expect(await roleNamesOf(target.id)).toEqual([role.name])
})

test('a revoke that breaches the admin floor returns a blocked 422 (not thrown)', async () => {
	// The acting admin is the *only* capable admin; revoking their own role would
	// drop the system below the floor.
	const admin = await makeAdmin()

	const response = await callAction(await roleRequest(admin.id, []), admin.id)

	expect(statusOf(response)).toBe(422)
	expect(dataOf(response)).toMatchObject({ ok: false })
	expect((dataOf(response) as { blocked: string }).blocked).toMatch(/last admin/i)
	// The role survives — the transaction rolled back.
	expect(await roleNamesOf(admin.id)).toHaveLength(1)
})

test('the force-logout intent clears the target’s sessions through the action', async () => {
	const admin = await makeAdmin()
	const target = await prisma.user.create({
		select: { id: true },
		data: createUser(),
	})
	await prisma.session.create({
		data: { expirationDate: getSessionExpirationDate(), userId: target.id },
	})

	const response = await callAction(
		await intentRequest(admin.id, 'force-logout'),
		target.id,
	)

	expect(dataOf(response)).toMatchObject({ ok: true })
	expect(await prisma.session.count({ where: { userId: target.id } })).toBe(0)
})

test('the delete intent removes the user and redirects to the list', async () => {
	const admin = await makeAdmin()
	const target = await prisma.user.create({
		select: { id: true },
		data: createUser(),
	})

	const response = await callAction(
		await intentRequest(admin.id, 'delete'),
		target.id,
	)

	// Success navigates away — the action returns a redirect to the list.
	expect(response).toBeInstanceOf(Response)
	expect((response as Response).headers.get('location')).toBe('/admin/users')
	expect(
		await prisma.user.findUnique({
			where: { id: target.id },
			select: { id: true },
		}),
	).toBeNull()
})

test('a self-delete is refused with a blocked 422 (not thrown)', async () => {
	const admin = await makeAdmin()

	const response = await callAction(
		await intentRequest(admin.id, 'delete'),
		admin.id,
	)

	expect(statusOf(response)).toBe(422)
	expect(dataOf(response)).toMatchObject({ ok: false, kind: 'deletion' })
	// Still here — the self-guard refused before any delete.
	expect(
		await prisma.user.findUnique({
			where: { id: admin.id },
			select: { id: true },
		}),
	).not.toBeNull()
})
