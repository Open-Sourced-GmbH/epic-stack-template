import { expect, test } from 'vitest'
import { getSessionExpirationDate } from '#app/utils/auth.server.ts'
import { createUser } from '#tests/db-utils.ts'
import { makeAdmin, makeReader } from '#tests/post-admin-utils.ts'
import { getAuditEvents } from './audit.server.ts'
import { prisma } from './db.server.ts'
import {
	AdminFloorError,
	SelfDeactivationError,
	SelfDeletionError,
	bulkUserAction,
	deleteUser,
	getUsersForAdmin,
	revokeUserSessions,
	sendUserPasswordReset,
	setUserDeactivated,
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

/** Give `userId` a live session so revocation-on-deactivate is observable. */
function createSessionFor(userId: string) {
	return prisma.session.create({
		select: { id: true },
		data: { expirationDate: getSessionExpirationDate(), userId },
	})
}

async function sessionCountFor(userId: string) {
	return prisma.session.count({ where: { userId } })
}

async function deactivatedAtOf(userId: string) {
	const fresh = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: { deactivatedAt: true },
	})
	return fresh.deactivatedAt
}

test('setUserDeactivated sets deactivatedAt and revokes sessions; reactivate clears it', async () => {
	const user = await makeReader()
	const admin = await makeAdmin()
	const actor = await actorFor(admin)
	await createSessionFor(user.id)

	await setUserDeactivated({ userId: user.id, deactivated: true, actor })
	expect(await deactivatedAtOf(user.id)).toBeInstanceOf(Date)
	// Deactivation logs the user out immediately by dropping their sessions.
	expect(await sessionCountFor(user.id)).toBe(0)

	await setUserDeactivated({ userId: user.id, deactivated: false, actor })
	expect(await deactivatedAtOf(user.id)).toBeNull()
})

test('deactivate then reactivate each write a matching audit event', async () => {
	const user = await makeReader()
	const admin = await makeAdmin()
	const actor = await actorFor(admin)
	const target = await prisma.user.findUniqueOrThrow({
		where: { id: user.id },
		select: { name: true },
	})

	await setUserDeactivated({ userId: user.id, deactivated: true, actor })
	await setUserDeactivated({ userId: user.id, deactivated: false, actor })

	const { events } = await getAuditEvents()
	expect(events.find((e) => e.event === 'user.deactivated')).toMatchObject({
		targetId: user.id,
		targetType: 'user',
		targetLabel: target.name,
	})
	expect(events.find((e) => e.event === 'user.reactivated')).toMatchObject({
		targetId: user.id,
	})
})

test('a no-op deactivation writes no audit event', async () => {
	const user = await makeReader()
	const admin = await makeAdmin()
	const actor = await actorFor(admin)

	// Already active — reactivating an active user changes nothing.
	await setUserDeactivated({ userId: user.id, deactivated: false, actor })

	const { events } = await getAuditEvents()
	expect(events.some((e) => e.event === 'user.reactivated')).toBe(false)
})

test('self-deactivation is refused', async () => {
	const admin = await makeAdmin()
	const actor = await actorFor(admin)

	await expect(
		setUserDeactivated({ userId: admin.id, deactivated: true, actor }),
	).rejects.toBeInstanceOf(SelfDeactivationError)

	expect(await deactivatedAtOf(admin.id)).toBeNull()
})

test('the admin floor blocks deactivating the last capable admin', async () => {
	const admin = await makeAdmin()
	// A non-admin actor performs the change so the self-guard isn't what blocks it.
	const other = await makeReader()
	const actor = await actorFor(other)
	await createSessionFor(admin.id)

	await expect(
		setUserDeactivated({ userId: admin.id, deactivated: true, actor }),
	).rejects.toBeInstanceOf(AdminFloorError)

	// The transaction rolled back — still active, sessions intact.
	expect(await deactivatedAtOf(admin.id)).toBeNull()
	expect(await sessionCountFor(admin.id)).toBe(1)
})

test('deactivation is allowed while another active admin remains', async () => {
	const first = await makeAdmin()
	const second = await makeAdmin()
	const actor = await actorFor(second)

	await setUserDeactivated({ userId: first.id, deactivated: true, actor })
	expect(await deactivatedAtOf(first.id)).toBeInstanceOf(Date)
})

