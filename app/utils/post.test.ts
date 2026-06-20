import { expect, test } from 'vitest'
import { prisma } from '#app/utils/db.server.ts'
import { createUser } from '#tests/db-utils.ts'

// The Post is canonical content, not per-user content: the author relation is a
// *credit*, not ownership. Deleting the author blanks the credit (SetNull) but
// the Post stands — contrast the retired Note, which cascade-deleted with its
// owner. (ADR-050, docs/agents/domain.md.)
test('deleting an author blanks the credit but leaves the Post standing', async () => {
	const author = await prisma.user.create({
		select: { id: true },
		data: { ...createUser() },
	})
	const post = await prisma.post.create({
		select: { id: true },
		data: {
			title: 'Standing on its own',
			slug: `standing-${author.id}`,
			body: 'The author is credit, not ownership.',
			authorId: author.id,
		},
	})

	await prisma.user.delete({ where: { id: author.id } })

	const survivor = await prisma.post.findUnique({
		where: { id: post.id },
		select: { id: true, authorId: true },
	})
	expect(survivor).not.toBeNull()
	expect(survivor?.authorId).toBeNull()
})

test('a slug is globally unique across Posts', async () => {
	await prisma.post.create({
		data: { title: 'First', slug: 'shared-slug', body: 'one' },
	})
	await expect(
		prisma.post.create({
			data: { title: 'Second', slug: 'shared-slug', body: 'two' },
		}),
	).rejects.toThrow()
})
