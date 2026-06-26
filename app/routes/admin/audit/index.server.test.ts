import { expect, test } from 'vitest'
import { recordAuditEvent } from '#app/utils/audit.server.ts'
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
	return new Request(`${BASE_URL}/admin/audit${query}`, {
		headers: { cookie },
	})
}

function callLoader(request: Request) {
	return loader({ request } as Parameters<typeof loader>[0])
}

/** A fresh, persisted user with the identity fields `recordAuditEvent` snapshots. */
function makeUser() {
	return prisma.user.create({
		data: createUser(),
		select: { id: true, email: true, username: true, name: true },
	})
}

test('the viewer refuses a non-manager (reader) with a 403', async () => {
	const reader = await makeReader()

	const thrown = await callLoader(await requestFor(reader.id)).catch(
		(error: unknown) => error,
	)
	expect(statusOf(thrown)).toBe(403)
})

test('the loader filters by event kind (server-side)', async () => {
	const admin = await makeAdmin()
	const actor = await makeUser()

	await recordAuditEvent({
		event: 'role.granted',
		actor,
		target: { id: 'role-x', type: 'role', label: 'editor' },
		details: { role: 'editor' },
	})
	await recordAuditEvent({
		event: 'user.deactivated',
		actor,
		target: { id: actor.id, type: 'user', label: actor.email },
	})

	const { rows } = await callLoader(
		await requestFor(admin.id, `?actorId=${actor.id}&event=role.granted`),
	)
	expect(rows).toHaveLength(1)
	expect(rows[0]?.event).toBe('role.granted')
})

test('the loader filters by actor and by target (server-side)', async () => {
	const admin = await makeAdmin()
	const alice = await makeUser()
	const bob = await makeUser()

	await recordAuditEvent({
		event: 'role.granted',
		actor: alice,
		target: { id: bob.id, type: 'user', label: bob.email },
		details: { role: 'admin' },
	})
	await recordAuditEvent({
		event: 'user.deactivated',
		actor: bob,
		target: { id: alice.id, type: 'user', label: alice.email },
	})

	const byActor = await callLoader(
		await requestFor(admin.id, `?actorId=${alice.id}`),
	)
	expect(byActor.rows.map((r) => r.event)).toEqual(['role.granted'])

	const byTarget = await callLoader(
		await requestFor(admin.id, `?targetId=${alice.id}`),
	)
	expect(byTarget.rows.map((r) => r.event)).toEqual(['user.deactivated'])
})

test('a deleted actor resolves to the denormalized-label fallback', async () => {
	const admin = await makeAdmin()
	const actor = await makeUser()
	const target = await makeUser()

	await recordAuditEvent({
		event: 'role.granted',
		actor,
		target: { id: target.id, type: 'user', label: target.email },
		details: { role: 'admin' },
	})

	// The actor and target are later deleted — the FK blanks but the labels persist.
	await prisma.user.delete({ where: { id: actor.id } })
	await prisma.user.delete({ where: { id: target.id } })

	// Filter by the (still-stored) target id to isolate this row.
	const { rows } = await callLoader(
		await requestFor(admin.id, `?targetId=${target.id}`),
	)
	expect(rows).toHaveLength(1)
	const [row] = rows
	// Actor: FK gone (no id), flagged deleted, label is the snapshot.
	expect(row?.actor).toMatchObject({
		id: null,
		deleted: true,
		label: actor.name,
	})
	// Target: the plain-string id dangles, so it's flagged deleted too.
	expect(row?.target).toMatchObject({ deleted: true })
})

test('the loader exposes the inline add/remove diff for a permissions change', async () => {
	const admin = await makeAdmin()
	const actor = await makeUser()

	await recordAuditEvent({
		event: 'role.permissions.changed',
		actor,
		target: { id: 'role-y', type: 'role', label: 'editor' },
		details: { added: ['read:user:any'], removed: ['delete:user:any'] },
	})

	const { rows } = await callLoader(
		await requestFor(admin.id, `?actorId=${actor.id}`),
	)
	expect(rows[0]?.diff).toEqual({
		added: ['read:user:any'],
		removed: ['delete:user:any'],
	})
})
