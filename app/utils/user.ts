import { useRouteLoaderData } from 'react-router'
import { type loader as rootLoader } from '#app/root.tsx'

function isUser(
	user: any,
): user is Awaited<ReturnType<typeof rootLoader>>['data']['user'] {
	return user && typeof user === 'object' && typeof user.id === 'string'
}

export function useOptionalUser() {
	const data = useRouteLoaderData<typeof rootLoader>('root')
	if (!data || !isUser(data.user)) {
		return undefined
	}
	return data.user
}

export function useUser() {
	const maybeUser = useOptionalUser()
	if (!maybeUser) {
		throw new Error(
			'No user found in root loader, but user is required by useUser. If user is optional, try useOptionalUser instead.',
		)
	}
	return maybeUser
}

// The RBAC vocabulary. These value-level registries are the single source of
// truth for what actions/entities/access levels exist; the `Permission` rows in
// the database (and the seed) must mirror them. The types are derived from the
// arrays so the type and the runtime list cannot drift.
export const permissionActions = ['create', 'read', 'update', 'delete'] as const
export const permissionEntities = ['user', 'note'] as const
export const permissionAccesses = ['own', 'any'] as const

export type PermissionAction = (typeof permissionActions)[number]
export type PermissionEntity = (typeof permissionEntities)[number]
export type PermissionAccess = (typeof permissionAccesses)[number]

// An access segment of a PermissionString names a single stored access level or
// a comma-joined set meaning "any of these satisfy the requirement".
type AccessSegment =
	| PermissionAccess
	| `${PermissionAccess},${PermissionAccess}`

export type PermissionString =
	| `${PermissionAction}:${PermissionEntity}`
	| `${PermissionAction}:${PermissionEntity}:${AccessSegment}`

// What a guard requires: an entity+action, and optionally the set of access
// levels that satisfy it (undefined = any access).
export type RequiredPermission = {
	action: PermissionAction
	entity: PermissionEntity
	access?: Array<PermissionAccess>
}

export function parsePermissionString(
	permissionString: PermissionString,
): RequiredPermission {
	const [action, entity, access] = permissionString.split(':') as [
		PermissionAction,
		PermissionEntity,
		AccessSegment | undefined,
	]
	return {
		action,
		entity,
		access: access ? (access.split(',') as Array<PermissionAccess>) : undefined,
	}
}

// A single permission granted to a user, as stored on a Role. Only the three
// columns the match rule reads are required, so any query selecting them — the
// root loader's user, or the server guard's lookup — satisfies this shape.
type GrantedPermission = { action: string; entity: string; access: string }
type UserWithPermissions = {
	roles: Array<{ permissions: Array<GrantedPermission> }>
}

// The one home of the permission-match rule. A granted permission satisfies a
// requirement when it is on the same entity+action and its access is among those
// required (or the requirement names no access). Both the server guard
// (`requireUserWithPermission`) and the client `userHasPermission` go through
// this, so the rule cannot diverge between the two.
export function permissionSatisfies(
	granted: GrantedPermission,
	required: RequiredPermission,
): boolean {
	return (
		granted.entity === required.entity &&
		granted.action === required.action &&
		(!required.access ||
			required.access.includes(granted.access as PermissionAccess))
	)
}

export function userHasPermission(
	user: UserWithPermissions | null | undefined,
	permission: PermissionString,
) {
	if (!user) return false
	const required = parsePermissionString(permission)
	return user.roles.some((role) =>
		role.permissions.some((granted) => permissionSatisfies(granted, required)),
	)
}

export function userHasRole(
	user: Pick<ReturnType<typeof useUser>, 'roles'> | null,
	role: string,
) {
	if (!user) return false
	return user.roles.some((r) => r.name === role)
}
