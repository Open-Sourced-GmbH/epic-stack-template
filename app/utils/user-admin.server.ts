import { invariantResponse } from '@epic-web/invariant'
import { type Prisma } from '@prisma/client'
import { createElement } from 'react'
import { ForgotPasswordEmail } from '#app/components/emails/forgot-password.tsx'
import { adminFloorHolds } from './admin-floor.ts'
import {
	type AuditActor,
	labelForActor,
	recordAuditEvent,
} from './audit.server.ts'
import { prisma } from './db.server.ts'
import { sendEmail } from './email.server.ts'
import { prepareVerification } from './verification.server.ts'

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
			id: true,
			name: true,
			permissions: { select: { entity: true, access: true } },
		},
		orderBy: { name: 'asc' },
	},
} satisfies Prisma.UserSelect

type AdminUserRow = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>

/** A role as the list renders it — its id/name plus whether it grants management. */
export type AdminUserRole = { id: string; name: string; privileged: boolean }

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
			id: role.id,
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
 * Thrown when an admin tries to deactivate their own account. Self-deactivation is
 * always refused — it can't strand the admin floor by accident, and locking
 * yourself out is never the intent. The detail route also hides the control for
 * your own account, so this is the data-layer backstop.
 */
export class SelfDeactivationError extends Error {
	constructor(message = 'You can’t deactivate your own account.') {
		super(message)
		this.name = 'SelfDeactivationError'
	}
}

/**
 * Thrown when an admin tries to delete their own account (EPT-94). Like
 * self-deactivation this is always refused — deleting yourself is irreversible and
 * never the intent. The detail route also hides the control for your own account,
 * so this is the data-layer backstop.
 */
export class SelfDeletionError extends Error {
	constructor(message = 'You can’t delete your own account.') {
		super(message)
		this.name = 'SelfDeletionError'
	}
}

/**
 * Deactivate (or reactivate) a user (EPT-92). Deactivating stamps
 * `User.deactivatedAt` **and deletes the user's** `Session` **rows**, so they are
 * logged out at once (`getUserId` fails immediately) and the auth path's `login()`
 * then refuses to sign them back in. Their content (posts, etc.) is left untouched.
 * Reactivating clears the timestamp. Each transition records an Audit Event
 * (ADR-070); a no-op (already in the requested state) writes nothing.
 *
 * Two guards (ADR-069): self-deactivation throws {@link SelfDeactivationError}, and
 * deactivating the last capable admin throws {@link AdminFloorError}. The floor
 * assert runs inside the transaction over the *post-change* world and counts only
 * **active** other admins — a deactivated admin can't act, so they can't hold the
 * floor. Reactivation can only add a capable admin back, so it never breaches.
 */
export async function setUserDeactivated({
	userId,
	deactivated,
	actor,
}: {
	userId: string
	deactivated: boolean
	actor: AuditActor
}): Promise<{ deactivated: boolean }> {
	// Refuse self-deactivation up front — never let an admin lock themselves out.
	if (deactivated && actor.id === userId) {
		throw new SelfDeactivationError()
	}

	const { target, changed } = await prisma.$transaction(async (tx) => {
		const target = await tx.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				name: true,
				username: true,
				email: true,
				deactivatedAt: true,
				roles: {
					select: { permissions: { select: { entity: true, access: true } } },
				},
			},
		})
		invariantResponse(target, 'User not found', { status: 404 })

		// Already in the requested state — skip the write, the floor check, and audit.
		if ((target.deactivatedAt != null) === deactivated) {
			return { target, changed: false }
		}

		if (deactivated) {
			// Only *active* other users can hold the floor — a deactivated admin can't
			// act. Assert solely when this change would breach it (held before, not after).
			const others = await tx.user.findMany({
				where: { id: { not: userId }, deactivatedAt: null },
				select: {
					roles: {
						select: { permissions: { select: { entity: true, access: true } } },
					},
				},
			})
			const heldBefore = adminFloorHolds([...others, { roles: target.roles }])
			const holdsAfter = adminFloorHolds(others)
			if (heldBefore && !holdsAfter) {
				throw new AdminFloorError(
					'This change would remove the last administrator who can manage users and roles.',
				)
			}
		}

		await tx.user.update({
			where: { id: userId },
			data: {
				deactivatedAt: deactivated ? new Date() : null,
				// Deactivation revokes access immediately by dropping live sessions.
				...(deactivated ? { sessions: { deleteMany: {} } } : {}),
			},
		})

		return { target, changed: true }
	})

	// Append-only, so a post-commit write is fine — the change is already durable.
	if (changed) {
		await recordAuditEvent({
			event: deactivated ? 'user.deactivated' : 'user.reactivated',
			actor,
			target: { id: target.id, type: 'user', label: labelForActor(target) },
		})
	}

	return { deactivated }
}

