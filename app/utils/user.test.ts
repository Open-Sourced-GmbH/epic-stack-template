import { expect, test } from 'vitest'
import {
	entityAccesses,
	getPermissionMatrix,
	parsePermissionString,
	permissionAccesses,
	permissionActions,
	permissionEntities,
	permissionForOwnership,
	permissionSatisfies,
	roleGrantedAccess,
	roleNames,
	userHasPermission,
	type PermissionString,
} from './user.ts'

const grant = (action: string, entity: string, access: string) => ({
	action,
	entity,
	access,
})
const userWith = (...permissions: Array<ReturnType<typeof grant>>) => ({
	roles: [{ permissions }],
})

test('parsePermissionString splits the three segments', () => {
	expect(parsePermissionString('delete:user:own')).toEqual({
		action: 'delete',
		entity: 'user',
		access: ['own'],
	})
})

test('a missing access segment means no access constraint', () => {
	expect(parsePermissionString('read:user')).toEqual({
		action: 'read',
		entity: 'user',
		access: undefined,
	})
})

test('a comma-joined access segment parses to the set of levels', () => {
	expect(parsePermissionString('delete:user:own,any').access).toEqual([
		'own',
		'any',
	])
})

test('permissionSatisfies requires the same entity and action', () => {
	const required = parsePermissionString('delete:post:any')
	expect(permissionSatisfies(grant('delete', 'post', 'any'), required)).toBe(
		true,
	)
	expect(permissionSatisfies(grant('update', 'post', 'any'), required)).toBe(
		false,
	)
	expect(permissionSatisfies(grant('delete', 'user', 'any'), required)).toBe(
		false,
	)
})

test('a requirement with no access matches any granted access level', () => {
	const required = parsePermissionString('read:user')
	expect(permissionSatisfies(grant('read', 'user', 'own'), required)).toBe(true)
	expect(permissionSatisfies(grant('read', 'user', 'any'), required)).toBe(true)
})

test('a single-access requirement matches only that access level', () => {
	const required = parsePermissionString('delete:user:own')
	expect(permissionSatisfies(grant('delete', 'user', 'own'), required)).toBe(
		true,
	)
	expect(permissionSatisfies(grant('delete', 'user', 'any'), required)).toBe(
		false,
	)
})

test('a comma-joined requirement matches any of its access levels', () => {
	const required = parsePermissionString('delete:user:own,any')
	expect(permissionSatisfies(grant('delete', 'user', 'own'), required)).toBe(
		true,
	)
	expect(permissionSatisfies(grant('delete', 'user', 'any'), required)).toBe(
		true,
	)
})

test('getPermissionMatrix expands each entity at the access levels it is scoped by', () => {
	const matrix = getPermissionMatrix()
	const expectedLength = permissionEntities.reduce(
		(sum, entity) =>
			sum + permissionActions.length * entityAccesses[entity].length,
		0,
	)
	expect(matrix).toHaveLength(expectedLength)
	// every entry draws from the vocabulary, at an access level valid for its
	// entity, and the set is unique
	const keys = new Set<string>()
	for (const { action, entity, access } of matrix) {
		expect(permissionActions).toContain(action)
		expect(permissionEntities).toContain(entity)
		expect(entityAccesses[entity]).toContain(access)
		keys.add(`${action}:${entity}:${access}`)
	}
	expect(keys.size).toBe(matrix.length)
})

test('post is admin-authored content: every action at :any, never :own', () => {
	// posts are never owner-scoped — there is no post:own
	expect(entityAccesses.post).toEqual(['any'])

	const postPerms = getPermissionMatrix().filter((p) => p.entity === 'post')
	// the seed grants each role the permissions at its granted access level, so
	// the admin role (`:any`) holds every post action while the user role
	// (`:own`) holds none — there is no `post:own` to grant
	expect(postPerms.every((p) => p.access === roleGrantedAccess.admin)).toBe(true)
	expect([...postPerms.map((p) => p.action)].sort()).toEqual(
		[...permissionActions].sort(),
	)
	expect(postPerms.some((p) => p.access === roleGrantedAccess.user)).toBe(false)
})

test('every Role has a granted access level', () => {
	for (const name of roleNames) {
		expect(permissionAccesses).toContain(roleGrantedAccess[name])
	}
})

test('permissionForOwnership picks :own when owner, :any otherwise', () => {
	expect(permissionForOwnership('delete', 'user', true)).toBe('delete:user:own')
	expect(permissionForOwnership('delete', 'user', false)).toBe(
		'delete:user:any',
	)
})

test('userHasPermission scans every role and is false without a user', () => {
	const user = userWith(
		grant('read', 'user', 'any'),
		grant('delete', 'user', 'own'),
	)
	const has = (p: PermissionString) => userHasPermission(user, p)
	expect(has('delete:user:own')).toBe(true)
	expect(has('read:user:any')).toBe(true)
	expect(has('delete:user:any')).toBe(false)
	expect(userHasPermission(null, 'read:user')).toBe(false)
	expect(userHasPermission(undefined, 'read:user')).toBe(false)
})
