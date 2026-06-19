import { expect, test } from 'vitest'
import {
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
	expect(parsePermissionString('delete:note:own')).toEqual({
		action: 'delete',
		entity: 'note',
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
	expect(parsePermissionString('delete:note:own,any').access).toEqual([
		'own',
		'any',
	])
})

test('permissionSatisfies requires the same entity and action', () => {
	const required = parsePermissionString('delete:note:any')
	expect(permissionSatisfies(grant('delete', 'note', 'any'), required)).toBe(
		true,
	)
	expect(permissionSatisfies(grant('update', 'note', 'any'), required)).toBe(
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
	const required = parsePermissionString('delete:note:own')
	expect(permissionSatisfies(grant('delete', 'note', 'own'), required)).toBe(
		true,
	)
	expect(permissionSatisfies(grant('delete', 'note', 'any'), required)).toBe(
		false,
	)
})

test('a comma-joined requirement matches any of its access levels', () => {
	const required = parsePermissionString('delete:note:own,any')
	expect(permissionSatisfies(grant('delete', 'note', 'own'), required)).toBe(
		true,
	)
	expect(permissionSatisfies(grant('delete', 'note', 'any'), required)).toBe(
		true,
	)
})

test('getPermissionMatrix is the full entity × action × access cross product', () => {
	const matrix = getPermissionMatrix()
	expect(matrix).toHaveLength(
		permissionEntities.length *
			permissionActions.length *
			permissionAccesses.length,
	)
	// every entry draws from the vocabulary, and the set is unique
	const keys = new Set<string>()
	for (const { action, entity, access } of matrix) {
		expect(permissionActions).toContain(action)
		expect(permissionEntities).toContain(entity)
		expect(permissionAccesses).toContain(access)
		keys.add(`${action}:${entity}:${access}`)
	}
	expect(keys.size).toBe(matrix.length)
})

test('every Role has a granted access level', () => {
	for (const name of roleNames) {
		expect(permissionAccesses).toContain(roleGrantedAccess[name])
	}
})

test('permissionForOwnership picks :own when owner, :any otherwise', () => {
	expect(permissionForOwnership('delete', 'note', true)).toBe('delete:note:own')
	expect(permissionForOwnership('delete', 'note', false)).toBe('delete:note:any')
})

test('userHasPermission scans every role and is false without a user', () => {
	const user = userWith(grant('read', 'user', 'any'), grant('delete', 'note', 'own'))
	const has = (p: PermissionString) => userHasPermission(user, p)
	expect(has('delete:note:own')).toBe(true)
	expect(has('read:user:any')).toBe(true)
	expect(has('delete:note:any')).toBe(false)
	expect(userHasPermission(null, 'read:user')).toBe(false)
	expect(userHasPermission(undefined, 'read:user')).toBe(false)
})
