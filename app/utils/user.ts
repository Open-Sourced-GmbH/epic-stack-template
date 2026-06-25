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
export const permissionEntities = ['user', 'post', 'audit'] as const
export const permissionAccesses = ['own', 'any'] as const

export type PermissionAction = (typeof permissionActions)[number]
export type PermissionEntity = (typeof permissionEntities)[number]
export type PermissionAccess = (typeof permissionAccesses)[number]

// Which access levels each entity is scoped by. Owner-scoped entities (a user
// acting on their own account) carry both `own` and `any`; admin-authored
// canonical content (`post`) is never owner-scoped, so it carries `any` alone —
// there is no `post:own`. Because the `user` role is granted only `:own`
// permissions (see `roleGrantedAccess`), an entity with no `:own` access grants
// that role nothing, so regular users hold no `post` permission at all (readers
// only — ADR-050) as a consequence of the registry rather than a special case.
export const entityAccesses = {
	user: ['own', 'any'],
	post: ['any'],
	// The audit log is an admin-only investigation surface (ADR-070): never
	// owner-scoped, so it carries `any` alone (`read:audit:any` for the viewer).
	audit: ['any'],
} as const satisfies Record<PermissionEntity, ReadonlyArray<PermissionAccess>>

// The set of Roles a user can hold, named once here (the database `Role` rows
// must mirror it). Guards take a `RoleName`, so a mistyped role is a compile
// error rather than a silent 403 at runtime.
export const roleNames = ['user', 'admin'] as const
export type RoleName = (typeof roleNames)[number]

// The access level each Role is granted across every entity/action. Exhaustive
// over RoleName (a role without a grant is a compile error). This is the policy
// the init migration hard-coded — "admin gets every `any` permission, user every
// `own`" — which until now lived only as commented-out SQL; naming it here gives
// that folklore a home and lets the seed derive role grants from it.
export const roleGrantedAccess = {
	admin: 'any',
	user: 'own',
} satisfies Record<RoleName, PermissionAccess>

// The full permission matrix derived from the vocabulary: every action on every
// entity, at each access level that entity is scoped by (`entityAccesses`). The
// database `Permission` rows are exactly this set, so the seed generates them
// from here rather than from a hand-maintained list.
export function getPermissionMatrix(): Array<{
	action: PermissionAction
	entity: PermissionEntity
	access: PermissionAccess
}> {
	return permissionEntities.flatMap((entity) =>
		permissionActions.flatMap((action) =>
			entityAccesses[entity].map((access) => ({ action, entity, access })),
		),
	)
}

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

// The permission required to act on a resource you may or may not own: the
// narrower `:own` when you own it, the broader `:any` otherwise. This is the
// own-vs-any RBAC idiom (the reason the access levels exist, see ADR-028); naming
// it keeps the ownership→permission rule in one place rather than re-spelled at a
// server guard and its mirroring client check.
export function permissionForOwnership(
	action: PermissionAction,
	entity: PermissionEntity,
	isOwner: boolean,
): PermissionString {
	return `${action}:${entity}:${isOwner ? 'own' : 'any'}`
}

export function userHasRole(
	user: Pick<ReturnType<typeof useUser>, 'roles'> | null,
	role: RoleName,
) {
	if (!user) return false
	return user.roles.some((r) => r.name === role)
}
