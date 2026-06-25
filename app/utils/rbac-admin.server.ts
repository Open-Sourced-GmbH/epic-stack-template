import { invariantResponse } from '@epic-web/invariant'
import { adminFloorHolds, requiredAdminCapabilities } from './admin-floor.ts'
import {
	type AuditActor,
	recordAuditEvent,
} from './audit.server.ts'
import { prisma } from './db.server.ts'
import { AdminFloorError } from './user-admin.server.ts'
import { getPermissionMatrix } from './user.ts'

/**
 * One row of the admin roles list (`/admin/roles`) — the clean DTO the route
 * renders: the role's identity, whether it is a protected built-in (`system`),
 * and how many users hold it.
 */
export type AdminRole = {
	id: string
	name: string
	description: string
	/** A built-in role (`user`/`admin`) — view-only, never renamed or deleted. */
	system: boolean
	/** How many users currently hold this role. */
	userCount: number
}

/**
 * Every role for the admin roles list, system roles first (the protected
 * built-ins sit at the top) then custom roles alphabetically, each carrying its
 * member count. Read-only — role mutations live in the role editor (ADR-069).
 */
export async function listRoles(): Promise<AdminRole[]> {
	const rows = await prisma.role.findMany({
		orderBy: [{ system: 'desc' }, { name: 'asc' }],
		select: {
			id: true,
			name: true,
			description: true,
			system: true,
			_count: { select: { users: true } },
		},
	})
	return rows.map((role) => ({
		id: role.id,
		name: role.name,
		description: role.description,
		system: role.system,
		userCount: role._count.users,
	}))
}

/**
 * Thrown when a mutation targets a protected built-in role (`user`/`admin`). The
 * system roles are registry-governed (ADR-069): renaming or deleting one is never
 * allowed through the editor, so the data layer refuses it as the backstop behind
 * the UI hiding those affordances. Grants on a system role stay editable — only
 * its identity is locked.
 */
export class SystemRoleError extends Error {
	constructor(message = 'System roles can’t be renamed or deleted.') {
		super(message)
		this.name = 'SystemRoleError'
	}
}

/**
 * Thrown when a create/rename would collide with an existing role name (`Role.name`
 * is unique). The route catches this and surfaces it as a `name` field error rather
 * than letting the raw Prisma unique-constraint violation become a 500.
 */
export class DuplicateRoleNameError extends Error {
	constructor(message = 'A role with this name already exists.') {
		super(message)
		this.name = 'DuplicateRoleNameError'
	}
}

/** A single grant the matrix toggles: an `action`/`entity`/`access` triple. */
type Grant = { action: string; entity: string; access: string }

/** The canonical `action:entity:access` key for a grant. */
function grantKey(grant: Grant): string {
	return `${grant.action}:${grant.entity}:${grant.access}`
}

/** The full permission catalog, indexed by `action:entity:access` key. */
const GRANT_CATALOG = new Map(
	getPermissionMatrix().map((grant) => [grantKey(grant), grant]),
)

/**
 * Reduce a submitted grant-string list to the valid, de-duplicated set: every
 * string must name a real catalog entry (`action:entity:access`), so a junk or
 * out-of-catalog token is dropped rather than trusted. This is the one gate that
 * keeps the editor from writing a permission the RBAC vocabulary doesn't define.
 */
export function normalizeGrants(grantStrings: string[]): Grant[] {
	const seen = new Set<string>()
	const grants: Grant[] = []
	for (const key of grantStrings) {
		const grant = GRANT_CATALOG.get(key)
		if (!grant || seen.has(key)) continue
		seen.add(key)
		grants.push(grant)
	}
	return grants
}

/** True when a grant counts toward an admin-floor capability (`*:user:any` etc.). */
function isFloorCritical(grant: { entity: string; access: string }): boolean {
	return (
		grant.access === 'any' &&
		(requiredAdminCapabilities as readonly string[]).includes(grant.entity)
	)
}

/** A user as the floor reads them — each role reduced to its permissions. */
type FloorRoleUser = {
	roles: Array<{ id: string; permissions: Array<{ entity: string; access: string }> }>
}

/** The active users (a deactivated admin can't hold the floor), with role perms. */
function loadActiveFloorUsers(
	tx: Pick<typeof prisma, 'user'>,
): Promise<FloorRoleUser[]> {
	return tx.user.findMany({
		where: { deactivatedAt: null },
		select: {
			roles: {
				select: {
					id: true,
					permissions: { select: { entity: true, access: true } },
				},
			},
		},
	})
}

