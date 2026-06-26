import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { useState } from 'react'
import { Form, Link, useSubmit } from 'react-router'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Alert, AlertDescription, AlertTitle } from '#app/components/ui/alert.tsx'
import { Badge, type BadgeVariant } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { Pagination } from '#app/components/ui/pagination.tsx'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select.tsx'
import { Table, type TableColumn } from '#app/components/ui/table.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
import { UserAvatar } from '#app/components/user-avatar.tsx'
import { type AdminHeader } from '#app/routes/admin/_layout.tsx'
import {
	AUDIT_EVENT_NAMES,
	getAuditEvents,
	type AuditEventRecord,
} from '#app/utils/audit.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { type Route } from './+types/index.ts'

export const handle: SEOHandle & { adminHeader: AdminHeader } = {
	// Admin surfaces are never indexed.
	getSitemapEntries: () => null,
	// The admin shell owns the lone PageHeader; this surface feeds it the Access
	// eyebrow and the "Audit log" title (the third Access surface).
	adminHeader: { eyebrow: 'Access', title: 'Audit log' },
}

export const meta: Route.MetaFunction = () => [{ title: 'Audit log — Admin' }]

// --- Presentation config (feature-level, not the audit seam) -----------------

/**
 * The human label + tonal {@link Badge} variant for each event kind (ADR-070):
 * additive grants read brand, neutral updates secondary, quiet reversals outline,
 * destructive deletions destructive. An unknown event (the log stores the name as
 * plain text) degrades to a secondary badge showing the raw name.
 */
const EVENT_META: Record<string, { label: string; variant: BadgeVariant['variant'] }> = {
	'role.granted': { label: 'Role granted', variant: 'brand' },
	'role.revoked': { label: 'Role revoked', variant: 'outline' },
	'role.created': { label: 'Role created', variant: 'brand' },
	'role.updated': { label: 'Role updated', variant: 'secondary' },
	'role.deleted': { label: 'Role deleted', variant: 'destructive' },
	'role.permissions.changed': {
		label: 'Permissions changed',
		variant: 'secondary',
	},
	'user.deactivated': { label: 'User deactivated', variant: 'outline' },
	'user.reactivated': { label: 'User reactivated', variant: 'brand' },
	'user.deleted': { label: 'User deleted', variant: 'destructive' },
	'user.sessions.revoked': { label: 'Sessions revoked', variant: 'outline' },
	'user.password.reset': { label: 'Password reset', variant: 'secondary' },
}

function eventMeta(event: string) {
	return EVENT_META[event] ?? { label: event, variant: 'secondary' as const }
}

/** The "all events" Select sentinel — Radix items can't carry an empty value. */
const ALL_EVENTS = 'all'

// --- Loader ------------------------------------------------------------------

/** One audit row as the viewer renders it — actor/target resolved to view shapes. */
export type AuditView = {
	id: string
	event: string
	createdAt: Date | string
	/**
	 * The acting user. `null` for a system/no-actor event. `deleted` is true once
	 * the actor user is gone (the FK is `SetNull`, so the denormalized label is all
	 * that survives — ADR-070).
	 */
	actor: {
		label: string
		imageObjectKey: string | null
		deleted: boolean
		/** The live user's id (filterable); `null` once deleted. */
		id: string | null
	} | null
	/** The affected entity. `null` when the event records no target. */
	target: {
		label: string
		type: string | null
		deleted: boolean
		id: string | null
	} | null
	/** The add/remove diff for grant-bearing events; `null` when there's none. */
	diff: { added: string[]; removed: string[] } | null
}

/**
 * The inline add/remove diff for an event, or `null` when the kind carries none.
 * Grants/creations contribute added lines, revocations removed lines, and a
 * permissions change its own `{ added, removed }` delta (rbac-admin.server.ts).
 */
