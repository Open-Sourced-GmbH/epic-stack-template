import { expect, test } from 'vitest'
import {
	adminFloorHolds,
	isCapableAdmin,
	requiredAdminCapabilities,
} from './admin-floor.ts'

/** A role granting `:any` on each named entity (the capability shape the core reads). */
function role(...entities: string[]) {
	return { permissions: entities.map((entity) => ({ entity, access: 'any' })) }
}

test('requiredAdminCapabilities are catalog entities (user today, role once it lands)', () => {
	// `user` is in the live catalog; `post`/`audit` are never part of the floor.
	expect(requiredAdminCapabilities).toContain('user')
	expect(requiredAdminCapabilities).not.toContain('post')
	expect(requiredAdminCapabilities).not.toContain('audit')
})

test('a user is a capable admin only when every required capability is held', () => {
	// Holds the whole required set → capable.
	expect(isCapableAdmin([role(...requiredAdminCapabilities)])).toBe(true)
	// Holds none of them → not capable.
	expect(isCapableAdmin([role('post')])).toBe(false)
	// No roles at all → not capable.
	expect(isCapableAdmin([])).toBe(false)
})

test('capability may be split across several roles', () => {
	// Two required capabilities, one granted by each of two separate roles: the
	// union across roles satisfies the floor.
	const required = ['user', 'role']
	const split = [role('user'), role('role')]
	expect(isCapableAdmin(split, required)).toBe(true)
	// Drop the role carrying `role:any` and the holder is no longer capable.
	expect(isCapableAdmin([role('user')], required)).toBe(false)
})

test('the floor holds while at least one capable admin remains', () => {
	const required = ['user']
	const capable = { roles: [role('user')] }
	const plain = { roles: [role('post')] }

	// Two capable admins, then the boundary, then below it.
	expect(adminFloorHolds([capable, capable], required)).toBe(true)
	expect(adminFloorHolds([capable, plain], required)).toBe(true)
	expect(adminFloorHolds([plain, plain], required)).toBe(false)
	expect(adminFloorHolds([], required)).toBe(false)
})