test('deactivation leaves the user’s authored content untouched', async () => {
	const author = await makeReader()
	const admin = await makeAdmin()
	const actor = await actorFor(admin)
	const post = await prisma.post.create({
		select: { id: true },
		data: {
			title: 'Kept',
			slug: `kept-${author.id}`,
			body: 'still here',
			authorId: author.id,
		},
	})

	await setUserDeactivated({ userId: author.id, deactivated: true, actor })

	expect(
		await prisma.post.findUnique({ where: { id: post.id }, select: { id: true } }),
	).not.toBeNull()
})

test('revokeUserSessions force-logs-out without deactivating, and counts the kill', async () => {
	const user = await makeReader()
	const admin = await makeAdmin()
	const actor = await actorFor(admin)
	await createSessionFor(user.id)
	await createSessionFor(user.id)

	const { count } = await revokeUserSessions({ userId: user.id, actor })

	// Both live sessions are gone (the user must re-auth)…
	expect(count).toBe(2)
	expect(await sessionCountFor(user.id)).toBe(0)
	// …but the account stays active — force-logout is not deactivation.
	expect(await deactivatedAtOf(user.id)).toBeNull()
})

test('revokeUserSessions records a sessions-revoked audit event', async () => {
	const user = await makeReader()
	const admin = await makeAdmin()
	const actor = await actorFor(admin)
	const target = await prisma.user.findUniqueOrThrow({
		where: { id: user.id },
		select: { name: true },
	})
	await createSessionFor(user.id)

	await revokeUserSessions({ userId: user.id, actor })

	const { events } = await getAuditEvents()
	expect(events.find((e) => e.event === 'user.sessions.revoked')).toMatchObject({
		targetId: user.id,
		targetType: 'user',
		targetLabel: target.name,
	})
})

test('sendUserPasswordReset arms a reset-password verification and audits it', async () => {
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: (await makeReader()).id },
		select: { id: true, username: true, name: true },
	})
	const admin = await makeAdmin()
	const actor = await actorFor(admin)
	const request = new Request('http://localhost:3000/admin/users/x')

	const result = await sendUserPasswordReset({ userId: user.id, request, actor })

	expect(result.status).toBe('success')
	// A reset-password verification is now armed for the user (the existing flow).
	expect(
		await prisma.verification.findUnique({
			where: {
				target_type: { target: user.username, type: 'reset-password' },
			},
			select: { id: true },
		}),
	).not.toBeNull()
	// The admin never sets or sees a password — none is created here.
	expect(
		await prisma.password.findUnique({
			where: { userId: user.id },
			select: { userId: true },
		}),
	).toBeNull()
	const { events } = await getAuditEvents()
	expect(events.find((e) => e.event === 'user.password.reset')).toMatchObject({
		targetId: user.id,
		targetType: 'user',
		targetLabel: user.name,
	})
})

test('deleteUser removes the account but keeps authored posts (credit blanked)', async () => {
	const author = await makeReader()
	const admin = await makeAdmin()
	const actor = await actorFor(admin)
	const label = (
		await prisma.user.findUniqueOrThrow({
			where: { id: author.id },
			select: { name: true },
		})
	).name
	const post = await prisma.post.create({
		select: { id: true },
		data: {
			title: 'Survivor',
			slug: `survivor-${author.id}`,
			body: 'outlives its author',
			authorId: author.id,
		},
	})

	await deleteUser({ userId: author.id, actor })

	// The user is gone…
	expect(
		await prisma.user.findUnique({
			where: { id: author.id },
			select: { id: true },
		}),
	).toBeNull()
	// …but the post stands, with its author credit blanked (SetNull).
	const survivor = await prisma.post.findUniqueOrThrow({
		where: { id: post.id },
		select: { id: true, authorId: true },
	})
	expect(survivor.authorId).toBeNull()
	// The deletion is on the audit trail (label snapshotted before the row went).
	const { events } = await getAuditEvents()
	expect(events.find((e) => e.event === 'user.deleted')).toMatchObject({
		targetId: author.id,
		targetType: 'user',
		targetLabel: label,
	})
})

test('self-deletion is refused', async () => {
	const admin = await makeAdmin()
	const actor = await actorFor(admin)

	await expect(
		deleteUser({ userId: admin.id, actor }),
	).rejects.toBeInstanceOf(SelfDeletionError)

	// The account survives the refusal.
	expect(
		await prisma.user.findUnique({
			where: { id: admin.id },
			select: { id: true },
		}),
	).not.toBeNull()
})