export function auditDiff(
	event: string,
	details: Record<string, unknown> | null,
): { added: string[]; removed: string[] } | null {
	if (!details) return null
	const list = (value: unknown): string[] =>
		Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
	const one = (value: unknown): string[] =>
		typeof value === 'string' ? [value] : []

	switch (event) {
		case 'role.granted': {
			const added = one(details.role)
			return added.length ? { added, removed: [] } : null
		}
		case 'role.revoked': {
			const removed = one(details.role)
			return removed.length ? { added: [], removed } : null
		}
		case 'role.created': {
			const added = list(details.grants)
			return added.length ? { added, removed: [] } : null
		}
		case 'role.permissions.changed': {
			const added = list(details.added)
			const removed = list(details.removed)
			return added.length || removed.length ? { added, removed } : null
		}
		default:
			return null
	}
}

type LiveUser = {
	id: string
	name: string | null
	username: string
	image: { objectKey: string } | null
}

/** Resolve one stored event into the view shape the table renders. */
function toAuditView(
	event: AuditEventRecord,
	liveById: Map<string, LiveUser>,
): AuditView {
	let actor: AuditView['actor'] = null
	if (event.actorId) {
		// An intact FK means the actor still exists — surface their avatar + name.
		const live = liveById.get(event.actorId)
		actor = {
			id: event.actorId,
			label: live?.name ?? live?.username ?? event.actorLabel ?? 'Unknown',
			imageObjectKey: live?.image?.objectKey ?? null,
			deleted: false,
		}
	} else if (event.actorLabel) {
		// The FK was blanked by the actor's deletion; only the snapshot label remains.
		actor = { id: null, label: event.actorLabel, imageObjectKey: null, deleted: true }
	}

	let target: AuditView['target'] = null
	if (event.targetId || event.targetLabel) {
		// `targetId` is a plain string (not an FK), so a user target can dangle once
		// the user is deleted — detect it against the live lookup.
		const deleted =
			event.targetType === 'user' &&
			event.targetId != null &&
			!liveById.has(event.targetId)
		target = {
			id: event.targetId,
			type: event.targetType,
			label: event.targetLabel ?? 'Unknown',
			deleted,
		}
	}

	return {
		id: event.id,
		event: event.event,
		createdAt: event.createdAt,
		actor,
		target,
		diff: auditDiff(event.event, event.details),
	}
}

export async function loader({ request }: Route.LoaderArgs) {
	// Reading the audit trail is admin-only (ADR-070): `read:audit:any` is the
	// audit-only permission the management roles hold.
	await requireUserWithPermission(request, 'read:audit:any')

	const params = new URL(request.url).searchParams
	const rawEvent = params.get('event')
	const event = rawEvent && rawEvent !== ALL_EVENTS ? rawEvent : undefined
	const actorId = params.get('actorId') || undefined
	const targetId = params.get('targetId') || undefined
	const page = Number(params.get('page'))

	const result = await getAuditEvents({
		filters: { event, actorId, targetId },
		page,
	})

	// Resolve the live users referenced by the page: actor ids (an intact FK ⟺ a
	// live user) for avatars, and user-type target ids (a plain string that can
	// dangle) for the deleted-target fallback. One query covers both axes.
	const userIds = [
		...new Set([
			...result.events.flatMap((e) => (e.actorId ? [e.actorId] : [])),
			...result.events.flatMap((e) =>
				e.targetType === 'user' && e.targetId ? [e.targetId] : [],
			),
		]),
	]
	const liveUsers = userIds.length
		? await prisma.user.findMany({
				where: { id: { in: userIds } },
				select: {
					id: true,
					name: true,
					username: true,
					image: { select: { objectKey: true } },
				},
			})
		: []
	const liveById = new Map(liveUsers.map((u) => [u.id, u]))

	return {
		rows: result.events.map((e) => toAuditView(e, liveById)),
		total: result.total,
		page: result.page,
		pageCount: result.pageCount,
		filters: {
			event: event ?? '',
			actorId: actorId ?? '',
			targetId: targetId ?? '',
		},
	}
}

