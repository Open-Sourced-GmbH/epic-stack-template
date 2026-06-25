import { expect, test } from 'vitest'
import { isSectionActive, resolveNavbar } from './app-shell-nav.ts'

// The navbar's visibility is a pure function of auth state and variant —
// table-driven so every cell of the matrix is pinned (ADR-068 §navbar).
const sectionsOf = (variant: 'full' | 'minimal' | 'marketing', isLoggedIn: boolean) =>
	resolveNavbar({ variant, isLoggedIn }).productLinks.map((l) => l.section)

test('full + logged-out: a single back-link, a Log In button, accent picker present', () => {
	const nav = resolveNavbar({ variant: 'full', isLoggedIn: false })
	expect(nav.productLinks.map((l) => l.section)).toEqual(['back'])
	expect(nav.account).toBe('login')
	expect(nav.showAccentPicker).toBe(true)
})

test('full + logged-in: a single back-link + avatar, no Blog/Admin top links', () => {
	const nav = resolveNavbar({ variant: 'full', isLoggedIn: true })
	expect(nav.productLinks.map((l) => l.section)).toEqual(['back'])
	expect(nav.account).toBe('avatar')
	expect(nav.showAccentPicker).toBe(true)
})

test('the full back-link points home with the „Zurück zur Website" label', () => {
	const [back] = resolveNavbar({ variant: 'full', isLoggedIn: true }).productLinks
	expect(back?.to).toBe('/')
	expect(back?.label).toBe('Zurück zur Website')
})

test('the full IA never exposes Blog or Admin as a top product link', () => {
	for (const isLoggedIn of [false, true]) {
		const sections = sectionsOf('full', isLoggedIn)
		expect(sections).toEqual(['back'])
		expect(sections).not.toContain('blog')
		expect(sections).not.toContain('admin')
	}
})

test('marketing + logged-out: Über + Blog links, a guest CTA, accent picker present', () => {
	const nav = resolveNavbar({ variant: 'marketing', isLoggedIn: false })
	expect(nav.productLinks.map((l) => l.section)).toEqual(['about', 'blog'])
	expect(nav.account).toBe('cta')
	expect(nav.showAccentPicker).toBe(true)
})

test('marketing + logged-in: Über + Blog links, the avatar, accent picker present', () => {
	const nav = resolveNavbar({ variant: 'marketing', isLoggedIn: true })
	expect(nav.productLinks.map((l) => l.section)).toEqual(['about', 'blog'])
	expect(nav.account).toBe('avatar')
	expect(nav.showAccentPicker).toBe(true)
})

test('minimal: no links, no avatar/login, no accent picker — regardless of auth', () => {
	for (const isLoggedIn of [false, true]) {
		const nav = resolveNavbar({ variant: 'minimal', isLoggedIn })
		expect(nav.productLinks).toEqual([])
		expect(nav.account).toBe('none')
		expect(nav.showAccentPicker).toBe(false)
	}
})

test('isSectionActive matches the section root and its children, not siblings', () => {
	const [, blog] = resolveNavbar({ variant: 'marketing', isLoggedIn: true }).productLinks
	expect(isSectionActive('/blog', blog!)).toBe(true)
	expect(isSectionActive('/blog/some-post', blog!)).toBe(true)
	expect(isSectionActive('/blogroll', blog!)).toBe(false)
})

test('the full back-link never marks a work surface active (it points home)', () => {
	const [back] = resolveNavbar({ variant: 'full', isLoggedIn: true }).productLinks
	expect(isSectionActive('/admin/blog', back!)).toBe(false)
	expect(isSectionActive('/settings/profile', back!)).toBe(false)
})
