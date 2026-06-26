import { type Prisma } from '@prisma/client'
import {
	AUDIT_EVENT_NAMES,
	type AuditEventName,
} from './audit.ts'
import { prisma } from './db.server.ts'

// The event vocabulary is client-safe (the viewer's filter Select iterates it),
// so it lives in `audit.ts`; re-export it here so the write/read seam stays the
// single import surface for server callers.
export { AUDIT_EVENT_NAMES, type AuditEventName }

/** Default page size for the audit viewer (admin Table, ADR-070). */
export const AUDIT_EVENTS_PER_PAGE = 20

/**
 * The actor side of an event: any user-shaped record. Only the identity fields
 * are read — the label is snapshotted from them at write time, so passing the
 * acting user's loader payload is enough.
 */
export type AuditActor = {
	id: string
	email: string
	username: string
	name?: string | null
}

/**
 * The target side: an un-constrained id + type discriminator plus a human label.
 * Not an FK because a target may be a Role, a Session set, or a User — the caller
 * knows the label (e.g. the role name or the target user's email).
 */
export type AuditTarget = {
	id: string
	type: string
	label: string
}

/**
 * The single denormalized identity label for a user: name → username → email,
 * the first present. Captured at write time so the trail survives the user's
 * later deletion (ADR-070).
 */
export function labelForActor(actor: AuditActor): string {
	return actor.name ?? actor.username ?? actor.email
}

/**
 * The one write seam for the audit log. Captures the actor's and target's
 * identity labels *now* (not as a live join), serializes `details`, and appends
 * an immutable row. There is deliberately no update or delete counterpart — the
 * log is append-only.
 */
export async function recordAuditEvent({
	event,
	actor,
	target,
	details,
}: {
	event: AuditEventName
	actor?: AuditActor | null
	target?: AuditTarget | null
	details?: Record<string, unknown> | null
}): Promise<void> {
	await prisma.auditEvent.create({
		data: {
			event,
			actorId: actor?.id ?? null,
			actorLabel: actor ? labelForActor(actor) : null,
			targetId: target?.id ?? null,
			targetType: target?.type ?? null,
			targetLabel: target?.label ?? null,
			details: details ? JSON.stringify(details) : null,
		},
	})
}

/** One audit row as the viewer reads it: `details` parsed back to an object. */
export type AuditEventRecord = {
	id: string
	event: string
	actorId: string | null
	actorLabel: string | null
	targetId: string | null
	targetType: string | null
	targetLabel: string | null
	details: Record<string, unknown> | null
	createdAt: Date
}

export type AuditEventFilters = {
	/** The acting user's id. */
	actorId?: string
	/** The affected entity's id (any target type). */
	targetId?: string
	/** A single event name. */
	event?: string
}

export type AuditEventPage = {
	events: AuditEventRecord[]
	/** Total rows matching the filters (not just this page) — drives the pager. */
	total: number
	/** The clamped, 1-based page actually returned. */
	page: number
	perPage: number
	/** Total page count, always ≥ 1 so the UI never divides by zero. */
	pageCount: number
}

const auditEventSelect = {
	id: true,
	event: true,
	actorId: true,
	actorLabel: true,
	targetId: true,
	targetType: true,
	targetLabel: true,
	details: true,
	createdAt: true,
} satisfies Prisma.AuditEventSelect

/** Re-parse the stored JSON `details` text into an object (null when absent). */
function parseDetails(details: string | null): Record<string, unknown> | null {
	if (!details) return null
	return JSON.parse(details) as Record<string, unknown>
}

/**
 * One page of audit events, newest-first, filterable by actor / target / event
 * (the three axes the viewer exposes). `page` is clamped to `[1, …]` so a junk
 * `?page=` still resolves, and `pageCount` is always ≥ 1. `id` is the secondary
 * sort so rows sharing a `createdAt` paginate in a stable order.
 */
export async function getAuditEvents({
	filters = {},
	page = 1,
	perPage = AUDIT_EVENTS_PER_PAGE,
}: {
	filters?: AuditEventFilters
	page?: number
	perPage?: number
} = {}): Promise<AuditEventPage> {
	const currentPage = Math.max(1, Math.floor(page) || 1)

	// Prisma ignores `undefined` filter keys, so an absent filter simply doesn't
	// constrain the query.
	const where: Prisma.AuditEventWhereInput = {
		actorId: filters.actorId,
		targetId: filters.targetId,
		event: filters.event,
	}

	const [total, rows] = await Promise.all([
		prisma.auditEvent.count({ where }),
		prisma.auditEvent.findMany({
			where,
			orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
			skip: (currentPage - 1) * perPage,
			take: perPage,
			select: auditEventSelect,
		}),
	])

	return {
		events: rows.map((row) => ({ ...row, details: parseDetails(row.details) })),
		total,
		page: currentPage,
		perPage,
		pageCount: Math.max(1, Math.ceil(total / perPage)),
	}
}
