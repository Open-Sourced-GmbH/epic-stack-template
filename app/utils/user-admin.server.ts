import { invariantResponse } from '@epic-web/invariant'
import { type Prisma } from '@prisma/client'
import { adminFloorHolds } from './admin-floor.ts'
import {
	type AuditActor,
	labelForActor,
	recordAuditEvent,
} from './audit.server.ts'
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

/**
 * Thrown when a role change would breach the admin-floor invariant (ADR-069):
 * dropping the system below one user who can manage both users and roles. The
 * route action catches this and surfaces the explanatory blocked-operation dialog
 * rather than letting it become a generic 500.
 */
export class AdminFloorError extends Error {
	constructor(
		message = 'This change would remove the last administrator who can manage users and roles.',
	) {
		super(message)
		this.name = 'AdminFloorError'
	}
}

/**
 * Set a user's roles to exactly `roleNames` (the first user mutation, EPT-88).
 * Names resolve to **existing** roles only — a name with no matching `Role` row is
 * dropped (the editor offers existing roles, never free-text create). The diff
 * against the user's current roles yields the grants/revokes, each recorded as an
 * Audit Event (ADR-070).
 *
 * Guarded by the admin-floor invariant (ADR-069): the assert runs inside the same
 * transaction over the *post-change* world, so a revoke that would remove the last
 * capable admin throws {@link AdminFloorError} and rolls the change back. Only a
 * revoke can breach the floor, but the assert runs unconditionally to keep the
 * rule in one place. Returns the applied delta for the caller's response/toast.
 */
export async function setUserRoles({
	userId,
	roleNames,
	actor,
}: {
	userId: string
	roleNames: string[]
	actor: AuditActor
}): Promise<{ added: string[]; removed: string[] }> {
	const { target, added, removed } = await prisma.$transaction(async (tx) => {
		const target = await tx.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				name: true,
				username: true,
				email: true,
				roles: {
					select: {
						id: true,
						name: true,
						permissions: { select: { entity: true, access: true } },
					},
				},
			},
		})
		invariantResponse(target, 'User not found', { status: 404 })

		// Resolve to existing roles only; carry their permissions for the floor check.
		const nextRoles = await tx.role.findMany({
			where: { name: { in: roleNames } },
			select: {
				id: true,
				name: true,
				permissions: { select: { entity: true, access: true } },
			},
		})

		const currentNames = new Set(target.roles.map((r) => r.name))
		const nextNames = new Set(nextRoles.map((r) => r.name))
		const added = nextRoles
			.filter((r) => !currentNames.has(r.name))
			.map((r) => r.name)
		const removed = target.roles
			.filter((r) => !nextNames.has(r.name))
			.map((r) => r.name)

		// Nothing changed — skip the write (and the floor check) entirely.
		if (added.length === 0 && removed.length === 0) {
			return { target, added, removed }
		}

		// Assert the floor only when *this change* would breach it: it must have held
		// before but not after. (An already-floorless system — e.g. a fresh DB with no
		// admin — must not freeze every unrelated edit.) Only the target's capability
		// can change, so build both worlds from the other users plus the target's
		// current vs. proposed roles.
		const others = await tx.user.findMany({
			where: { id: { not: userId } },
			select: {
				roles: { select: { permissions: { select: { entity: true, access: true } } } },
			},
		})
		const heldBefore = adminFloorHolds([...others, { roles: target.roles }])
		const holdsAfter = adminFloorHolds([...others, { roles: nextRoles }])
		if (heldBefore && !holdsAfter) {
			throw new AdminFloorError()
		}

		await tx.user.update({
			where: { id: userId },
			data: { roles: { set: nextRoles.map((r) => ({ id: r.id })) } },
		})

		return { target, added, removed }
	})

	// Record the trail through the one audit seam (append-only, so a post-commit
	// write is fine — the role change is already durable). The writes are
	// independent, so fan them out together.
	const targetRef = { id: target.id, type: 'user', label: labelForActor(target) }
	await Promise.all([
		...added.map((role) =>
			recordAuditEvent({
				event: 'role.granted',
				actor,
				target: targetRef,
				details: { role },
			}),
		),
		...removed.map((role) =>
			recordAuditEvent({
				event: 'role.revoked',
				actor,
				target: targetRef,
				details: { role },
			}),
		),
	])

	return { added, removed }
}
