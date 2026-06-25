import { expect, test } from 'vitest'
import { prisma } from '#app/utils/db.server.ts'
import { createUser } from '#tests/db-utils.ts'
import { listRoles } from './rbac-admin.server.ts'

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
