import { expect, test } from 'vitest'
import {
	getSessionCookieFor,
	makeAdmin,
	makeReader,
	statusOf,
} from '#tests/post-admin-utils.ts'
import { BASE_URL } from '#tests/utils.ts'
import { loader } from './index.tsx'

async function requestFor(userId: string) {
	const cookie = await getSessionCookieFor(userId)
	return new Request(`${BASE_URL}/admin/roles`, { headers: { cookie } })
}

function callLoader(request: Request) {
	return loader({ request } as Parameters<typeof loader>[0])
}

test('an admin can read the roles list, including the built-in system roles', async () => {
	// `makeAdmin` holds every `:any` permission (incl. `read:role:any`).
	const admin = await makeAdmin()

	const { roles } = await callLoader(await requestFor(admin.id))
	// The migrated DB carries the built-in `admin`/`user` system roles.
	const adminRole = roles.find((r) => r.name === 'admin')
	expect(adminRole?.system).toBe(true)
	expect(roles.some((r) => r.name === 'user')).toBe(true)
})

test('the list refuses a non-manager (reader) with a 403', async () => {
	const reader = await makeReader()

	const thrown = await callLoader(await requestFor(reader.id)).catch(
		(error: unknown) => error,
	)
	expect(statusOf(thrown)).toBe(403)
})
