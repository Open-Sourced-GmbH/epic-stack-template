/**
 * The pure visibility logic behind the universal {@link AppShell} navbar
 * (ADR-068). Given the auth state, role, and navbar variant it returns exactly
 * what the chrome renders — which product links, whether the right cluster shows
 * the avatar dropdown or a Log In button, and whether the accent picker rides
 * along. Keeping this a plain function (no React, no router) is what lets the
 * navbar matrix be pinned by a table-driven unit test, so the rendering stays a
 * thin projection of these decisions.
 */

import { navSections } from '#app/routes/_marketing/__sections.ts'

/**
 * `full` is the whole-product chrome (account/admin work surfaces); `marketing`
 * is the public product chrome (landing/blog); `minimal` is the auth
 * pass-through.
 */
export type NavbarVariant = 'full' | 'minimal' | 'marketing'

/**
 * The product sections the navbar can link to. The landing in-page sections
 * (`work`/`services`/… — the `navSections` ids) ride the `marketing` variant as
 * scroll-anchor links; `blog` is a route link; `back` is the lone `full`-variant
 * affordance — the „Zurück zur Website" link out of the work surfaces, not a
 * product section that can ever be "active".
 */
export type NavSection =
	| (typeof navSections)[number]['id']
	| 'blog'
	| 'back'

/**
 * What the navbar's right-cluster identity slot shows: the avatar dropdown when
 * logged in, a Log In button (`full` guest), the „Los geht's" guest CTA
 * (`marketing` guest), or nothing (`minimal`).
 */
export type NavbarAccount = 'avatar' | 'login' | 'cta' | 'none'

export type ProductLink = {
	/** Stable key + active-section identity. */
	section: NavSection
	/** Where the link navigates. */
	to: string
	label: string
	/**
	 * The path prefix that marks this section active. It can differ from `to`
	 * (Admin links to `/admin/blog` but owns the whole `/admin` section).
	 */
	match: string
	/**
	 * Set when the link targets an in-page landing section (`/#<anchorId>`). Such
	 * links are scrollspy-driven: their active state is whichever section is in
	 * view, not the pathname — so {@link isSectionActive} always reports them
	 * inactive and {@link isLinkActive} resolves them against the observed section.
	 */
	anchorId?: string
}

/**
 * The landing's in-page sections as navbar scroll-anchor links, one per
 * {@link navSections} entry (the single source the landing render loop and the
 * ⌘K palette also read). They lead the `marketing` nav and link to `/#<id>`, so
 * they jump to the section from the landing and navigate home-then-scroll from
 * the blog.
 */
const SECTION_LINKS: Array<ProductLink> = navSections.map((section) => ({
	section: section.id,
	to: `/#${section.id}`,
	label: section.label,
	// Anchors are scrollspy-driven; `match` is unused for them but kept for shape.
	match: `/#${section.id}`,
	anchorId: section.id,
}))

const BLOG_LINK: ProductLink = {
	section: 'blog',
	to: '/blog',
	label: 'Blog',
	match: '/blog',
}

const BACK_LINK: ProductLink = {
	section: 'back',
	to: '/',
	label: 'Zurück zur Website',
	// `/` would only ever match the marketing index, so the back-link stays inert
	// on every work surface — it's a way out, never a highlighted section.
	match: '/',
}

export type NavbarVisibility = {
	productLinks: Array<ProductLink>
	account: NavbarAccount
	showAccentPicker: boolean
}

/**
 * Resolve the navbar's visible affordances from auth state and variant.
 *
 * - `full` (account/admin work surfaces): the top links collapse to a single
 *   „Zurück zur Website" back-link → `/`; Blog lives under the marketing nav and
 *   Admin is reached via the avatar dropdown (role-gated there) and the section
 *   sidebar, so neither is a top product link. Avatar when logged in else a Log
 *   In button; the accent picker is always present (the whole-product accent
 *   showcase, ADR-062/067).
 * - `marketing` (landing/blog): the landing's in-page section anchors
 *   ({@link SECTION_LINKS}) followed by the Blog route link; avatar when logged
 *   in else the „Los geht's" guest CTA (→ signup); the accent picker rides along
 *   on desktop, consistent with `full`. (Über is dropped from the bar — it stays
 *   reachable from the footer sitemap.)
 * - `minimal` (auth): logo + theme toggle only — no links, no identity slot, no
 *   accent picker, whatever the auth state (the ADR-062/067 accent boundary).
 */
export function resolveNavbar({
	variant,
	isLoggedIn,
}: {
	variant: NavbarVariant
	isLoggedIn: boolean
}): NavbarVisibility {
	if (variant === 'minimal') {
		return { productLinks: [], account: 'none', showAccentPicker: false }
	}
	if (variant === 'marketing') {
		return {
			productLinks: [...SECTION_LINKS, BLOG_LINK],
			account: isLoggedIn ? 'avatar' : 'cta',
			showAccentPicker: true,
		}
	}
	return {
		productLinks: [BACK_LINK],
		account: isLoggedIn ? 'avatar' : 'login',
		showAccentPicker: true,
	}
}

/**
 * True when `pathname` is within a route link's section (the link or a child).
 * Anchor links (in-page landing sections) are never pathname-active — their
 * highlight is scrollspy-driven via {@link isLinkActive}.
 */
export function isSectionActive(pathname: string, link: ProductLink) {
	if (link.anchorId) return false
	return pathname === link.match || pathname.startsWith(`${link.match}/`)
}

/**
 * Whether a product link reads as active: anchor links match the section
 * currently in view (`activeSection`, from the navbar's scrollspy), route links
 * match the pathname. One resolver so the desktop bar and the mobile drawer
 * highlight identically.
 */
export function isLinkActive(
	link: ProductLink,
	{ pathname, activeSection }: { pathname: string; activeSection: string | null },
) {
	return link.anchorId
		? link.anchorId === activeSection
		: isSectionActive(pathname, link)
}

/**
 * The guest call-to-action link for an identity slot, or `null` when the slot
 * isn't a guest CTA (the avatar dropdown / none). One source for the button the
 * navbar right-cluster and the mobile drawer both render: `cta` (marketing) →
 * the „Los geht's" signup nudge, `login` (full) → the Log In link.
 */
export function accountCtaLink(
	account: NavbarAccount,
): { to: string; label: string } | null {
	if (account === 'cta') return { to: '/signup', label: "Los geht's" }
	if (account === 'login') return { to: '/login', label: 'Log In' }
	return null
}
