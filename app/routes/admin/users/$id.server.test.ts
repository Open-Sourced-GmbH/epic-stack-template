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

function callAction(request: Request, targetId: string) {
	return action({
		request,
		params: { id: targetId },
		context: {},
	} as unknown as Parameters<typeof action>[0])
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
	expect(response.data).toMatchObject({ ok: true })
	expect(await roleNamesOf(target.id)).toEqual([role.name])
})

test('a revoke that breaches the admin floor returns a blocked 422 (not thrown)', async () => {
	// The acting admin is the *only* capable admin; revoking their own role would
	// drop the system below the floor.
	const admin = await makeAdmin()

	const response = await callAction(await roleRequest(admin.id, []), admin.id)

	expect(statusOf(response)).toBe(422)
	expect(response.data).toMatchObject({ ok: false })
	expect((response.data as { blocked: string }).blocked).toMatch(/last admin/i)
	// The role survives — the transaction rolled back.
	expect(await roleNamesOf(admin.id)).toHaveLength(1)
})
