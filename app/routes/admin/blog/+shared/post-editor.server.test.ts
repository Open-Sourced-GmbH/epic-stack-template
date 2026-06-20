import { RouterContextProvider } from 'react-router'
import { expect, test } from 'vitest'
import { getSessionExpirationDate } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { getPermissionMatrix } from '#app/utils/user.ts'
import { createUser } from '#tests/db-utils.ts'
import { BASE_URL, getSessionCookieHeader } from '#tests/utils.ts'
import { action } from './post-editor.server.tsx'

let roleCounter = 0

/**
 * A user holding the `post` permissions — the admin authoring role. The test DB
 * is migrated but not seeded, so the `post` Permission rows (derived from the
 * RBAC vocabulary) are upserted here and connected to a fresh role.
 */
async function makeAdmin() {
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
function makeReader() {
	return prisma.user.create({ select: { id: true }, data: createUser() })
}

async function requestFor(userId: string, fields: Record<string, string>) {
	const session = await prisma.session.create({
		select: { id: true },
		data: { expirationDate: getSessionExpirationDate(), userId },
	})
	const cookie = await getSessionCookieHeader(session)
	return new Request(`${BASE_URL}/admin/blog/new`, {
		method: 'POST',
		headers: { cookie },
		body: new URLSearchParams(fields),
	})
}

function callAction(request: Request) {
	return action({
		request,
		params: {},
		context: new RouterContextProvider(),
		url: new URL(request.url),
		pattern: '/admin/blog/new',
	})
}

function expectRedirect(response: Awaited<ReturnType<typeof action>>) {
	if (!(response instanceof Response)) {
		throw new Error('expected a redirect Response, got a data() result')
	}
	return response.headers.get('location')
}

function expectFieldErrors(response: Awaited<ReturnType<typeof action>>) {
	if (response instanceof Response) {
		throw new Error('expected a data() result, got a redirect')
	}
	return response.data.result.error ?? {}
}

test('an admin creates a Draft post and is redirected to its editor', async () => {
	const admin = await makeAdmin()
	const request = await requestFor(admin.id, {
		title: 'My First Post',
		slug: '',
		excerpt: 'An excerpt',
		body: 'Hello body',
	})

	const location = expectRedirect(await callAction(request))
	expect(location).toMatch(/^\/admin\/blog\/.+\/edit$/)

	const post = await prisma.post.findUnique({ where: { slug: 'my-first-post' } })
	expect(post).not.toBeNull()
	expect(post?.title).toBe('My First Post')
	expect(post?.excerpt).toBe('An excerpt')
	expect(post?.authorId).toBe(admin.id)
	// Created as a Draft — publication is a sibling slice (EPT-49).
	expect(post?.publishedAt).toBeNull()
})

test('an admin updates an existing Draft', async () => {
	const admin = await makeAdmin()
	const draft = await prisma.post.create({
		select: { id: true },
		data: { title: 'Original', slug: 'original', body: 'old body' },
	})

	const request = await requestFor(admin.id, {
		id: draft.id,
		title: 'Updated title',
		slug: 'original',
		excerpt: '',
		body: 'new body',
	})
	const location = expectRedirect(await callAction(request))
	expect(location).toBe(`/admin/blog/${draft.id}/edit`)

	const post = await prisma.post.findUnique({ where: { id: draft.id } })
	expect(post?.title).toBe('Updated title')
	expect(post?.body).toBe('new body')
	expect(post?.excerpt).toBeNull()
})

test('a colliding slug is an explicit field error, not a silent suffix', async () => {
	const admin = await makeAdmin()
	await prisma.post.create({
		select: { id: true },
		data: { title: 'Taken', slug: 'taken-slug', body: 'body' },
	})

	const request = await requestFor(admin.id, {
		title: 'Another',
		slug: 'taken-slug',
		excerpt: '',
		body: 'body',
	})
	const errors = expectFieldErrors(await callAction(request))
	expect(errors.slug?.join(' ')).toMatch(/already taken/i)

	// No silent suffixing: only the original post owns the slug.
	expect(await prisma.post.count({ where: { slug: 'taken-slug' } })).toBe(1)
	expect(await prisma.post.count({ where: { title: 'Another' } })).toBe(0)
})

test("a published post's slug is locked", async () => {
	const admin = await makeAdmin()
	const published = await prisma.post.create({
		select: { id: true },
		data: {
			title: 'Live',
			slug: 'live-slug',
			body: 'body',
			publishedAt: new Date('2026-01-01'),
		},
	})

	const request = await requestFor(admin.id, {
		id: published.id,
		title: 'Live',
		slug: 'renamed-slug',
		excerpt: '',
		body: 'body',
	})
	const errors = expectFieldErrors(await callAction(request))
	expect(errors.slug?.join(' ')).toMatch(/locked/i)

	const post = await prisma.post.findUnique({ where: { id: published.id } })
	expect(post?.slug).toBe('live-slug')
})

test('the editor refuses a non-admin (reader)', async () => {
	const reader = await makeReader()
	const request = await requestFor(reader.id, {
		title: 'Sneaky',
		slug: '',
		excerpt: '',
		body: 'body',
	})

	// The guard throws a 403 — as a Response or a data() wrapper depending on the
	// version; read the status from whichever shape it is.
	const thrown = await callAction(request).catch((error: unknown) => error)
	const status =
		thrown instanceof Response
			? thrown.status
			: (thrown as { init?: ResponseInit }).init?.status
	expect(status).toBe(403)
	expect(await prisma.post.count({ where: { title: 'Sneaky' } })).toBe(0)
})