// --- Relative time -----------------------------------------------------------

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
	['year', 1000 * 60 * 60 * 24 * 365],
	['month', 1000 * 60 * 60 * 24 * 30],
	['week', 1000 * 60 * 60 * 24 * 7],
	['day', 1000 * 60 * 60 * 24],
	['hour', 1000 * 60 * 60],
	['minute', 1000 * 60],
	['second', 1000],
]
const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** A compact "2 days ago" string for `date` relative to `now`. */
function relativeTime(date: Date, now: Date): string {
	const diff = date.getTime() - now.getTime()
	for (const [unit, ms] of RELATIVE_UNITS) {
		if (Math.abs(diff) >= ms || unit === 'second') {
			return relativeFormatter.format(Math.round(diff / ms), unit)
		}
	}
	return 'just now'
}

function absoluteTime(date: Date): string {
	return date.toLocaleString('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short',
	})
}

// --- Cells -------------------------------------------------------------------

/** The "When" cell — relative time on the surface, the absolute stamp in a Tooltip. */
function WhenCell({ value, now }: { value: Date | string; now: Date }) {
	const date = new Date(value)
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<time
					dateTime={date.toISOString()}
					className="text-muted-foreground text-body-sm"
				>
					{relativeTime(date, now)}
				</time>
			</TooltipTrigger>
			<TooltipContent>{absoluteTime(date)}</TooltipContent>
		</Tooltip>
	)
}

/** The dashed-circle placeholder shown for a deleted actor (no avatar survives). */
function DeletedAvatar() {
	return (
		<span
			aria-hidden="true"
			className="border-muted-foreground/40 text-muted-foreground/50 flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed"
		>
			<Icon name="avatar" className="size-3.5" />
		</span>
	)
}

/** The "Actor" cell — avatar + name, or the dashed-circle deleted fallback. */
function ActorCell({
	actor,
	filterHref,
}: {
	actor: AuditView['actor']
	filterHref: (next: { actorId?: string; targetId?: string }) => string
}) {
	if (!actor) {
		return <span className="text-muted-foreground text-body-sm">System</span>
	}
	if (actor.deleted) {
		return (
			<span className="flex min-w-0 items-center gap-2">
				<DeletedAvatar />
				<span className="text-muted-foreground text-body-sm truncate italic">
					{actor.label}
				</span>
			</span>
		)
	}
	const inner = (
		<>
			<UserAvatar
				name={actor.label}
				imageObjectKey={actor.imageObjectKey}
				className="size-7"
				fallbackClassName="bg-brand-soft text-brand text-[0.6rem]"
			/>
			<span className="truncate font-medium">{actor.label}</span>
		</>
	)
	return actor.id ? (
		<Link
			to={filterHref({ actorId: actor.id })}
			className="focus-cosy flex min-w-0 items-center gap-2 rounded-sm hover:underline"
		>
			{inner}
		</Link>
	) : (
		<span className="flex min-w-0 items-center gap-2">{inner}</span>
	)
}

/** The "Target" cell — name (clickable to filter), or the deleted fallback. */
function TargetCell({
	target,
	filterHref,
}: {
	target: AuditView['target']
	filterHref: (next: { actorId?: string; targetId?: string }) => string
}) {
	if (!target) {
		return <span className="text-muted-foreground text-body-sm">—</span>
	}
	if (target.deleted) {
		return (
			<span className="text-muted-foreground text-body-sm truncate italic">
				Deleted user
			</span>
		)
	}
	const qualifier = target.type ? (
		<span className="text-muted-foreground text-body-2xs uppercase">
			{target.type}
		</span>
	) : null
	if (target.id) {
		return (
			<span className="flex min-w-0 items-center gap-2">
				<Link
					to={filterHref({ targetId: target.id })}
					className="focus-cosy truncate rounded-sm font-medium hover:underline"
				>
					{target.label}
				</Link>
				{qualifier}
			</span>
		)
	}
	return (
		<span className="flex min-w-0 items-center gap-2">
			<span className="truncate font-medium">{target.label}</span>
			{qualifier}
		</span>
	)
}

/** The tonal event badge for a row. */
function EventBadge({ event }: { event: string }) {
	const meta = eventMeta(event)
	return <Badge variant={meta.variant}>{meta.label}</Badge>
}

