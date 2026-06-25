import { prisma } from './db.server.ts'
import { getPermissionMatrix, roleGrantedAccess, roleNames } from './user.ts'

/**
 * Reconcile the RBAC permission catalog and the built-in roles from the
 * vocabulary registry (`app/utils/user.ts`). Idempotent — safe to re-run on every
 * seed — with two deliberately different ownership rules (ADR-069):
 *
 * - The **permission catalog** is registry-owned: every `{action, entity, access}`
 *   in `getPermissionMatrix()` is upserted, so new vocabulary (e.g. the `role`
 *   entity) appears on each seed without a migration.
 * - The **system roles** (`user`/`admin`) are also registry-governed: their grants
 *   are reconciled to the registry every seed, so admin gains a new entity's
 *   `:any` permission the moment it joins the vocabulary. This is load-bearing —
 *   the admin-floor (ADR-069) needs a user holding `role:any`, and these roles are
 *   **view-only** in the UI, so reconciling them clobbers no user edit.
 *
 * Crucially, the seed only ever touches the roles named in `roleNames`. **Custom
 * roles** created through the UI are never referenced here, so their grants are
 * DB-owned and survive every re-seed untouched — that is what makes editable-role
 * grants durable.
 *
 * The seed script (`prisma/seed.ts`) and its test both call this single seam.
 */
export async function reconcileRbac() {
	// Catalog: reconcile every registry permission (registry-owned).
	for (const permission of getPermissionMatrix()) {
		await prisma.permission.upsert({
			where: {
				action_entity_access: {
					action: permission.action,
					entity: permission.entity,
					access: permission.access,
				},
			},
			create: permission,
			update: {},
		})
	}

	// System roles: reconcile their grants to the registry and stamp `system` so
	// they read as protected/built-in. Custom roles are left entirely alone.
	for (const name of roleNames) {
		const permissions = await prisma.permission.findMany({
			select: { id: true },
			where: { access: roleGrantedAccess[name] },
		})
		await prisma.role.upsert({
			where: { name },
			create: { name, system: true, permissions: { connect: permissions } },
			update: { system: true, permissions: { set: permissions } },
		})
	}
}
