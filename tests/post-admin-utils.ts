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
	const postPerms = getPermissionMatrix().filter((p) => p.entity === 'post')
	// Resolve the `post` Permission rows and attach them in a single atomic write.
	// `connectOrCreate` (rather than a separate upsert-then-connect-by-id) closes
	// the read-then-connect gap that raced the per-test base-DB copy in
	// `db-setup.ts` — under full-suite timing the gathered ids could point at rows
	// not all present at connect time ("Expected N records to be connected").
	return prisma.user.create({
		select: { id: true },
		data: {
			...createUser(),
			roles: {
				create: {
					name: `post-admin-${roleCounter++}`,
					permissions: {
						connectOrCreate: postPerms.map((p) => ({
							where: {
								action_entity_access: {
									action: p.action,
									entity: p.entity,
									access: p.access,
								},
							},
							create: p,
						})),
					},
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

/**
 * The HTTP status off a guard rejection. `requireUserWith…` throws a 403 as a
 * bare `Response` or a `data()` wrapper depending on the path, so read the status
 * from whichever shape it is.
 */
export function statusOf(thrown: unknown) {
	return thrown instanceof Response
		? thrown.status
		: (thrown as { init?: ResponseInit }).init?.status
}