/**
 * The world the floor core reads, optionally simulating one role's permission
 * change: with no `change`, each user's current roles pass through untouched (the
 * "before" world); with a `change`, every holder of `change.roleId` sees its grants
 * swapped for `change.permissions`, or the role dropped entirely when those are
 * `null` (a delete). The floor core then reports whether a capable admin survives.
 */
function floorWorld(
	users: FloorRoleUser[],
	change?: {
		roleId: string
		permissions: Array<{ entity: string; access: string }> | null
	},
) {
	return users.map((user) => ({
		roles: user.roles.flatMap((role) => {
			if (!change || role.id !== change.roleId) {
				return [{ permissions: role.permissions }]
			}
			if (change.permissions === null) return []
			return [{ permissions: change.permissions }]
		}),
	}))
}

/** Is this a Prisma unique-constraint violation (duplicate `Role.name`)? */
function isUniqueViolation(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as { code?: unknown }).code === 'P2002'
	)
}

/**
 * Create a custom role (always `system: false`, ADR-069) with an initial grant set,
 * recording a `role.created` Audit Event (ADR-070). A new role can only *add* a
 * capable admin, so it never breaches the admin floor — no assert needed. A
 * name collision throws {@link DuplicateRoleNameError} for the route to surface as a
 * field error.
 */
export async function createRole({
	name,
	description = '',
	grants = [],
	actor,
}: {
	name: string
	description?: string
	grants?: string[]
	actor: AuditActor
}): Promise<{ id: string }> {
	const next = normalizeGrants(grants)
	let role: { id: string; name: string }
	try {
		role = await prisma.role.create({
			select: { id: true, name: true },
			data: {
				name,
				description,
				system: false,
				permissions: {
					connectOrCreate: next.map((grant) => ({
						where: { action_entity_access: grant },
						create: grant,
					})),
				},
			},
		})
	} catch (error) {
		if (isUniqueViolation(error)) throw new DuplicateRoleNameError()
		throw error
	}

	await recordAuditEvent({
		event: 'role.created',
		actor,
		target: { id: role.id, type: 'role', label: role.name },
		details: { grants: next.map(grantKey) },
	})
	return { id: role.id }
}

/**
 * Rename / re-describe a custom role, recording a `role.updated` Audit Event when
 * something actually changed (a no-op writes nothing). Refuses a system role with
 * {@link SystemRoleError} and a name collision with {@link DuplicateRoleNameError}.
 * Renaming can't change any user's capability, so the admin floor is untouched.
 */
export async function renameRole({
	roleId,
	name,
	description = '',
	actor,
}: {
	roleId: string
	name: string
	description?: string
	actor: AuditActor
}): Promise<{ changed: boolean }> {
	const role = await prisma.role.findUnique({
		where: { id: roleId },
		select: { id: true, name: true, description: true, system: true },
	})
	invariantResponse(role, 'Role not found', { status: 404 })
	if (role.system) throw new SystemRoleError()

	if (role.name === name && role.description === description) {
		return { changed: false }
	}

	try {
		await prisma.role.update({
			where: { id: roleId },
			data: { name, description },
		})
	} catch (error) {
		if (isUniqueViolation(error)) throw new DuplicateRoleNameError()
		throw error
	}

	await recordAuditEvent({
		event: 'role.updated',
		actor,
		target: { id: role.id, type: 'role', label: name },
		details: { from: role.name, to: name },
	})
	return { changed: true }
}

/**
 * Delete a custom role, recording a `role.deleted` Audit Event (ADR-070). Refuses a
 * system role with {@link SystemRoleError}. Guarded by the admin-floor invariant
 * (ADR-069): the assert runs inside the transaction over the *post-delete* world
 * (the role gone from every holder), so deleting the role that carries the last
 * capable admin's grants throws {@link AdminFloorError} and rolls back.
 */
export async function deleteRole({
	roleId,
	actor,
}: {
	roleId: string
	actor: AuditActor
}): Promise<void> {
	const { role } = await prisma.$transaction(async (tx) => {
		const role = await tx.role.findUnique({
			where: { id: roleId },
			select: { id: true, name: true, system: true },
		})
		invariantResponse(role, 'Role not found', { status: 404 })
		if (role.system) throw new SystemRoleError()

		const users = await loadActiveFloorUsers(tx)
		const heldBefore = adminFloorHolds(floorWorld(users))
		const holdsAfter = adminFloorHolds(
			floorWorld(users, { roleId, permissions: null }),
		)
		if (heldBefore && !holdsAfter) throw new AdminFloorError()

		await tx.role.delete({ where: { id: roleId } })
		return { role }
	})

	await recordAuditEvent({
		event: 'role.deleted',
		actor,
		target: { id: role.id, type: 'role', label: role.name },
	})
}

