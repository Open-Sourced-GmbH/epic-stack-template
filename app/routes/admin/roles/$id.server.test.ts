import { expect, test } from 'vitest'
import { prisma } from '#app/utils/db.server.ts'
import {
	getSessionCookieFor,
	makeAdmin,
	makeReader,
	statusOf,
} from '#tests/post-admin-utils.ts'
import { BASE_URL } from '#tests/utils.ts'
import { action, loader } from './$id.tsx'

/** A GET request to the role editor (its loader). */
async function loaderRequest(userId: string) {
	const cookie = await getSessionCookieFor(userId)
	return new Request(`${BASE_URL}/admin/roles/x`, { headers: { cookie } })
}

/** A POST to the role editor carrying form fields (name/description/grants). */
async function saveRequest(
	userId: string,
	fields: { name?: string; description?: string; grants?: string[] },
) {
	const cookie = await getSessionCookieFor(userId)
	const body = new URLSearchParams()
	if (fields.name !== undefined) body.set('name', fields.name)
	if (fields.description !== undefined) body.set('description', fields.description)
	for (const grant of fields.grants ?? []) body.append('grants', grant)
	return new Request(`${BASE_URL}/admin/roles/x`, {
		method: 'POST',
		headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
		body,
	})
}

/** A POST carrying a bare `intent` (the delete path). */
async function intentRequest(userId: string, intent: string) {
	const cookie = await getSessionCookieFor(userId)
	const body = new URLSearchParams({ intent })
	return new Request(`${BASE_URL}/admin/roles/x`, {
		method: 'POST',
		headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
		body,
	})
}

function callLoader(request: Request, id: string) {
	return loader({ request, params: { id }, context: {} } as unknown as Parameters<
		typeof loader
	>[0])
}

function callAction(request: Request, id: string) {
	return action({ request, params: { id }, context: {} } as unknown as Parameters<
		typeof action
	>[0])
}

function dataOf(result: Awaited<ReturnType<typeof action>>) {
	if (result instanceof Response) {
		throw new Error('expected a data() result, got a Response')
	}
	return result.data
}

/** The acting admin's own role (the sole floor provider in `makeAdmin`). */
async function adminRole(userId: string) {
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: { roles: { select: { id: true, name: true } } },
	})
	return user.roles[0]!
}

test('the loader refuses a non-manager (reader) with a 403', async () => {
	const reader = await makeReader()
	const role = await prisma.role.create({
		select: { id: true },
		data: { name: 'editors' },
	})

	const thrown = await callLoader(await loaderRequest(reader.id), role.id).catch(
		(error: unknown) => error,
	)
	expect(statusOf(thrown)).toBe(403)
})

test('the loader returns an empty skeleton in create mode', async () => {
	const admin = await makeAdmin()

	const result = await callLoader(await loaderRequest(admin.id), 'new')
	expect(result.isNew).toBe(true)
	expect(result.role.name).toBe('')
	expect(result.role.grants).toEqual([])
})

test('an admin creates a role through the action, persisting name + grants', async () => {
	const admin = await makeAdmin()

	const response = await callAction(
		await saveRequest(admin.id, {
			name: 'Content editor',
			description: 'Edits posts',
			grants: ['read:user:any', 'update:post:any'],
		}),
		'new',
	)

	// Success navigates to the new role's editor.
	expect(response).toBeInstanceOf(Response)
	const location = (response as Response).headers.get('location') ?? ''
	expect(location.startsWith('/admin/roles/')).toBe(true)

	const created = await prisma.role.findUniqueOrThrow({
		where: { name: 'Content editor' },
		select: {
			description: true,
			system: true,
			permissions: { select: { action: true, entity: true, access: true } },
		},
	})
	expect(created.system).toBe(false)
	expect(created.description).toBe('Edits posts')
	expect(
		created.permissions.map((p) => `${p.action}:${p.entity}:${p.access}`).sort(),
	).toEqual(['read:user:any', 'update:post:any'])
})

test('an empty name is rejected with a 400 field error', async () => {
	const admin = await makeAdmin()

	const response = await callAction(
		await saveRequest(admin.id, { name: '   ', grants: [] }),
		'new',
	)
	expect(statusOf(response)).toBe(400)
	const body = dataOf(response) as { ok: false; errors?: { name?: string[] } }
	expect(body.ok).toBe(false)
	expect(body.errors?.name?.[0]).toMatch(/required/i)
})

test('editing a role’s grants persists and returns ok', async () => {
	const admin = await makeAdmin()
	const role = await prisma.role.create({
		select: { id: true },
		data: { name: 'editors', permissions: { create: [] } },
	})

	const response = await callAction(
		await saveRequest(admin.id, {
			name: 'editors',
			description: '',
			grants: ['read:post:any'],
		}),
		role.id,
	)
	expect(dataOf(response)).toMatchObject({ ok: true })

	const fresh = await prisma.role.findUniqueOrThrow({
		where: { id: role.id },
		select: { permissions: { select: { action: true, entity: true, access: true } } },
	})
	expect(
		fresh.permissions.map((p) => `${p.action}:${p.entity}:${p.access}`),
	).toEqual(['read:post:any'])
})

test('stripping a floor-critical grant returns a blocked 422 (not thrown)', async () => {
	// The acting admin is the only capable admin; their role carries the floor.
	const admin = await makeAdmin()
	const role = await adminRole(admin.id)

	const response = await callAction(
		// Keep the role's own name (a no-op rename) but drop user:any + role:any.
		await saveRequest(admin.id, { name: role.name, grants: ['read:post:any'] }),
		role.id,
	)

	expect(statusOf(response)).toBe(422)
	const body = dataOf(response) as { ok: false; blocked?: string }
	expect(body.ok).toBe(false)
	expect(body.blocked).toMatch(/last admin|manage users and roles/i)

	// The floor-critical grants survive — the change rolled back.
	const fresh = await prisma.role.findUniqueOrThrow({
		where: { id: role.id },
		select: { permissions: { select: { entity: true, access: true } } },
	})
	expect(
		fresh.permissions.some((p) => p.entity === 'role' && p.access === 'any'),
	).toBe(true)
})

test('the delete intent removes a custom role and redirects to the list', async () => {
	const admin = await makeAdmin()
	const role = await prisma.role.create({
		select: { id: true },
		data: { name: 'disposable' },
	})

	const response = await callAction(
		await intentRequest(admin.id, 'delete'),
		role.id,
	)

	expect(response).toBeInstanceOf(Response)
	expect((response as Response).headers.get('location')).toBe('/admin/roles')
	expect(
		await prisma.role.findUnique({ where: { id: role.id }, select: { id: true } }),
	).toBeNull()
})
