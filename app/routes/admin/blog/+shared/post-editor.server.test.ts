import { RouterContextProvider } from 'react-router'
import { expect, test } from 'vitest'
import { prisma } from '#app/utils/db.server.ts'
import {
	getSessionCookieFor,
	makeAdmin,
	makeReader,
} from '#tests/post-admin-utils.ts'
import { BASE_URL } from '#tests/utils.ts'
import { action } from './post-editor.server.tsx'

async function requestFor(
	userId: string,
	fields: Record<string, string>,
	tags: string[] = [],
) {
	const cookie = await getSessionCookieFor(userId)
	const body = new URLSearchParams(fields)
	// Tags submit as repeated `tags` keys (one hidden input per chip), which the
	// action parses into an array.
	for (const tag of tags) body.append('tags', tag)
	return new Request(`${BASE_URL}/admin/blog/new`, {
		method: 'POST',
		headers: { cookie },
		body,
	})
}

/** A multipart request (so a cover `File` can ride along), mirroring the editor's
 * `encType="multipart/form-data"` submit. */
async function multipartRequestFor(
	userId: string,
	fields: Record<string, string>,
	cover?: File,
) {
	const cookie = await getSessionCookieFor(userId)
	const body = new FormData()
	for (const [key, value] of Object.entries(fields)) body.append(key, value)
	if (cover) body.append('coverFile', cover)
	return new Request(`${BASE_URL}/admin/blog/new`, {
		method: 'POST',
		headers: { cookie },
		body,
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

test('saving a post resolves the typed tags and attaches them', async () => {
	const admin = await makeAdmin()
	// One tag already exists (must be reused); one is brand-new (created).
	await prisma.tag.create({ data: { name: 'React', slug: 'react' } })

	const request = await requestFor(
		admin.id,
		{ title: 'Tagged Post', slug: '', excerpt: '', body: 'body' },
		['react', 'React Router'],
	)
	expectRedirect(await callAction(request))

	const post = await prisma.post.findUnique({
		where: { slug: 'tagged-post' },
		select: { tags: { select: { slug: true }, orderBy: { slug: 'asc' } } },
	})
	expect(post?.tags.map((t) => t.slug)).toEqual(['react', 'react-router'])
	// The existing React tag was reused, not duplicated.
	expect(await prisma.tag.count({ where: { slug: 'react' } })).toBe(1)
})

test('editing a post replaces its tag set with what was submitted', async () => {
	const admin = await makeAdmin()
	const draft = await prisma.post.create({
		select: { id: true },
		data: {
			title: 'Retag',
			slug: 'retag',
			body: 'body',
			tags: { create: [{ name: 'Old', slug: 'old' }] },
		},
	})

	const request = await requestFor(
		admin.id,
		{ id: draft.id, title: 'Retag', slug: 'retag', excerpt: '', body: 'body' },
		['New'],
	)
	expectRedirect(await callAction(request))

	const post = await prisma.post.findUnique({
		where: { id: draft.id },
		select: { tags: { select: { slug: true } } },
	})
	expect(post?.tags.map((t) => t.slug)).toEqual(['new'])
})

test('publishing a draft stamps publishedAt and makes it live', async () => {
	const admin = await makeAdmin()
	const draft = await prisma.post.create({
		select: { id: true },
		data: { title: 'To Publish', slug: 'to-publish', body: 'body' },
	})

	const request = await requestFor(admin.id, {
		id: draft.id,
		intent: 'publish',
		title: 'To Publish',
		slug: 'to-publish',
		excerpt: 'A summary',
		body: 'body',
	})
	const location = expectRedirect(await callAction(request))
	expect(location).toBe(`/admin/blog/${draft.id}/edit`)

	const post = await prisma.post.findUnique({ where: { id: draft.id } })
	expect(post?.publishedAt).toBeInstanceOf(Date)
})

test('publishing without an excerpt is blocked with a field error', async () => {
	const admin = await makeAdmin()
	const draft = await prisma.post.create({
		select: { id: true },
		data: { title: 'No Excerpt', slug: 'no-excerpt', body: 'body' },
	})

	const request = await requestFor(admin.id, {
		id: draft.id,
		intent: 'publish',
		title: 'No Excerpt',
		slug: 'no-excerpt',
		excerpt: '',
		body: 'body',
	})
	const errors = expectFieldErrors(await callAction(request))
	expect(errors.excerpt?.join(' ')).toMatch(/excerpt is required/i)

	// Still a Draft — the failed publish never stamped publishedAt.
	const post = await prisma.post.findUnique({ where: { id: draft.id } })
	expect(post?.publishedAt).toBeNull()
})

test('re-publishing keeps the original publication instant', async () => {
	const admin = await makeAdmin()
	const firstPublished = new Date('2026-01-01T00:00:00.000Z')
	const published = await prisma.post.create({
		select: { id: true },
		data: {
			title: 'Live',
			slug: 'live',
			body: 'body',
			excerpt: 'sum',
			publishedAt: firstPublished,
		},
	})

	const request = await requestFor(admin.id, {
		id: published.id,
		intent: 'publish',
		title: 'Live edited',
		slug: 'live',
		excerpt: 'sum',
		body: 'body edited',
	})
	expectRedirect(await callAction(request))

	const post = await prisma.post.findUnique({ where: { id: published.id } })
	expect(post?.publishedAt?.toISOString()).toBe(firstPublished.toISOString())
	expect(post?.title).toBe('Live edited')
})

test('unpublishing clears publishedAt (Published → Draft)', async () => {
	const admin = await makeAdmin()
	const published = await prisma.post.create({
		select: { id: true },
		data: {
			title: 'Going Dark',
			slug: 'going-dark',
			body: 'body',
			publishedAt: new Date('2026-01-01'),
		},
	})

	const cookie = await getSessionCookieFor(admin.id)
	const request = new Request(`${BASE_URL}/admin/blog/new`, {
		method: 'POST',
		headers: { cookie },
		// Unpublish carries only id + intent — the confirm Dialog submits nothing else.
		body: new URLSearchParams({ id: published.id, intent: 'unpublish' }),
	})
	const location = expectRedirect(await callAction(request))
	expect(location).toBe(`/admin/blog/${published.id}/edit`)

	const post = await prisma.post.findUnique({ where: { id: published.id } })
	expect(post?.publishedAt).toBeNull()
})

test('a cover upload attaches a PostImage and sets coverImageId', async () => {
	const admin = await makeAdmin()
	const cover = new File([Buffer.from('fake-png-bytes')], 'cover.png', {
		type: 'image/png',
	})
	const request = await multipartRequestFor(
		admin.id,
		{ title: 'With Cover', slug: '', excerpt: '', body: 'body' },
		cover,
	)
	expectRedirect(await callAction(request))

	const post = await prisma.post.findUnique({
		where: { slug: 'with-cover' },
		select: { coverImageId: true, coverImage: { select: { objectKey: true } } },
	})
	expect(post?.coverImageId).not.toBeNull()
	expect(post?.coverImage?.objectKey).toMatch(/posts\/.+\/images\//)
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
