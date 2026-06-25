import { permissionEntities } from './user.ts'

/**
 * The admin-floor invariant, as a pure decision core (ADR-069). The system must
 * always keep **at least one capable admin**: a user who can administer both
 * other users *and* roles. Any mutation that would drop below one such user
 * (revoking a role, stripping a grant, deleting or deactivating the account) is
 * blocked by the data layer.
 *
 * This module is the side-effect-free heart of that rule — counts and capability
 * checks over plain permission data, no Prisma — so it unit-tests cleanly and the
 * server (`user-admin.server`) wraps it in a transactional assert over the
 * post-change world.
 */

/**
 * The entities a capable admin must hold `:any` on. Stated as the full ADR-069
 * set (manage users *and* roles), but intersected with the live permission
 * catalog: the `role` entity arrives with role management (EPT-89), so today the
 * floor turns on `user:any` alone and gains the `role:any` half automatically the
 * moment `role` becomes a catalog entity — no change here required.
 */
const ADMIN_FLOOR_ENTITIES = ['user', 'role'] as const

export const requiredAdminCapabilities: string[] = ADMIN_FLOOR_ENTITIES.filter(
	(entity) => (permissionEntities as readonly string[]).includes(entity),
)

/** A single granted permission, reduced to the two columns the floor reads. */
type Capability = { entity: string; access: string }

/** A role as the core reads it — just the permissions it grants. */
type RoleCapabilities = { permissions: Capability[] }

/**
 * Is this user a capable admin? True when the union of their roles' permissions
 * grants `:any` on **every** required capability — so a user who holds
 * `user:any` from one role and `role:any` from another still qualifies (capability
 * split across roles). An empty `required` set (no floor capabilities exist yet)
 * makes everyone trivially capable, which never happens in practice.
 */
export function isCapableAdmin(
	roles: ReadonlyArray<RoleCapabilities>,
	required: ReadonlyArray<string> = requiredAdminCapabilities,
): boolean {
	return required.every((entity) =>
		roles.some((role) =>
			role.permissions.some((p) => p.entity === entity && p.access === 'any'),
		),
	)
}

/**
 * Does the admin floor still hold across this (post-change) set of users? The
 * caller builds the world *after* the proposed change — the target's grants
 * already swapped for what they would become — and this reports whether at least
 * one capable admin survives.
 */
export function adminFloorHolds(
	users: ReadonlyArray<{ roles: ReadonlyArray<RoleCapabilities> }>,
	required: ReadonlyArray<string> = requiredAdminCapabilities,
): boolean {
	return users.some((user) => isCapableAdmin(user.roles, required))
}