/**
 * Force-log-out a user (EPT-94): delete every one of their `Session` rows so the
 * next request fails `getUserId` and they must re-authenticate. Unlike
 * {@link setUserDeactivated} this leaves `deactivatedAt` untouched — the account
 * stays active and can sign straight back in. Records a `user.sessions.revoked`
 * Audit Event (ADR-070) and returns how many sessions were killed. No floor or
 * self guard: logging someone out can't strand the admin floor.
 */
export async function revokeUserSessions({
	userId,
	actor,
}: {
	userId: string
	actor: AuditActor
}): Promise<{ count: number }> {
	// The label lookup and the session purge are independent (the delete keys off
	// `userId`, not the lookup) — fire them together.
	const [target, { count }] = await Promise.all([
		prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, name: true, username: true, email: true },
		}),
		prisma.session.deleteMany({ where: { userId } }),
	])
	invariantResponse(target, 'User not found', { status: 404 })

	await recordAuditEvent({
		event: 'user.sessions.revoked',
		actor,
		target: { id: target.id, type: 'user', label: labelForActor(target) },
	})

	return { count }
}

/**
 * Permanently delete a user (EPT-94). The delete is the existing irreversible
 * cascade — sessions, password, images, connections and passkeys go with the row
 * — while authored `Post`s survive with their author credit blanked (`SetNull`).
 * Records a `user.deleted` Audit Event (ADR-070), its label snapshotted *before*
 * the row is gone so the trail outlives the account.
 *
 * Two guards (ADR-069): self-deletion throws {@link SelfDeletionError}, and
 * deleting the last capable admin throws {@link AdminFloorError}. The floor assert
 * runs inside the transaction over the *post-change* world and counts only
 * **active** other admins (a deactivated admin can't hold the floor), mirroring
 * {@link setUserDeactivated}.
 */
export async function deleteUser({
	userId,
	actor,
}: {
	userId: string
	actor: AuditActor
}): Promise<void> {
	// Refuse self-deletion up front — never let an admin erase themselves.
	if (actor.id === userId) {
		throw new SelfDeletionError()
	}

	const { target } = await prisma.$transaction(async (tx) => {
		const target = await tx.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				name: true,
				username: true,
				email: true,
				roles: {
					select: { permissions: { select: { entity: true, access: true } } },
				},
			},
		})
		invariantResponse(target, 'User not found', { status: 404 })

		// Only *active* other users can hold the floor. Assert solely when this
		// delete would breach it (held before with the target, not after without).
		const others = await tx.user.findMany({
			where: { id: { not: userId }, deactivatedAt: null },
			select: {
				roles: {
					select: { permissions: { select: { entity: true, access: true } } },
				},
			},
		})
		const heldBefore = adminFloorHolds([...others, { roles: target.roles }])
		const holdsAfter = adminFloorHolds(others)
		if (heldBefore && !holdsAfter) {
			throw new AdminFloorError(
				'This change would remove the last administrator who can manage users and roles.',
			)
		}

		await tx.user.delete({ where: { id: userId } })

		return { target }
	})

	// Append-only, so a post-commit write is fine — the deletion is already durable.
	await recordAuditEvent({
		event: 'user.deleted',
		actor,
		target: { id: target.id, type: 'user', label: labelForActor(target) },
	})
}

