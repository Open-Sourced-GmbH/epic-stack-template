import { expect, test } from 'vitest'
import { prisma } from '#app/utils/db.server.ts'
import {
	getSessionCookieFor,
	makeAdmin,
	makeReader,
	statusOf,
} from '#tests/post-admin-utils.ts'
import { BASE_URL } from '#tests/utils.ts'
import { action, loader } from './index.tsx'

async function requestFor(userId: string) {
	const cookie = await getSessionCookieFor(userId)
	return new Request(`${BASE_URL}/admin/blog`, { headers: { cookie } })
}

function callLoader(request: Request) {
	return loader({ request } as Parameters<typeof loader>[0])
}

/** A bulk-action POST carrying the op and one repeated `id` field per row. */
async function bulkRequestFor(
	userId: string,
	op: 'unpublish' | 'delete',
	ids: string[],
) {
	const cookie = await getSessionCookieFor(userId)
	const body = new URLSearchParams({ op })
	for (const id of ids) body.append('id', id)
	return new Request(`${BASE_URL}/admin/blog`, {
		method: 'POST',
		headers: { cookie },
		body,
	})
}

function callAction(request: Request) {
	return action({ request } as Parameters<typeof action>[0])
}

test('an admin sees every post, Drafts included', async () => {
	const admin = await makeAdmin()
	await prisma.post.create({
		data: { title: 'Live', slug: 'live', body: 'b', publishedAt: new Date() },
		select: { id: true },
	})
	await prisma.post.create({
		data: { title: 'Draft', slug: 'draft', body: 'b' },
		select: { id: true },
	})

	const { posts, total, publishedCount } = await callLoader(
		await requestFor(admin.id),
	)
	expect(total).toBe(2)
	expect(publishedCount).toBe(1)
	expect(posts.map((p) => p.title).sort()).toEqual(['Draft', 'Live'])
})

test('the list refuses a non-admin (reader)', async () => {
	const reader = await makeReader()

	const thrown = await callLoader(await requestFor(reader.id)).catch(
		(error: unknown) => error,
	)
	expect(statusOf(thrown)).toBe(403)
})

test('an admin bulk-unpublishes the selected set (Published → Draft)', async () => {
	const admin = await makeAdmin()
	const live1 = await prisma.post.create({
		select: { id: true },
		data: { title: 'L1', slug: 'l1', body: 'b', publishedAt: new Date() },
	})
	const live2 = await prisma.post.create({
		select: { id: true },
		data: { title: 'L2', slug: 'l2', body: 'b', publishedAt: new Date() },
	})
	const untouched = await prisma.post.create({
		select: { id: true },
		data: { title: 'L3', slug: 'l3', body: 'b', publishedAt: new Date() },
	})

	await callAction(
		await bulkRequestFor(admin.id, 'unpublish', [live1.id, live2.id]),
	)

	const after = await prisma.post.findMany({
		where: { id: { in: [live1.id, live2.id, untouched.id] } },
		select: { id: true, publishedAt: true },
	})
	const byId = new Map(after.map((p) => [p.id, p.publishedAt]))
	expect(byId.get(live1.id)).toBeNull()
	expect(byId.get(live2.id)).toBeNull()
	// A post outside the selection keeps its publication instant.
	expect(byId.get(untouched.id)).toBeInstanceOf(Date)
})

test('an admin bulk-deletes the selected set, Published posts included', async () => {
	const admin = await makeAdmin()
	const live = await prisma.post.create({
		select: { id: true },
		data: { title: 'D-live', slug: 'd-live', body: 'b', publishedAt: new Date() },
	})
	const draft = await prisma.post.create({
		select: { id: true },
		data: { title: 'D-draft', slug: 'd-draft', body: 'b' },
	})
	const kept = await prisma.post.create({
		select: { id: true },
		data: { title: 'D-keep', slug: 'd-keep', body: 'b' },
	})

	await callAction(await bulkRequestFor(admin.id, 'delete', [live.id, draft.id]))

	const remaining = await prisma.post.findMany({
		where: { id: { in: [live.id, draft.id, kept.id] } },
		select: { id: true },
	})
	// Both selected rows are gone (a live post is fair game); the rest stands.
	expect(remaining.map((p) => p.id)).toEqual([kept.id])
})

test('a non-admin (reader) cannot bulk-delete', async () => {
	const reader = await makeReader()
	const live = await prisma.post.create({
		select: { id: true },
		data: { title: 'R', slug: 'r', body: 'b', publishedAt: new Date() },
	})

	const thrown = await callAction(
		await bulkRequestFor(reader.id, 'delete', [live.id]),
	).catch((error: unknown) => error)
	expect(statusOf(thrown)).toBe(403)

	// The guard fired before the mutation — the post is untouched.
	expect(await prisma.post.count({ where: { id: live.id } })).toBe(1)
})
