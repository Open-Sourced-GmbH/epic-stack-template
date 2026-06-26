/**
 * Client-safe audit vocabulary. The event-name list is the one piece of the
 * audit seam (ADR-070) the browser needs — the viewer's event-filter `Select`
 * iterates it — so it lives here, free of any server-only import, while the
 * write/read seams stay in `audit.server.ts` (which re-exports these).
 */

/**
 * The vocabulary of audit events — every sensitive role/user mutation funnels
 * through `recordAuditEvent` with one of these names (ADR-070). Stored as plain
 * text in the DB so a new kind needs no migration, but enumerated here so callers
 * (and the viewer's event filter `Select`) can't drift onto a typo. `as const` so
 * {@link AuditEventName} stays in lockstep with the list the viewer iterates.
 */
export const AUDIT_EVENT_NAMES = [
	'role.granted',
	'role.revoked',
	'role.created',
	'role.updated',
	'role.deleted',
	'role.permissions.changed',
	'user.deactivated',
	'user.reactivated',
	'user.deleted',
	'user.sessions.revoked',
	'user.password.reset',
] as const

export type AuditEventName = (typeof AUDIT_EVENT_NAMES)[number]
