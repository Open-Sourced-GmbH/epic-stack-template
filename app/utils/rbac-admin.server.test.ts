import { expect, test } from 'vitest'
import { prisma } from '#app/utils/db.server.ts'
import { createUser } from '#tests/db-utils.ts'
import {
	createRole,
	deleteRole,
	DuplicateRoleNameError,
	getRoleForEditor,
	listRoles,
	normalizeGrants,
	renameRole,
	setRoleGrants,
	SystemRoleError,
} from './rbac-admin.server.ts'
import { AdminFloorError } from './user-admin.server.ts'

// The migrated test DB already carries the built-in `user`/`admin` system roles
// (seeded by the init migration), so these tests add *custom* roles around them.

test('listRoles returns each role with its user count and system flag', async () => {
	await prisma.role.create({
		data: {
			name: 'reviewer',
			description: 'Curates the blog',
			system: false,
			users: { create: [createUser(), createUser()] },
		},
	})

	const byName = Object.fromEntries((await listRoles()).map((r) => [r.name, r]))
	// The custom role reads its own count + metadata…
	expect(byName.reviewer?.system).toBe(false)
	expect(byName.reviewer?.userCount).toBe(2)
	expect(byName.reviewer?.description).toBe('Curates the blog')
	// …and the built-ins read as protected system roles.
	expect(byName.admin?.system).toBe(true)
	expect(byName.user?.system).toBe(true)
})

test('listRoles orders system roles before custom roles, then by name', async () => {
	await prisma.role.create({ data: { name: 'zeta', system: false } })
	await prisma.role.create({ data: { name: 'alpha', system: false } })

	// System roles lead (the protected built-ins, alphabetically), then custom
	// roles alphabetically.
	expect((await listRoles()).map((r) => r.name)).toEqual([
		'admin',
		'user',
		'alpha',
		'zeta',
	])
})

/** A signed-in-shaped user record, usable as an `AuditActor`. */
function makeActor() {
	return prisma.user.create({
		select: { id: true, email: true, username: true, name: true },
		data: createUser(),
	})
}

/** Connect-or-create the catalog `Permission` rows for the given grant keys. */
function grantConnect(keys: string[]) {
	return keys.map((key) => {
		const [action, entity, access] = key.split(':') as [string, string, string]
		const where = { action_entity_access: { action, entity, access } }
		return { where, create: { action, entity, access } }
	})
}

let floorCounter = 0

/**
 * The world's *only* capable admin: one active user holding a role that grants
 * both admin-floor capabilities (`user:any` + `role:any`). Stripping either grant
 * — or deleting the role — must breach the floor.
 */
async function soleCapableAdmin() {
	const role = await prisma.role.create({
		select: { id: true },
		data: {
			name: `floor-admin-${floorCounter++}`,
			permissions: {
				connectOrCreate: grantConnect(['read:user:any', 'read:role:any']),
			},
		},
	})
	const user = await prisma.user.create({
		select: { id: true, email: true, username: true, name: true },
		data: { ...createUser(), roles: { connect: { id: role.id } } },
	})
	return { user, roleId: role.id }
}

async function grantKeysOf(roleId: string) {
	const role = await prisma.role.findUniqueOrThrow({
		where: { id: roleId },
		select: { permissions: { select: { action: true, entity: true, access: true } } },
	})
	return role.permissions
		.map((p) => `${p.action}:${p.entity}:${p.access}`)
		.sort()
}

test('normalizeGrants keeps only valid catalog grants, de-duplicated', () => {
	const grants = normalizeGrants([
		'read:user:any',
		'read:user:any', // duplicate — collapsed
		'nonsense',
		'delete:post:own', // not in catalog (post is never owner-scoped)
	])
	expect(grants.map((g) => `${g.action}:${g.entity}:${g.access}`)).toEqual([
		'read:user:any',
	])
})

test('createRole creates a custom role with grants and records an audit event', async () => {
	const actor = await makeActor()

	const { id } = await createRole({
		name: 'editors',
		description: 'Can edit posts',
		grants: ['read:user:any', 'update:post:any', 'bogus:grant:any'],
		actor,
	})

	const role = await prisma.role.findUniqueOrThrow({
		where: { id },
		select: { name: true, description: true, system: true },
	})
	expect(role.system).toBe(false)
	expect(role.description).toBe('Can edit posts')
	// The bogus grant is dropped; the two real ones persist.
	expect(await grantKeysOf(id)).toEqual(['read:user:any', 'update:post:any'])

	const events = await prisma.auditEvent.findMany({
		where: { event: 'role.created' },
	})
	expect(events.some((e) => e.targetId === id)).toBe(true)
})

test('createRole rejects a duplicate name', async () => {
	const actor = await makeActor()
	await createRole({ name: 'support', actor })

	await expect(createRole({ name: 'support', actor })).rejects.toBeInstanceOf(
		DuplicateRoleNameError,
	)
})

