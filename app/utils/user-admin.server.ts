import { type Prisma } from '@prisma/client'
import { prisma } from './db.server.ts'

/**
 * The shape the admin user list (`/admin/users`) reads per row: enough to render
 * the avatar, name/email, role chips, status pill, and joined date. Each role
 * carries its granted permissions so the read module can mark the
 * management-granting ones for the elevated chip (see {@link isPrivilegedRole}).
 */
const adminUserSelect = {
	id: true,
	name: true,
	username: true,
	email: true,
	createdAt: true,
	deactivatedAt: true,
	image: { select: { objectKey: true } },
	roles: {
		select: {
			name: true,
			permissions: { select: { entity: true, access: true } },
		},
		orderBy: { name: 'asc' },
	},
} satisfies Prisma.UserSelect

type AdminUserRow = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>

/** A role as the list renders it — its name plus whether it grants management. */
export type AdminUserRole = { name: string; privileged: boolean }

/** One row of the admin user list — the clean DTO the route renders. */
export type AdminUser = {
	id: string
	name: string | null
	username: string
	email: string
	createdAt: Date
	/** Null = active; a timestamp marks a deactivated account. */
	deactivatedAt: Date | null
	image: { objectKey: string } | null
	roles: AdminUserRole[]
}

export type AdminUserList = {
	users: AdminUser[]
	/** Total matching users (the whole table, or the whole search) — drives counts. */
	total: number
	/** The current 1-based page (clamped to ≥ 1). */
	page: number
	/** Total number of pages (always ≥ 1) — drives the `Pagination` footer. */
	pageCount: number
	/** The active search term (trimmed), echoed back so the field can re-render it. */
	search: string
}

/** Page size for the admin user list (`/admin/users`). */
export const ADMIN_USERS_PER_PAGE = 10

/**
 * The access-management entities (ADR-069/070): a role granting any of these at
 * `any` scope can manage other people's access, which is what makes it a
 * "privileged" / management-granting role for the elevated chip.
 */
const MANAGEMENT_ENTITIES = ['user', 'audit'] as const

/**
 * Is this role management-granting? True when it holds any `:any`-access
 * permission over an access-management entity (so `admin` reads privileged but a
 * regular `:own`-only `user` role does not). Data-driven so it keeps working once
 * roles become editable (ADR-069) rather than hard-coding the `admin` name.
 */
function isPrivilegedRole(
	permissions: Array<{ entity: string; access: string }>,
): boolean {
	return permissions.some(
		(p) =>
			p.access === 'any' &&
			(MANAGEMENT_ENTITIES as readonly string[]).includes(p.entity),
	)
}

/** Project a queried row onto the clean {@link AdminUser} DTO the route renders. */
function toAdminUser(row: AdminUserRow): AdminUser {
	return {
		id: row.id,
		name: row.name,
		username: row.username,
		email: row.email,
		createdAt: row.createdAt,
		deactivatedAt: row.deactivatedAt,
		image: row.image,
		roles: row.roles.map((role) => ({
			name: role.name,
			privileged: isPrivilegedRole(role.permissions),
		})),
	}
}

/**
 * The admin user list: every user, newest-registered first, one page at a time,
 * optionally narrowed by a `search` over name and email. Mirrors
 * {@link getAllPostsForAdmin} — the read module owns page clamping (a junk
 * `?page=` resolves to page 1) and the `total` is a real whole-result `count`
 * (the whole table, or the whole search) so the header count stays honest while
 * the `Pagination` footer walks the rows. SQLite's `LIKE` is case-insensitive
 * for ASCII, so `contains` matches regardless of case without a `mode` hint.
 */
export async function getUsersForAdmin({
	page = 1,
	search = '',
	perPage = ADMIN_USERS_PER_PAGE,
}: {
	page?: number
	search?: string
	perPage?: number
} = {}): Promise<AdminUserList> {
	const currentPage = Math.max(1, Math.floor(page) || 1)
	const term = search.trim()
	const where: Prisma.UserWhereInput = term
		? { OR: [{ name: { contains: term } }, { email: { contains: term } }] }
		: {}

	const [total, rows] = await Promise.all([
		prisma.user.count({ where }),
		prisma.user.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			skip: (currentPage - 1) * perPage,
			take: perPage,
			select: adminUserSelect,
		}),
	])

	return {
		users: rows.map(toAdminUser),
		total,
		page: currentPage,
		pageCount: Math.max(1, Math.ceil(total / perPage)),
		search: term,
	}
}