/** The inline add/remove diff revealed when a row is expanded (feature markup). */
function AuditDiffBlock({
	diff,
}: {
	diff: NonNullable<AuditView['diff']>
}) {
	return (
		<div className="text-body-xs flex flex-col gap-1 font-mono">
			{diff.added.map((line, i) => (
				<div
					key={`add-${i}`}
					className="bg-brand-soft text-brand rounded px-2 py-1"
				>
					+ grant {line}
				</div>
			))}
			{diff.removed.map((line, i) => (
				<div
					key={`remove-${i}`}
					className="bg-destructive/10 text-destructive rounded px-2 py-1"
				>
					− revoke {line}
				</div>
			))}
		</div>
	)
}

/** The per-row expand chevron — only rendered for a row that carries a diff. */
function ExpandButton({
	expanded,
	onToggle,
	label,
}: {
	expanded: boolean
	onToggle: () => void
	label: string
}) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			onClick={onToggle}
			aria-expanded={expanded}
			aria-label={expanded ? `Hide ${label}` : `Show ${label}`}
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden
				className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
			>
				<path d="m6 9 6 6 6-6" />
			</svg>
		</Button>
	)
}

/** `grid-template-columns`: When hugs, Actor flexes, Event hugs, Target flexes, expand hugs. */
const columnTemplate =
	'112px minmax(0,1.25fr) 150px minmax(0,1.3fr) min-content'

export function HydrateFallback() {
	return (
		<main className="container max-w-(--shell-max) py-8">
			<Table
				aria-label="Audit log"
				columns={[
					{ key: 'when', header: 'When', cell: () => null },
					{ key: 'actor', header: 'Actor', cell: () => null },
					{ key: 'event', header: 'Event', cell: () => null },
					{ key: 'target', header: 'Target', cell: () => null },
					{ key: 'expand', header: '', cell: () => null },
				]}
				data={[]}
				getRowId={() => ''}
				columnTemplate={columnTemplate}
				loading
				loadingRows={8}
			/>
		</main>
	)
}

/**
 * The audit log viewer (`/admin/audit`): every sensitive role/user mutation in one
 * read-only `Table` inside the admin shell (the shell owns the PageHeader, fed via
 * `handle.adminHeader`). Newest-first, server-paginated. An event `Select` filters
 * by kind (auto-submit GET); clicking an actor or target filters by that entity.
 * Each grant-bearing row expands to an inline add/remove diff. Deleted actors and
 * targets degrade to a denormalized-label fallback (the trail outlives the
 * account). Admin-only at the loader (`read:audit:any`); the log is read-only —
 * there is no edit or delete affordance anywhere.
 */
