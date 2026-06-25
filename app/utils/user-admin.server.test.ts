import { expect, test } from 'vitest'
import { createUser } from '#tests/db-utils.ts'
import { makeAdmin, makeReader } from '#tests/post-admin-utils.ts'
import { getAuditEvents } from './audit.server.ts'
import { prisma } from './db.server.ts'
import {
	AdminFloorError,
	getUsersForAdmin,
	setUserRoles,
} from './user-admin.server.ts'

/** Create a user with an explicit `createdAt` so ordering assertions are stable. */
function createUserAt(createdAt: Date, overrides: Record<string, unknown> = {}) {
	return prisma.user.create({
		select: { id: true },
		data: { ...createUser(), createdAt, ...overrides },
	})
}

let editorRoleCounter = 0
/** A plain (non-privileged) role the floor never protects — for assign/revoke. */
function createPlainRole() {
	return prisma.role.create({
		select: { id: true, name: true },
		data: { name: `editor-${editorRoleCounter++}` },
	})
}

/** The acting user as an audit actor (identity fields snapshotted at write time). */
function actorFor(user: { id: string }) {
	return prisma.user.findUniqueOrThrow({
		where: { id: user.id },
		select: { id: true, email: true, username: true, name: true },
	})
}

/** A user's current role names — the post-change assertion every mutation test reads. */
async function roleNamesOf(userId: string) {
	const fresh = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: { roles: { select: { name: true } } },
	})
	return fresh.roles.map((r) => r.name)
}

test('lists every user newest-first with a whole-table total', async () => {
	const older = await createUserAt(new Date('2026-01-01'))
	const newer = await createUserAt(new Date('2026-03-01'))

	const { users, total, page, pageCount } = await getUsersForAdmin({})

	expect(total).toBe(2)
	expect(page).toBe(1)
	expect(pageCount).toBe(1)
	// Newest account floats to the top.
	expect(users.map((u) => u.id)).toEqual([newer.id, older.id])
})

test('search narrows by name and by email, case-insensitively', async () => {
	await createUserAt(new Date('2026-01-01'), {
		name: 'Ada Lovelace',
		username: 'ada_l',
		email: 'ada@example.com',
	})
	await createUserAt(new Date('2026-01-02'), {
		name: 'Grace Hopper',
		username: 'grace_h',
		email: 'grace@navy.example',
	})

	// Match on name (different case than stored).
	const byName = await getUsersForAdmin({ search: 'lovelace' })
	expect(byName.total).toBe(1)
	expect(byName.users[0]?.name).toBe('Ada Lovelace')
	expect(byName.search).toBe('lovelace')

	// Match on the email domain — and only the matching row.
	const byEmail = await getUsersForAdmin({ search: 'NAVY' })
	expect(byEmail.users.map((u) => u.email)).toEqual(['grace@navy.example'])
})

test('paginates with a clamped page and a whole-table pageCount', async () => {
	for (let i = 0; i < 3; i++) {
		await createUserAt(new Date(`2026-01-0${i + 1}`))
	}

	const { users, total, page, pageCount } = await getUsersForAdmin({
		page: 2,
		perPage: 2,
	})

	expect(total).toBe(3)
	expect(pageCount).toBe(2)
	expect(page).toBe(2)
	// Page 2 of a 3-row, 2-per-page list holds exactly the trailing row.
	expect(users).toHaveLength(1)
})

test('a junk page resolves to page 1', async () => {
	await createUserAt(new Date('2026-01-01'))

	const { page } = await getUsersForAdmin({ page: Number('not-a-number') })
	expect(page).toBe(1)
})

test('marks management-granting roles privileged, leaving owner-only roles plain', async () => {
	// `makeAdmin` grants every `:any` permission (incl. `read:user:any`), so its
	// role reads privileged; a bare reader holds no role at all.
	const admin = await makeAdmin()

	const { users } = await getUsersForAdmin({})
	const adminRow = users.find((u) => u.id === admin.id)
	expect(adminRow?.roles.some((r) => r.privileged)).toBe(true)
})

test('passes the deactivation marker through (null = active)', async () => {
	const active = await createUserAt(new Date('2026-01-01'))
	const suspended = await createUserAt(new Date('2026-01-02'), {
		deactivatedAt: new Date('2026-02-01'),
	})

	const { users } = await getUsersForAdmin({})
	const byId = new Map(users.map((u) => [u.id, u.deactivatedAt]))
	expect(byId.get(active.id)).toBeNull()
	expect(byId.get(suspended.id)).toBeInstanceOf(Date)
})

test('setUserRoles assigns then revokes a role, persisting each change', async () => {
	const user = await makeReader()
	const role = await createPlainRole()
	const actor = await actorFor(user)

	await setUserRoles({ userId: user.id, roleNames: [role.name], actor })
	expect(await roleNamesOf(user.id)).toEqual([role.name])

	await setUserRoles({ userId: user.id, roleNames: [], actor })
	expect(await roleNamesOf(user.id)).toEqual([])
})

test('setUserRoles ignores names that resolve to no existing role', async () => {
	// Resolve-to-existing only (not free-text create): a phantom name is dropped.
	const user = await makeReader()
	const actor = await actorFor(user)

	await setUserRoles({ userId: user.id, roleNames: ['ghost-role'], actor })
	expect(await roleNamesOf(user.id)).toEqual([])
})

test('the admin floor blocks revoking the last capable admin', async () => {
	const admin = await makeAdmin()
	const actor = await actorFor(admin)

	await expect(
		setUserRoles({ userId: admin.id, roleNames: [], actor }),
	).rejects.toBeInstanceOf(AdminFloorError)

	// The transaction rolled back — the admin keeps their role.
	expect(await roleNamesOf(admin.id)).toHaveLength(1)
})

test('a revoke is allowed while another capable admin remains', async () => {
	const first = await makeAdmin()
	const second = await makeAdmin()
	const actor = await actorFor(second)

	await setUserRoles({ userId: first.id, roleNames: [], actor })
	expect(await roleNamesOf(first.id)).toEqual([])
})

test('each grant and revoke writes a matching audit event', async () => {
	const user = await makeReader()
	const role = await createPlainRole()
	const actor = await actorFor(user)
	// The denormalized label is name → username → email; createUser sets a name.
	const target = await prisma.user.findUniqueOrThrow({
		where: { id: user.id },
		select: { name: true },
	})

	await setUserRoles({ userId: user.id, roleNames: [role.name], actor })
	await setUserRoles({ userId: user.id, roleNames: [], actor })

	const { events } = await getAuditEvents()
	const granted = events.find((e) => e.event === 'role.granted')
	const revoked = events.find((e) => e.event === 'role.revoked')

	expect(granted).toMatchObject({
		targetId: user.id,
		targetType: 'user',
		targetLabel: target.name,
		details: { role: role.name },
	})
	expect(revoked).toMatchObject({
		targetId: user.id,
		details: { role: role.name },
	})
})