/**
 * Trigger a password reset for a user *on their behalf* (EPT-94): arm the existing
 * `reset-password` Verification and email the user the same recovery link the
 * self-serve "forgot password" flow sends. The admin never sets or sees a
 * password — they only kick off the user-driven reset. A `user.password.reset`
 * Audit Event (ADR-070) is recorded on a successful send. Returns the email send
 * status so the route can toast success or surface the failure.
 */
export async function sendUserPasswordReset({
	userId,
	request,
	actor,
}: {
	userId: string
	request: Request
	actor: AuditActor
}): Promise<{ status: 'success' | 'error' }> {
	const target = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, name: true, username: true, email: true },
	})
	invariantResponse(target, 'User not found', { status: 404 })

	const { verifyUrl, otp } = await prepareVerification({
		period: 10 * 60,
		request,
		type: 'reset-password',
		target: target.username,
	})

	const response = await sendEmail({
		to: target.email,
		subject: `Epic Notes Password Reset`,
		react: createElement(ForgotPasswordEmail, {
			onboardingUrl: verifyUrl.toString(),
			otp,
		}),
	})

	if (response.status === 'success') {
		await recordAuditEvent({
			event: 'user.password.reset',
			actor,
			target: { id: target.id, type: 'user', label: labelForActor(target) },
		})
	}

	return { status: response.status }
}

/** A destructive bulk operation the user list applies to a selected set at once. */
export type BulkUserOp = 'deactivate' | 'force-logout' | 'delete'

/**
 * The outcome of a {@link bulkUserAction}: every selected user is tallied into
 * exactly one bucket. `succeeded` applied cleanly, `blocked` was refused by the
 * admin-floor invariant (would strand the last capable admin), `skipped` was a
 * self-targeting destructive action the self-guards refuse. The route maps this
 * to a single explanatory toast.
 */
export type BulkUserResult = {
	op: BulkUserOp
	succeeded: number
	blocked: number
	skipped: number
}

/**
 * Apply a destructive `op` to each user in `userIds` (EPT-95) by replaying the
 * single-user data-layer operation per row — so the **admin-floor invariant** and
 * the self-action guards (ADR-069) hold across the whole batch, and every affected
 * user still gets its own Audit Event (ADR-070). Applying one row at a time means
 * the floor is re-checked against the running, post-each-change world: a batch that
 * would remove the last capable admin is partially applied (the rows that keep the
 * floor land; the one that would breach it is counted `blocked`) and **never** drops
 * below one. A self-targeting `deactivate`/`delete` is counted `skipped` while the
 * rest of the batch proceeds. `force-logout` has no floor or self guard, so every
 * row succeeds. Returns the per-bucket tally for the caller's toast.
 */
export async function bulkUserAction({
	op,
	userIds,
	actor,
}: {
	op: BulkUserOp
	userIds: string[]
	actor: AuditActor
}): Promise<BulkUserResult> {
	const result: BulkUserResult = { op, succeeded: 0, blocked: 0, skipped: 0 }

	// Sequential, not parallel: each op's floor assert must see the effect of the
	// previous one, so a batch can never race two reads past the floor at once.
	for (const userId of userIds) {
		try {
			if (op === 'deactivate') {
				await setUserDeactivated({ userId, deactivated: true, actor })
			} else if (op === 'force-logout') {
				await revokeUserSessions({ userId, actor })
			} else {
				await deleteUser({ userId, actor })
			}
			result.succeeded++
		} catch (error) {
			// The floor invariant and the self-guards are the expected per-row
			// rejections — bucket them and keep going so one protected row never aborts
			// the rest of the batch. Anything else is a real fault: rethrow.
			if (error instanceof AdminFloorError) {
				result.blocked++
			} else if (
				error instanceof SelfDeactivationError ||
				error instanceof SelfDeletionError
			) {
				result.skipped++
			} else {
				throw error
			}
		}
	}

	return result
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