test('renameRole updates a custom role and audits once; a no-op writes nothing', async () => {
	const actor = await makeActor()
	const { id } = await createRole({ name: 'old-name', actor })

	const first = await renameRole({
		roleId: id,
		name: 'new-name',
		description: 'A description',
		actor,
	})
	expect(first.changed).toBe(true)

	const second = await renameRole({
		roleId: id,
		name: 'new-name',
		description: 'A description',
		actor,
	})
	expect(second.changed).toBe(false)

	const role = await prisma.role.findUniqueOrThrow({
		where: { id },
		select: { name: true, description: true },
	})
	expect(role).toEqual({ name: 'new-name', description: 'A description' })

	const events = await prisma.auditEvent.findMany({
		where: { event: 'role.updated' },
	})
	expect(events.filter((e) => e.targetId === id)).toHaveLength(1)
})

test('renameRole and deleteRole refuse a protected system role', async () => {
	const actor = await makeActor()
	const adminRole = await prisma.role.findUniqueOrThrow({
		where: { name: 'admin' },
		select: { id: true },
	})

	await expect(
		renameRole({ roleId: adminRole.id, name: 'superuser', actor }),
	).rejects.toBeInstanceOf(SystemRoleError)
	await expect(
		deleteRole({ roleId: adminRole.id, actor }),
	).rejects.toBeInstanceOf(SystemRoleError)
})

test('deleteRole removes a custom role and records an audit event', async () => {
	const actor = await makeActor()
	const { id } = await createRole({ name: 'temporary', actor })

	await deleteRole({ roleId: id, actor })

	expect(
		await prisma.role.findUnique({ where: { id }, select: { id: true } }),
	).toBeNull()
	const events = await prisma.auditEvent.findMany({
		where: { event: 'role.deleted' },
	})
	expect(events.some((e) => e.targetId === id)).toBe(true)
})

test('setRoleGrants replaces the grant set and audits the delta', async () => {
	const actor = await makeActor()
	const { id } = await createRole({
		name: 'graded',
		grants: ['read:user:any'],
		actor,
	})

	const result = await setRoleGrants({
		roleId: id,
		grants: ['read:user:any', 'update:post:any'],
		actor,
	})
	expect(result.added).toEqual(['update:post:any'])
	expect(result.removed).toEqual([])
	expect(await grantKeysOf(id)).toEqual(['read:user:any', 'update:post:any'])

	const events = await prisma.auditEvent.findMany({
		where: { event: 'role.permissions.changed' },
	})
	expect(events.some((e) => e.targetId === id)).toBe(true)
})

test('setRoleGrants edits a system role’s grants (identity locked, grants open)', async () => {
	const actor = await makeActor()
	const adminRole = await prisma.role.findUniqueOrThrow({
		where: { name: 'admin' },
		select: { id: true },
	})

	// No SystemRoleError — grants stay editable on a system role.
	const result = await setRoleGrants({
		roleId: adminRole.id,
		grants: ['read:post:any'],
		actor,
	})
	expect(result.added).toContain('read:post:any')
})

test('setRoleGrants refuses to strip a grant that breaches the admin floor', async () => {
	const { user, roleId } = await soleCapableAdmin()

	// Dropping `role:any` leaves no capable admin — refused, rolled back.
	await expect(
		setRoleGrants({ roleId, grants: ['read:user:any'], actor: user }),
	).rejects.toBeInstanceOf(AdminFloorError)
	expect(await grantKeysOf(roleId)).toEqual(['read:role:any', 'read:user:any'])
})

test('deleteRole refuses to delete the last capable admin’s role', async () => {
	const { user, roleId } = await soleCapableAdmin()

	await expect(deleteRole({ roleId, actor: user })).rejects.toBeInstanceOf(
		AdminFloorError,
	)
	expect(
		await prisma.role.findUnique({ where: { id: roleId }, select: { id: true } }),
	).not.toBeNull()
})

test('getRoleForEditor locks the floor-critical grants of the last capable admin', async () => {
	const { roleId } = await soleCapableAdmin()

	const editor = await getRoleForEditor(roleId)
	expect(editor).not.toBeNull()
	expect(editor?.grants.sort()).toEqual(['read:role:any', 'read:user:any'])
	// Both grants are load-bearing: removing either alone strands the floor.
	expect(editor?.lockedGrants.sort()).toEqual(['read:role:any', 'read:user:any'])
})

test('getRoleForEditor locks nothing for a non-floor custom role', async () => {
	const actor = await makeActor()
	const { id } = await createRole({
		name: 'writers',
		grants: ['update:post:any'],
		actor,
	})

	const editor = await getRoleForEditor(id)
	expect(editor?.lockedGrants).toEqual([])
})