/**
 * Set a role's permissions to exactly `grants` (the grant matrix's save), recording
 * a `role.permissions.changed` Audit Event with the applied delta. Grants editable
 * on *any* role including system ones (only a system role's identity is locked).
 *
 * Guarded by the admin-floor invariant (ADR-069): the assert runs inside the same
 * transaction over the *post-change* world — every holder of this role sees the new
 * grant set — so stripping a grant that would remove the last capable admin throws
 * {@link AdminFloorError} and rolls back. A no-op (set equals current) skips the
 * write, the floor check, and the audit.
 */
export async function setRoleGrants({
	roleId,
	grants,
	actor,
}: {
	roleId: string
	grants: string[]
	actor: AuditActor
}): Promise<{ added: string[]; removed: string[] }> {
	const next = normalizeGrants(grants)

	const { role, added, removed } = await prisma.$transaction(async (tx) => {
		const role = await tx.role.findUnique({
			where: { id: roleId },
			select: {
				id: true,
				name: true,
				permissions: { select: { action: true, entity: true, access: true } },
			},
		})
		invariantResponse(role, 'Role not found', { status: 404 })

		const currentKeys = new Set(role.permissions.map(grantKey))
		const nextKeys = new Set(next.map(grantKey))
		const added = [...nextKeys].filter((key) => !currentKeys.has(key))
		const removed = [...currentKeys].filter((key) => !nextKeys.has(key))

		// Nothing changed — skip the write, the floor check, and the audit.
		if (added.length === 0 && removed.length === 0) {
			return { role, added, removed }
		}

		// Assert the floor only when *this change* would breach it (held before, not
		// after). Build both worlds from the active users, swapping this role's grants.
		const users = await loadActiveFloorUsers(tx)
		const heldBefore = adminFloorHolds(floorWorld(users))
		const holdsAfter = adminFloorHolds(
			floorWorld(users, {
				roleId,
				permissions: next.map(({ entity, access }) => ({ entity, access })),
			}),
		)
		if (heldBefore && !holdsAfter) throw new AdminFloorError()

		// Replace the grant set: clear, then connectOrCreate the target permissions
		// (creating any catalog row not yet present, so a fresh DB resolves cleanly).
		await tx.role.update({
			where: { id: roleId },
			data: { permissions: { set: [] } },
		})
		await tx.role.update({
			where: { id: roleId },
			data: {
				permissions: {
					connectOrCreate: next.map((grant) => ({
						where: { action_entity_access: grant },
						create: grant,
					})),
				},
			},
		})

		return { role, added, removed }
	})

	if (added.length > 0 || removed.length > 0) {
		await recordAuditEvent({
			event: 'role.permissions.changed',
			actor,
			target: { id: role.id, type: 'role', label: role.name },
			details: { added, removed },
		})
	}

	return { added, removed }
}

/**
 * The role as the editor (`/admin/roles/$id`) reads it: identity + member count,
 * the current grant set as `action:entity:access` keys, and the **locked grants** —
 * the floor-critical grants whose removal *alone* would breach the admin floor
 * (ADR-069), which the matrix renders as locked-on chips. `null` when no such role
 * exists. The data layer's `setRoleGrants` assert is the authoritative backstop;
 * these locks just pre-empt the obvious single-chip breach in the UI.
 */
export async function getRoleForEditor(roleId: string): Promise<{
	id: string
	name: string
	description: string
	system: boolean
	userCount: number
	grants: string[]
	lockedGrants: string[]
} | null> {
	const role = await prisma.role.findUnique({
		where: { id: roleId },
		select: {
			id: true,
			name: true,
			description: true,
			system: true,
			permissions: { select: { action: true, entity: true, access: true } },
			_count: { select: { users: true } },
		},
	})
	if (!role) return null

	const users = await loadActiveFloorUsers(prisma)
	const heldBefore = adminFloorHolds(floorWorld(users))

	// A grant is "locked" when the floor holds now but wouldn't if this one grant
	// were stripped from the role — i.e. it's load-bearing for the last capable admin.
	const lockedGrants: string[] = []
	if (heldBefore) {
		for (const grant of role.permissions) {
			if (!isFloorCritical(grant)) continue
			const remaining = role.permissions
				.filter((p) => grantKey(p) !== grantKey(grant))
				.map(({ entity, access }) => ({ entity, access }))
			const holdsAfter = adminFloorHolds(
				floorWorld(users, { roleId: role.id, permissions: remaining }),
			)
			if (!holdsAfter) lockedGrants.push(grantKey(grant))
		}
	}

	return {
		id: role.id,
		name: role.name,
		description: role.description,
		system: role.system,
		userCount: role._count.users,
		grants: role.permissions.map(grantKey),
		lockedGrants,
	}
}
