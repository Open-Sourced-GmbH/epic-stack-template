import { expect, test } from 'vitest'
import { navSections } from '#app/routes/_marketing/__sections.ts'
import {
	isLinkActive,
	isSectionActive,
	resolveNavbar,
} from './app-shell-nav.ts'

// The landing in-page sections that lead the marketing nav, in declared order.
const SECTION_IDS = navSections.map((s) => s.id)

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

test('marketing + logged-out: section anchors + Blog, a guest CTA, accent picker present', () => {
	const nav = resolveNavbar({ variant: 'marketing', isLoggedIn: false })
	expect(nav.productLinks.map((l) => l.section)).toEqual([
		...SECTION_IDS,
		'blog',
	])
	expect(nav.account).toBe('cta')
	expect(nav.showAccentPicker).toBe(true)
})

test('marketing + logged-in: section anchors + Blog, the avatar, accent picker present', () => {
	const nav = resolveNavbar({ variant: 'marketing', isLoggedIn: true })
	expect(nav.productLinks.map((l) => l.section)).toEqual([
		...SECTION_IDS,
		'blog',
	])
	expect(nav.account).toBe('avatar')
	expect(nav.showAccentPicker).toBe(true)
})

test('marketing drops Über and carries the section anchors as scroll links → /#<id>', () => {
	const links = resolveNavbar({ variant: 'marketing', isLoggedIn: false })
		.productLinks
	expect(links.map((l) => l.section)).not.toContain('about')
	for (const id of SECTION_IDS) {
		const link = links.find((l) => l.section === id)
		expect(link?.to).toBe(`/#${id}`)
		expect(link?.anchorId).toBe(id)
	}
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
	const links = resolveNavbar({ variant: 'marketing', isLoggedIn: true })
		.productLinks
	const blog = links.find((l) => l.section === 'blog')
	expect(isSectionActive('/blog', blog!)).toBe(true)
	expect(isSectionActive('/blog/some-post', blog!)).toBe(true)
	expect(isSectionActive('/blogroll', blog!)).toBe(false)
})

test('anchor links are never pathname-active — scrollspy drives them', () => {
	const links = resolveNavbar({ variant: 'marketing', isLoggedIn: true })
		.productLinks
	const [firstAnchor] = links // the first section anchor leads the bar
	// On the landing root the anchor must NOT light up via the pathname.
	expect(isSectionActive('/', firstAnchor!)).toBe(false)
})

test('isLinkActive resolves anchors against the scrolled section, routes against the path', () => {
	const links = resolveNavbar({ variant: 'marketing', isLoggedIn: true })
		.productLinks
	const [firstAnchor] = links
	const blog = links.find((l) => l.section === 'blog')!
	const id = firstAnchor!.anchorId!

	// Anchor: active only when its section is the one in view.
	expect(isLinkActive(firstAnchor!, { pathname: '/', activeSection: id })).toBe(
		true,
	)
	expect(
		isLinkActive(firstAnchor!, { pathname: '/', activeSection: 'blog' }),
	).toBe(false)
	expect(isLinkActive(firstAnchor!, { pathname: '/', activeSection: null })).toBe(
		false,
	)

	// Route: active by pathname, regardless of the scrolled section.
	expect(isLinkActive(blog, { pathname: '/blog', activeSection: null })).toBe(
		true,
	)
	expect(isLinkActive(blog, { pathname: '/', activeSection: id })).toBe(false)
})

test('the full back-link never marks a work surface active (it points home)', () => {
	const [back] = resolveNavbar({ variant: 'full', isLoggedIn: true }).productLinks
	expect(isSectionActive('/admin/blog', back!)).toBe(false)
	expect(isSectionActive('/settings/profile', back!)).toBe(false)
})
