/**
 * The pure visibility logic behind the universal {@link AppShell} navbar
 * (ADR-068). Given the auth state, role, and navbar variant it returns exactly
 * what the chrome renders — which product links, whether the right cluster shows
 * the avatar dropdown or a Log In button, and whether the accent picker rides
 * along. Keeping this a plain function (no React, no router) is what lets the
 * navbar matrix be pinned by a table-driven unit test, so the rendering stays a
 * thin projection of these decisions.
 */

/**
 * `full` is the whole-product chrome (account/admin work surfaces); `marketing`
 * is the public product chrome (landing/blog); `minimal` is the auth
 * pass-through.
 */
export type NavbarVariant = 'full' | 'minimal' | 'marketing'

/** The product sections the navbar can link to. */
export type NavSection = 'about' | 'blog' | 'admin'

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
}

const ABOUT_LINK: ProductLink = {
	section: 'about',
	to: '/about',
	label: 'Über',
	match: '/about',
}

const BLOG_LINK: ProductLink = {
	section: 'blog',
	to: '/blog',
	label: 'Blog',
	match: '/blog',
}

const ADMIN_LINK: ProductLink = {
	section: 'admin',
	to: '/admin/blog',
	label: 'Admin',
	match: '/admin',
}

export type NavbarVisibility = {
	productLinks: Array<ProductLink>
	account: NavbarAccount
	showAccentPicker: boolean
}

/**
 * Resolve the navbar's visible affordances from auth state, role, and variant.
 *
 * - `full`: Blog always, Admin only for the admin role; avatar when logged in
 *   else a Log In button; the accent picker is always present (the
 *   whole-product accent showcase, ADR-062/067).
 * - `marketing` (landing/blog): the public product links Über + Blog; avatar
 *   when logged in else the „Los geht's" guest CTA (→ signup); the accent picker
 *   rides along on desktop, consistent with `full`.
 * - `minimal` (auth): logo + theme toggle only — no links, no identity slot, no
 *   accent picker, whatever the auth state (the ADR-062/067 accent boundary).
 */
export function resolveNavbar({
	variant,
	isLoggedIn,
	isAdmin,
}: {
	variant: NavbarVariant
	isLoggedIn: boolean
	isAdmin: boolean
}): NavbarVisibility {
	if (variant === 'minimal') {
		return { productLinks: [], account: 'none', showAccentPicker: false }
	}
	if (variant === 'marketing') {
		return {
			productLinks: [ABOUT_LINK, BLOG_LINK],
			account: isLoggedIn ? 'avatar' : 'cta',
			showAccentPicker: true,
		}
	}
	return {
		productLinks: isAdmin ? [BLOG_LINK, ADMIN_LINK] : [BLOG_LINK],
		account: isLoggedIn ? 'avatar' : 'login',
		showAccentPicker: true,
	}
}

/** True when `pathname` is within a product link's section (the link or a child). */
export function isSectionActive(pathname: string, link: ProductLink) {
	return pathname === link.match || pathname.startsWith(`${link.match}/`)
}