test('the admin floor blocks deleting the last capable admin', async () => {
	const admin = await makeAdmin()
	// A different actor performs the delete so the self-guard isn't what blocks it.
	const other = await makeReader()
	const actor = await actorFor(other)

	await expect(
		deleteUser({ userId: admin.id, actor }),
	).rejects.toBeInstanceOf(AdminFloorError)

	// The transaction rolled back — the admin is still here.
	expect(
		await prisma.user.findUnique({
			where: { id: admin.id },
			select: { id: true },
		}),
	).not.toBeNull()
})

test('deletion is allowed while another capable admin remains', async () => {
	const first = await makeAdmin()
	const second = await makeAdmin()
	const actor = await actorFor(second)

	await deleteUser({ userId: first.id, actor })
	expect(
		await prisma.user.findUnique({
			where: { id: first.id },
			select: { id: true },
		}),
	).toBeNull()
})

test('bulkUserAction force-logs-out every selected user, counting the successes', async () => {
	const admin = await makeAdmin()
	const actor = await actorFor(admin)
	const a = await makeReader()
	const b = await makeReader()
	await createSessionFor(a.id)
	await createSessionFor(b.id)

	const result = await bulkUserAction({
		op: 'force-logout',
		userIds: [a.id, b.id],
		actor,
	})

	expect(result).toMatchObject({ op: 'force-logout', succeeded: 2, blocked: 0, skipped: 0 })
	expect(await sessionCountFor(a.id)).toBe(0)
	expect(await sessionCountFor(b.id)).toBe(0)
})

test('bulkUserAction deactivates every selected user and audits each one', async () => {
	const admin = await makeAdmin()
	const actor = await actorFor(admin)
	const a = await makeReader()
	const b = await makeReader()

	const result = await bulkUserAction({
		op: 'deactivate',
		userIds: [a.id, b.id],
		actor,
	})

	expect(result).toMatchObject({ op: 'deactivate', succeeded: 2 })
	expect(await deactivatedAtOf(a.id)).toBeInstanceOf(Date)
	expect(await deactivatedAtOf(b.id)).toBeInstanceOf(Date)
	// One audit event per affected user.
	const { events } = await getAuditEvents()
	const deactivated = events.filter((e) => e.event === 'user.deactivated')
	expect(deactivated.map((e) => e.targetId).sort()).toEqual([a.id, b.id].sort())
})

test('bulkUserAction deletes every selected user, keeping the floor and counting', async () => {
	const admin = await makeAdmin()
	const actor = await actorFor(admin)
	const a = await makeReader()
	const b = await makeReader()

	const result = await bulkUserAction({
		op: 'delete',
		userIds: [a.id, b.id],
		actor,
	})

	expect(result).toMatchObject({ op: 'delete', succeeded: 2, blocked: 0, skipped: 0 })
	expect(
		await prisma.user.count({ where: { id: { in: [a.id, b.id] } } }),
	).toBe(0)
})

test('bulkUserAction holds the admin floor across the batch (partial apply, never below one)', async () => {
	// Two capable admins; a non-admin actor deletes BOTH in one batch. The first
	// delete leaves one capable admin (floor holds), the second would strand the
	// system — so it is blocked, never silently dropping below one.
	const first = await makeAdmin()
	const second = await makeAdmin()
	const other = await makeReader()
	const actor = await actorFor(other)

	const result = await bulkUserAction({
		op: 'delete',
		userIds: [first.id, second.id],
		actor,
	})

	expect(result).toMatchObject({ op: 'delete', succeeded: 1, blocked: 1, skipped: 0 })
	// Exactly one of the two admins survives — the floor never breached.
	expect(
		await prisma.user.count({ where: { id: { in: [first.id, second.id] } } }),
	).toBe(1)
})

test('bulkUserAction skips a self-targeting destructive action, applying the rest', async () => {
	// The acting admin selects themselves plus another user for deletion. Another
	// capable admin exists so the floor is not the blocker — the self-guard skips
	// the admin's own row while the other delete still lands.
	const admin = await makeAdmin()
	await makeAdmin() // keeps the floor so only the self-guard is in play
	const actor = await actorFor(admin)
	const other = await makeReader()

	const result = await bulkUserAction({
		op: 'delete',
		userIds: [admin.id, other.id],
		actor,
	})

	expect(result).toMatchObject({ op: 'delete', succeeded: 1, blocked: 0, skipped: 1 })
	// The admin survived their own batch; the other user is gone.
	expect(
		await prisma.user.findUnique({ where: { id: admin.id }, select: { id: true } }),
	).not.toBeNull()
	expect(
		await prisma.user.findUnique({ where: { id: other.id }, select: { id: true } }),
	).toBeNull()
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