export default function AdminAuditIndex({ loaderData }: Route.ComponentProps) {
	const { rows, total, page, pageCount, filters } = loaderData
	const submit = useSubmit()
	const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
	// One "now" per render so every relative stamp shares a reference point.
	const now = new Date()

	const toggleExpanded = (id: string) =>
		setExpanded((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})

	const hasFilters = Boolean(filters.event || filters.actorId || filters.targetId)

	// The active filters as query params, with any overlay applied — the one place
	// that knows which filters carry forward, shared by the filter and page links.
	const buildFilterParams = (overrides: {
		event?: string
		actorId?: string
		targetId?: string
	} = {}) => {
		const params = new URLSearchParams()
		const event = overrides.event ?? filters.event
		const actorId = overrides.actorId ?? filters.actorId
		const targetId = overrides.targetId ?? filters.targetId
		if (event) params.set('event', event)
		if (actorId) params.set('actorId', actorId)
		if (targetId) params.set('targetId', targetId)
		return params
	}

	// Build a filter URL preserving the current filters, overlaying actor/target.
	const filterHref = (overrides: { actorId?: string; targetId?: string }) => {
		const qs = buildFilterParams(overrides).toString()
		return qs ? `/admin/audit?${qs}` : '/admin/audit'
	}

	// Carry the active filters onto each page link so paging keeps them.
	const pageHref = (p: number) => {
		const params = buildFilterParams()
		params.set('page', String(p))
		return `/admin/audit?${params.toString()}`
	}

	const columns: Array<TableColumn<AuditView>> = [
		{
			key: 'when',
			header: 'When',
			cell: (row) => <WhenCell value={row.createdAt} now={now} />,
		},
		{
			key: 'actor',
			header: 'Actor',
			cell: (row) => <ActorCell actor={row.actor} filterHref={filterHref} />,
		},
		{
			key: 'event',
			header: 'Event',
			cell: (row) => <EventBadge event={row.event} />,
		},
		{
			key: 'target',
			header: 'Target',
			cell: (row) => <TargetCell target={row.target} filterHref={filterHref} />,
		},
		{
			key: 'expand',
			header: '',
			headerClassName: 'sr-only',
			className: 'justify-self-end',
			cell: (row) =>
				row.diff ? (
					<ExpandButton
						expanded={expanded.has(row.id)}
						onToggle={() => toggleExpanded(row.id)}
						label={`${eventMeta(row.event).label} detail`}
					/>
				) : null,
		},
	]

	return (
		<main className="container max-w-(--shell-max) py-8">
			<Form
				method="get"
				className="mb-4 flex flex-wrap items-end gap-3"
				onChange={(e) => submit(e.currentTarget)}
			>
				{/* Preserve the actor/target filters when the event filter changes. */}
				{filters.actorId ? (
					<input type="hidden" name="actorId" value={filters.actorId} />
				) : null}
				{filters.targetId ? (
					<input type="hidden" name="targetId" value={filters.targetId} />
				) : null}
				<div className="w-auto">
					<Label htmlFor="audit-event">Event</Label>
					<Select name="event" defaultValue={filters.event || ALL_EVENTS}>
						<SelectTrigger
							id="audit-event"
							aria-label="Filter by event"
							className="mt-1 min-w-56"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ALL_EVENTS}>All events</SelectItem>
							{AUDIT_EVENT_NAMES.map((name) => (
								<SelectItem key={name} value={name}>
									{eventMeta(name).label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				{hasFilters ? (
					<Button asChild variant="ghost" size="sm">
						<Link to="/admin/audit">Clear filters</Link>
					</Button>
				) : null}
			</Form>

			<p className="text-muted-foreground text-body-sm mb-4">
				{total} {total === 1 ? 'event' : 'events'}
				{hasFilters ? ' (filtered)' : ''}
			</p>

			<Table
				aria-label="Audit log"
				columns={columns}
				data={rows}
				getRowId={(row) => row.id}
				columnTemplate={columnTemplate}
				renderRowDetail={(row) =>
					expanded.has(row.id) && row.diff ? (
						<AuditDiffBlock diff={row.diff} />
					) : null
				}
				emptyState={{
					icon: <Icon name="clock" className="size-6" />,
					title: hasFilters ? 'No matching events' : 'No audit events yet',
					description: hasFilters
						? 'No events match the current filters.'
						: 'Sensitive role and user changes will be recorded here.',
					action: hasFilters ? (
						<Button asChild variant="outline" size="sm">
							<Link to="/admin/audit">Clear filters</Link>
						</Button>
					) : undefined,
				}}
				footer={
					pageCount > 1 ? (
						<Pagination
							page={page}
							pageCount={pageCount}
							getPageHref={pageHref}
						/>
					) : undefined
				}
			/>
		</main>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: ({ error }) => (
					<Alert tone="error" className="max-w-md text-left">
						<AlertTitle>Access denied</AlertTitle>
						<AlertDescription>
							{error?.data.message ??
								'You do not have permission to view the audit log.'}
						</AlertDescription>
					</Alert>
				),
			}}
			unexpectedErrorHandler={() => (
				<Alert tone="error" className="max-w-md text-left">
					<AlertTitle>Something went wrong</AlertTitle>
					<AlertDescription>
						The audit log could not be loaded. Try again in a moment.
					</AlertDescription>
				</Alert>
			)}
		/>
	)
}
