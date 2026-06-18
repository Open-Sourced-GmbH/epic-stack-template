import { expect, test } from 'vitest'
import {
	filterCommands,
	groupCommands,
	type Command,
} from './command.matcher.ts'

const nav = (
	id: string,
	title: string,
	extra: { group?: string; keywords?: string[] } = {},
): Command => ({ id, title, group: 'Navigation', href: `/${id}`, ...extra })

test('empty query returns the full registry in original order', () => {
	const commands = [nav('home', 'Home'), nav('blog', 'Blog')]
	expect(filterCommands('', commands).map((c) => c.id)).toEqual(['home', 'blog'])
})

test('a whitespace-only query is treated as empty', () => {
	const commands = [nav('home', 'Home'), nav('blog', 'Blog')]
	expect(filterCommands('   ', commands).map((c) => c.id)).toEqual([
		'home',
		'blog',
	])
})

test('a query keeps only commands whose title matches, case-insensitively', () => {
	const commands = [nav('home', 'Home'), nav('blog', 'Blog')]
	expect(filterCommands('HO', commands).map((c) => c.id)).toEqual(['home'])
})

test('a query that matches nothing returns an empty array', () => {
	const commands = [nav('home', 'Home'), nav('blog', 'Blog')]
	expect(filterCommands('zzz', commands)).toEqual([])
})

test('a command matches on a keyword the title does not contain', () => {
	const commands = [
		nav('home', 'Home'),
		nav('blog', 'Writing', { keywords: ['blog', 'posts'] }),
	]
	expect(filterCommands('blog', commands).map((c) => c.id)).toEqual(['blog'])
})

test('within a group, prefix beats substring beats keyword-only', () => {
	const commands = [
		nav('kw', 'Unrelated', { keywords: ['report'] }), // keyword-only
		nav('sub', 'Daily report'), // substring
		nav('pre', 'Report builder'), // prefix
	]
	expect(filterCommands('report', commands).map((c) => c.id)).toEqual([
		'pre',
		'sub',
		'kw',
	])
})

test('commands of equal rank keep their original registry order', () => {
	const commands = [nav('a', 'Report A'), nav('b', 'Report B')]
	expect(filterCommands('report', commands).map((c) => c.id)).toEqual([
		'a',
		'b',
	])
})

test('results are grouped by group in first-appearance order', () => {
	const commands = [
		nav('home', 'Home', { group: 'Navigation' }),
		nav('theme', 'Theme', { group: 'Actions' }),
		nav('blog', 'Blog', { group: 'Navigation' }),
	]
	// Interleaved input, empty query: groups become contiguous, Navigation first.
	expect(filterCommands('', commands).map((c) => c.id)).toEqual([
		'home',
		'blog',
		'theme',
	])
})

test('ranking is applied within a group, not across groups', () => {
	const commands = [
		nav('navSub', 'Daily report', { group: 'Navigation' }), // substring
		nav('actPre', 'Report builder', { group: 'Actions' }), // prefix, later group
	]
	// The better-ranked Actions command does not jump ahead of its group.
	expect(filterCommands('report', commands).map((c) => c.id)).toEqual([
		'navSub',
		'actPre',
	])
})

test('groupCommands splits an ordered list into sections, preserving order', () => {
	const ordered = [
		nav('home', 'Home', { group: 'Navigation' }),
		nav('blog', 'Blog', { group: 'Navigation' }),
		nav('theme', 'Theme', { group: 'Actions' }),
	]
	expect(
		groupCommands(ordered).map((s) => ({
			group: s.group,
			ids: s.commands.map((c) => c.id),
		})),
	).toEqual([
		{ group: 'Navigation', ids: ['home', 'blog'] },
		{ group: 'Actions', ids: ['theme'] },
	])
})

test('groupCommands returns no sections for an empty list', () => {
	expect(groupCommands([])).toEqual([])
})
