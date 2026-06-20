import { expect, test } from 'vitest'
import { renderPostBody } from '#app/utils/markdown.server.ts'
import { samplePosts } from '../../prisma/sample-posts.ts'

// The sample posts are the seed fixtures that prove the whole ②a pipeline on a
// fresh clone (EPT-44). These tests pin the AC invariants the fixtures must keep
// — they're DB-free, asserting the data shape and that every body survives the
// real public render pipeline (`renderPostBody`), so the seed can never ship
// content the public surfaces would silently drop.

const published = samplePosts.filter((post) => post.publishedAt !== null)
const drafts = samplePosts.filter((post) => post.publishedAt === null)

test('seeds three sample posts', () => {
	expect(samplePosts).toHaveLength(3)
})

test('includes at least one Draft and two Published posts', () => {
	expect(drafts.length).toBeGreaterThanOrEqual(1)
	expect(published.length).toBeGreaterThanOrEqual(2)
})

test('Published posts carry distinct publication dates so ordering is visible', () => {
	const stamps = published.map((post) => post.publishedAt!.getTime())
	expect(new Set(stamps).size).toBe(stamps.length)
})

test('at least one post ships a cover image', () => {
	expect(samplePosts.some((post) => post.cover)).toBe(true)
})

test('at least one body contains a fenced code block', () => {
	const fenced = samplePosts.filter((post) => /```/.test(post.body))
	expect(fenced.length).toBeGreaterThanOrEqual(1)
})

test('at least two posts share a tag, so the tag archive lists more than one', () => {
	const counts = new Map<string, number>()
	for (const post of samplePosts) {
		for (const tag of post.tags) {
			counts.set(tag.slug, (counts.get(tag.slug) ?? 0) + 1)
		}
	}
	const shared = [...counts.values()].filter((count) => count >= 2)
	expect(shared.length).toBeGreaterThanOrEqual(1)
})

test('slugs are unique', () => {
	const slugs = samplePosts.map((post) => post.slug)
	expect(new Set(slugs).size).toBe(slugs.length)
})

test('every body renders through the public pipeline without dropping content', async () => {
	for (const post of samplePosts) {
		const html = await renderPostBody(post.body)
		expect(html.length).toBeGreaterThan(0)

		// The sanitiser silently strips anything it dislikes; assert author intent
		// survives by checking every Markdown link URL made it into the HTML.
		const links = [...post.body.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map(
			(match) => match[1]!,
		)
		for (const url of links) {
			expect(html).toContain(url)
		}
	}
})

test('a fenced code body highlights to a <pre> block', async () => {
	const fenced = samplePosts.find((post) => /```/.test(post.body))!
	const html = await renderPostBody(fenced.body)
	expect(html).toContain('<pre')
})
