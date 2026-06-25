import { expect, test } from 'vitest'
import { isSectionActive, resolveNavbar } from './app-shell-nav.ts'

// The navbar's visibility is a pure function of auth state, role, and variant —
// table-driven so every cell of the matrix is pinned (ADR-068 §navbar).
const sectionsOf = (
	variant: 'full' | 'minimal' | 'marketing',
	isLoggedIn: boolean,
	isAdmin: boolean,
) => resolveNavbar({ variant, isLoggedIn, isAdmin }).productLinks.map((l) => l.section)

test('full + logged-out: Blog only, a Log In button, accent picker present', () => {
	const nav = resolveNavbar({ variant: 'full', isLoggedIn: false, isAdmin: false })
	expect(nav.productLinks.map((l) => l.section)).toEqual(['blog'])
	expect(nav.account).toBe('login')
	expect(nav.showAccentPicker).toBe(true)
})

test('full + logged-in non-admin: Blog + avatar, no Admin link', () => {
	const nav = resolveNavbar({ variant: 'full', isLoggedIn: true, isAdmin: false })
	expect(nav.productLinks.map((l) => l.section)).toEqual(['blog'])
	expect(nav.account).toBe('avatar')
	expect(nav.showAccentPicker).toBe(true)
})

test('full + logged-in admin: Blog + Admin + avatar', () => {
	const nav = resolveNavbar({ variant: 'full', isLoggedIn: true, isAdmin: true })
	expect(nav.productLinks.map((l) => l.section)).toEqual(['blog', 'admin'])
	expect(nav.account).toBe('avatar')
	expect(nav.showAccentPicker).toBe(true)
})

test('marketing + logged-out: Über + Blog links, a guest CTA, accent picker present', () => {
	const nav = resolveNavbar({
		variant: 'marketing',
		isLoggedIn: false,
		isAdmin: false,
	})
	expect(nav.productLinks.map((l) => l.section)).toEqual(['about', 'blog'])
	expect(nav.account).toBe('cta')
	expect(nav.showAccentPicker).toBe(true)
})

test('marketing + logged-in: Über + Blog links, the avatar, accent picker present', () => {
	for (const isAdmin of [false, true]) {
		const nav = resolveNavbar({
			variant: 'marketing',
			isLoggedIn: true,
			isAdmin,
		})
		// Marketing IA never gates an Admin top link — admin is reached elsewhere.
		expect(nav.productLinks.map((l) => l.section)).toEqual(['about', 'blog'])
		expect(nav.account).toBe('avatar')
		expect(nav.showAccentPicker).toBe(true)
	}
})

test('minimal: no links, no avatar/login, no accent picker — regardless of auth', () => {
	for (const isLoggedIn of [false, true]) {
		for (const isAdmin of [false, true]) {
			const nav = resolveNavbar({ variant: 'minimal', isLoggedIn, isAdmin })
			expect(nav.productLinks).toEqual([])
			expect(nav.account).toBe('none')
			expect(nav.showAccentPicker).toBe(false)
		}
	}
})

test('the Admin link is gated strictly on the admin role, not merely being logged in', () => {
	expect(sectionsOf('full', true, false)).not.toContain('admin')
	expect(sectionsOf('full', true, true)).toContain('admin')
})

test('isSectionActive matches the section root and its children, not siblings', () => {
	const [blog, admin] = resolveNavbar({
		variant: 'full',
		isLoggedIn: true,
		isAdmin: true,
	}).productLinks
	expect(isSectionActive('/blog', blog!)).toBe(true)
	expect(isSectionActive('/blog/some-post', blog!)).toBe(true)
	expect(isSectionActive('/blogroll', blog!)).toBe(false)
	// Admin owns all of /admin even though its link targets /admin/blog.
	expect(isSectionActive('/admin/cache', admin!)).toBe(true)
	expect(isSectionActive('/blog', admin!)).toBe(false)
})
