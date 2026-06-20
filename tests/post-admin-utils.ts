import { getSessionExpirationDate } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { getPermissionMatrix } from '#app/utils/user.ts'
import { createUser } from './db-utils.ts'
import { getSessionCookieHeader } from './utils.ts'

/**
 * Shared scaffolding for the Post admin's server tests (`/admin/blog` list +
 * editor action). The test DB is migrated but **not seeded**, so the `post`
 * Permission rows (derived from the RBAC vocabulary) don't exist yet — these
 * helpers upsert them and wire up the signed-in users the guards expect.
 */

let roleCounter = 0

/** A user holding every `post` permission — the admin authoring role. */
export async function makeAdmin() {
	const permRows = await Promise.all(
		getPermissionMatrix()
			.filter((p) => p.entity === 'post')
			.map((p) =>
				prisma.permission.upsert({
					where: {
						action_entity_access: {
							action: p.action,
							entity: p.entity,
							access: p.access,
						},
					},
					create: p,
					update: {},
					select: { id: true },
				}),
			),
	)
	return prisma.user.create({
		select: { id: true },
		data: {
			...createUser(),
			roles: {
				create: {
					name: `post-admin-${roleCounter++}`,
					permissions: { connect: permRows.map((p) => ({ id: p.id })) },
				},
			},
		},
	})
}

/** A signed-in user holding no roles — a reader, not an author. */
export function makeReader() {
	return prisma.user.create({ select: { id: true }, data: createUser() })
}

/** A session cookie header for `userId`, ready to attach to a test `Request`. */
export async function getSessionCookieFor(userId: string) {
	const session = await prisma.session.create({
		select: { id: true },
		data: { expirationDate: getSessionExpirationDate(), userId },
	})
	return getSessionCookieHeader(session)
}
