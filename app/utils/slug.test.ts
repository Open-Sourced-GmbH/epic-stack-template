import { expect, test } from 'vitest'
import {
	canApplySlug,
	isSlugLocked,
	isSlugTaken,
	resolveSlug,
	slugify,
} from './slug.ts'

test('slugify lowercases and hyphenates whitespace', () => {
	expect(slugify('Hello World')).toBe('hello-world')
})

test('slugify strips diacritics, punctuation, and edge hyphens', () => {
	expect(slugify('  Héllo, Wörld!  ')).toBe('hello-world')
	expect(slugify('Rust & Go: a tale')).toBe('rust-go-a-tale')
	expect(slugify('already-a-slug')).toBe('already-a-slug')
})

test('isSlugTaken: a free slug (no owner) is never taken', () => {
	expect(isSlugTaken({ ownerId: null, editingId: undefined })).toBe(false)
})

test('isSlugTaken: a slug owned by another post collides', () => {
	expect(isSlugTaken({ ownerId: 'other-post', editingId: undefined })).toBe(true)
	expect(isSlugTaken({ ownerId: 'other-post', editingId: 'this-post' })).toBe(
		true,
	)
})

test('isSlugTaken: re-saving a post with its own slug is not a collision', () => {
	expect(isSlugTaken({ ownerId: 'this-post', editingId: 'this-post' })).toBe(
		false,
	)
})

test('isSlugLocked: only a published post freezes its slug', () => {
	expect(isSlugLocked({ publishedAt: new Date('2026-01-01') })).toBe(true)
	expect(isSlugLocked({ publishedAt: null })).toBe(false)
})

test('canApplySlug: creating (no existing post) always allows the slug', () => {
	expect(canApplySlug(null, 'anything')).toBe(true)
})

test('canApplySlug: a draft may freely re-slug', () => {
	const draft = { slug: 'old', publishedAt: null }
	expect(canApplySlug(draft, 'new')).toBe(true)
})

test('canApplySlug: a published post may only keep its slug', () => {
	const published = { slug: 'frozen', publishedAt: new Date('2026-01-01') }
	expect(canApplySlug(published, 'frozen')).toBe(true)
	expect(canApplySlug(published, 'changed')).toBe(false)
})

test('resolveSlug: uses the typed slug when present, normalized', () => {
	expect(resolveSlug({ desired: 'My Custom Slug', title: 'Ignored' })).toBe(
		'my-custom-slug',
	)
})

test('resolveSlug: falls back to the title when no slug is typed', () => {
	expect(resolveSlug({ desired: '', title: 'A Fresh Post' })).toBe(
		'a-fresh-post',
	)
	expect(resolveSlug({ desired: '   ', title: 'A Fresh Post' })).toBe(
		'a-fresh-post',
	)
	expect(resolveSlug({ desired: undefined, title: 'A Fresh Post' })).toBe(
		'a-fresh-post',
	)
})
