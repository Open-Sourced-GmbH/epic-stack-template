import { expect, test } from 'vitest'
import { prisma } from '#app/utils/db.server.ts'
import { resolveTags } from './tag.server.ts'

test('a brand-new tag name is created, slugified', async () => {
	const resolved = await resolveTags(['React Router'])

	expect(resolved).toHaveLength(1)
	expect(resolved[0]).toMatchObject({ name: 'React Router', slug: 'react-router' })

	const row = await prisma.tag.findUnique({ where: { slug: 'react-router' } })
	expect(row?.id).toBe(resolved[0]!.id)
})

test('an existing tag is reused, never duplicated', async () => {
	const existing = await prisma.tag.create({
		data: { name: 'TypeScript', slug: 'typescript' },
		select: { id: true },
	})

	// A differently-cased spelling still slugifies to the same canonical slug.
	const resolved = await resolveTags(['typescript'])

	expect(resolved[0]!.id).toBe(existing.id)
	expect(await prisma.tag.count({ where: { slug: 'typescript' } })).toBe(1)
})

test('input that collapses to the same slug yields one row, first spelling wins', async () => {
	const resolved = await resolveTags(['React', 'react', '  REACT  '])

	expect(resolved).toHaveLength(1)
	expect(resolved[0]!.name).toBe('React')
	expect(await prisma.tag.count({ where: { slug: 'react' } })).toBe(1)
})

test('blank / punctuation-only names are dropped, never minting empty tags', async () => {
	const resolved = await resolveTags(['', '   ', '—', 'Design'])

	expect(resolved.map((t) => t.slug)).toEqual(['design'])
	expect(await prisma.tag.findUnique({ where: { slug: '' } })).toBeNull()
})
