import { invariantResponse } from '@epic-web/invariant'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { useEffect } from 'react'
import { Form, Link, data, useFetcher, useSubmit } from 'react-router'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Field } from '#app/components/forms.tsx'
import { Alert, AlertDescription, AlertTitle } from '#app/components/ui/alert.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Pagination } from '#app/components/ui/pagination.tsx'
import { useRowSelection } from '#app/components/ui/row-selection.ts'
import { Table, type TableColumn } from '#app/components/ui/table.tsx'
import { UserAvatar } from '#app/components/user-avatar.tsx'
import { type AdminHeader } from '#app/routes/admin/_layout.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { useDebounce, useDoubleCheck } from '#app/utils/misc.tsx'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { createToastHeaders } from '#app/utils/toast.server.ts'
import {
	bulkUserAction,
	getUsersForAdmin,
	type AdminUser,
	type BulkUserOp,
	type BulkUserResult,
} from '#app/utils/user-admin.server.ts'
import { type PermissionString } from '#app/utils/user.ts'
import { formatDate } from '../../blog/__feed.tsx'
import { type Route } from './+types/index.ts'

export const handle: SEOHandle & { adminHeader: AdminHeader } = {
	// Admin surfaces are never indexed.
	getSitemapEntries: () => null,
	// The admin shell owns the lone PageHeader; this surface feeds it the Access
	// eyebrow and the "Users" title (the first of the Access group's surfaces).
	adminHeader: { eyebrow: 'Access', title: 'Users' },
}

export const meta: Route.MetaFunction = () => [{ title: 'Users — Admin' }]

export async function loader({ request }: Route.LoaderArgs) {
	// Managing access is admin-only: reading the user roster requires
	// `read:user:any`, the broad permission only management roles hold.
	await requireUserWithPermission(request, 'read:user:any')
	const url = new URL(request.url)
	// The read module owns clamping (a junk/NaN `?page=` resolves to page 1) and
	// trims the search, so the loader just forwards the raw values.
	const page = Number(url.searchParams.get('page'))
	const search = url.searchParams.get('search') ?? ''
	return getUsersForAdmin({ page, search })
}

/**
 * The per-op metadata for the bulk bar, in one place so adding an op is a single
 * edit: the `:any`-scoped `user` permission it re-checks at the boundary, the
 * toast `title`, and the past-tense `verb` the toast description leads with.
 */
const BULK_OPS = {
	deactivate: {
		permission: 'update:user:any',
		title: 'Users deactivated',
		verb: 'Deactivated',
	},
	'force-logout': {
		permission: 'update:user:any',
		title: 'Users signed out',
		verb: 'Signed out',
	},
	delete: {
		permission: 'delete:user:any',
		title: 'Users deleted',
		verb: 'Deleted',
	},
} as const satisfies Record<
	BulkUserOp,
	{ permission: PermissionString; title: string; verb: string }
>

function isBulkOp(value: unknown): value is BulkUserOp {
	return typeof value === 'string' && Object.hasOwn(BULK_OPS, value)
}

/**
 * Reduce a {@link BulkUserResult} to a single toast. The lead clause reports how
 * many rows applied; a floor-blocked or self-skipped remainder is appended as a
 * plain-language explanation so the admin sees exactly why the batch wasn't whole.
 */
function bulkResultToast(result: BulkUserResult) {
	const { op, succeeded, blocked, skipped } = result
	const noun = (n: number) => (n === 1 ? 'user' : 'users')
	let description = `${BULK_OPS[op].verb} ${succeeded} ${noun(succeeded)}.`
	if (blocked > 0) {
		description += ` ${blocked} left unchanged to keep at least one administrator.`
	}
	if (skipped > 0) {
		description += ` Skipped your own account.`
	}
	return { type: 'success' as const, title: BULK_OPS[op].title, description }
}

/**
 * The bulk-action write-path for the list's selection bar (EPT-95). The selected
 * user ids ride as repeated `userId` fields and the op as `op`. It is the security
 * boundary: each op re-checks the matching `user` permission (delete needs
 * `delete:user:any`, the rest `update:user:any`) before any data is touched, so a
 * non-manager is rejected here regardless of what the client rendered. The
 * admin-floor invariant and the self-guards (ADR-069) are enforced per user inside
 * `bulkUserAction`, and each affected user is audited (ADR-070). Returns a toast
 * (no navigation) so the list revalidates in place and the bar can clear.
 */
export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const op = formData.get('op')
	invariantResponse(isBulkOp(op), 'Unknown bulk op', { status: 400 })

	// Map the op to its `user` permission before touching any data, so an
	// unauthorized request never reaches the mutation.
	const adminId = await requireUserWithPermission(request, BULK_OPS[op].permission)
	const actor = await prisma.user.findUniqueOrThrow({
		where: { id: adminId },
		select: { id: true, email: true, username: true, name: true },
	})

	const userIds = formData.getAll('userId').map(String).filter(Boolean)
	const result = await bulkUserAction({ op, userIds, actor })

	return data(
		{ status: 'success' } as const,
		{ headers: await createToastHeaders(bulkResultToast(result)) },
	)
}

/** A user's display name — their name, falling back to the username. */
function displayName(user: AdminUser) {
	return user.name ?? user.username
}

/** The "User" cell — avatar + display name over the (ellipsized) email. */
function UserCell({ user }: { user: AdminUser }) {
	const name = displayName(user)
	return (
		<Link
			to={user.id}
			className="focus-cosy-active group -mx-2 -my-1 flex min-w-0 items-center gap-3 rounded-md px-2 py-1 hover:bg-muted"
		>
			<UserAvatar
				name={name}
				imageObjectKey={user.image?.objectKey}
				className="size-9"
				fallbackClassName="bg-brand-soft text-brand text-body-2xs"
			/>
			<div className="flex min-w-0 flex-col">
				<span className="text-body-sm group-hover:underline truncate font-semibold">
					{name}
				</span>
				<span className="text-muted-foreground text-body-2xs truncate">
					{user.email}
				</span>
			</div>
		</Link>
	)
}

/** The role chips — privileged (management-granting) roles read in brand tonal. */
function RolesCell({ user }: { user: AdminUser }) {
	if (user.roles.length === 0) {
		return <span className="text-muted-foreground text-body-sm">—</span>
	}
	return (
		<div className="flex flex-wrap gap-1.5">
			{user.roles.map((role) => (
				<Badge
					key={role.name}
					variant={role.privileged ? 'brand' : 'secondary'}
				>
					{role.name}
				</Badge>
			))}
		</div>
	)
}

/** The status pill — brand "Active" by default, an outline "Deactivated" once set. */
function StatusBadge({ user }: { user: AdminUser }) {
	const active = user.deactivatedAt == null
	return (
		<Badge variant={active ? 'brand' : 'outline'} dot>
			{active ? 'Active' : 'Deactivated'}
		</Badge>
	)
}

const columns: Array<TableColumn<AdminUser>> = [
	{ key: 'user', header: 'User', cell: (user) => <UserCell user={user} /> },
	{ key: 'roles', header: 'Roles', cell: (user) => <RolesCell user={user} /> },
	{
		key: 'status',
		header: 'Status',
		cell: (user) => <StatusBadge user={user} />,
	},
	{
		key: 'created',
		header: 'Joined',
		headerClassName: 'text-right',
		className:
			'text-muted-foreground text-body-sm text-right whitespace-nowrap',
		cell: (user) => {
			const created = new Date(user.createdAt)
			return <time dateTime={created.toISOString()}>{formatDate(created)}</time>
		},
	},
]

/** `grid-template-columns`: User flexes widest, Roles flexes, the rest hug. */
const columnTemplate = 'minmax(0,1.5fr) minmax(0,1fr) max-content max-content'

/** The slice of {@link useRowSelection} the bulk-action bar drives. */
type BarSelection = Pick<
	ReturnType<typeof useRowSelection>,
	'count' | 'selected' | 'clear'
>

/**
 * The selection toolbar shown above the Table once a row is checked: the count
 * plus bulk Deactivate / Force log out / Delete and a Clear. It submits the
 * selected ids + op to this route's `action` via a fetcher (no navigation), then
 * clears the selection once the op lands. Delete is destructive, so it takes the
 * double-check confirm. Each op enforces the admin-floor invariant and the
 * self-guards per user server-side, so a protected row is reported in the toast
 * rather than blocked here.
 */
function BulkActionBar({ selection }: { selection: BarSelection }) {
	const fetcher = useFetcher<typeof action>()
	const deleteCheck = useDoubleCheck()
	const { count, selected, clear } = selection
	const ids = [...selected]
	const busy = fetcher.state !== 'idle'

	// Drop the selection once a bulk op lands, so the bar collapses and the freshly
	// revalidated list shows through.
	useEffect(() => {
		if (fetcher.state === 'idle' && fetcher.data?.status === 'success') {
			clear()
		}
	}, [fetcher.state, fetcher.data, clear])

	if (count === 0) return null

	return (
		<div className="bg-card border-border mb-4 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3">
			<span className="text-body-sm font-medium" aria-live="polite">
				{count} selected
			</span>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={clear}
				disabled={busy}
			>
				Clear
			</Button>
			<fetcher.Form method="post" className="ml-auto flex items-center gap-2">
				{ids.map((id) => (
					<input key={id} type="hidden" name="userId" value={id} />
				))}
				<Button
					type="submit"
					name="op"
					value={'deactivate' satisfies BulkUserOp}
					variant="outline"
					size="sm"
					disabled={busy}
				>
					Deactivate
				</Button>
				<Button
					type="submit"
					name="op"
					value={'force-logout' satisfies BulkUserOp}
					variant="outline"
					size="sm"
					disabled={busy}
				>
					Force log out
				</Button>
				<Button
					variant="destructive"
					size="sm"
					disabled={busy}
					{...deleteCheck.getButtonProps({
						type: 'submit',
						name: 'op',
						value: 'delete' satisfies BulkUserOp,
					})}
				>
					{deleteCheck.doubleCheck ? 'Confirm delete' : 'Delete'}
				</Button>
			</fetcher.Form>
		</div>
	)
}

export function HydrateFallback() {
	return (
		<main className="container max-w-(--shell-max) py-8">
			<Table
				aria-label="Users"
				columns={columns}
				data={[]}
				getRowId={(user) => user.id}
				columnTemplate={columnTemplate}
				loading
				loadingRows={6}
			/>
		</main>
	)
}

/**
 * The admin user list (`/admin/users`): every account in one managed `Table`
 * inside the admin shell (the shell owns the PageHeader, fed via
 * `handle.adminHeader`). The first Access surface — read-only this slice. A
 * debounced GET search narrows by name/email; each row carries the avatar +
 * name/email, role chips (privileged roles in brand tonal), a status pill (all
 * Active until the deactivation path lands), and the join date. A `Pagination`
 * footer walks the pages once there is more than one. Admin-only at the loader
 * (`read:user:any`); a non-manager gets a 403 and never sees the Access group.
 */
export default function AdminUsersIndex({ loaderData }: Route.ComponentProps) {
	const { users, total, page, pageCount, search } = loaderData
	const submit = useSubmit()
	// Selection lives here (not in the Table) so the bulk-action bar can read it
	// too; it's keyed on the current page's ids and prunes itself across pages.
	const selection = useRowSelection(users.map((user) => user.id))

	// Auto-submit the GET filter as the admin types (debounced), so the URL stays
	// the source of truth and the list is shareable — mirroring the cache admin.
	const handleFormChange = useDebounce(
		(form: HTMLFormElement) => submit(form),
		400,
	)

	// Carry the active search onto each page link so paging keeps the filter.
	const pageHref = (p: number) => {
		const params = new URLSearchParams()
		params.set('page', String(p))
		if (search) params.set('search', search)
		return `/admin/users?${params.toString()}`
	}

	return (
		<main className="container max-w-(--shell-max) py-8">
			<Form
				method="get"
				className="mb-4"
				onChange={(e) => handleFormChange(e.currentTarget)}
			>
				<Field
					className="mb-0 max-w-sm"
					labelProps={{ children: 'Search users' }}
					inputProps={{
						type: 'search',
						name: 'search',
						defaultValue: search,
						placeholder: 'Search by name or email…',
						'aria-label': 'Search users by name or email',
					}}
				/>
			</Form>

			<p className="text-muted-foreground text-body-sm mb-4">
				{total} {total === 1 ? 'user' : 'users'}
			</p>

			<BulkActionBar selection={selection} />

			<Table
				aria-label="Users"
				columns={columns}
				data={users}
				getRowId={(user) => user.id}
				columnTemplate={columnTemplate}
				selection={selection}
				getRowLabel={(user) => displayName(user)}
				emptyState={{
					icon: <Icon name="avatar" className="size-6" />,
					title: search ? 'No matching users' : 'No users yet',
					description: search
						? `No users match “${search}”.`
						: 'Registered accounts will appear here.',
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
								'You do not have permission to manage users.'}
						</AlertDescription>
					</Alert>
				),
			}}
			unexpectedErrorHandler={() => (
				<Alert tone="error" className="max-w-md text-left">
					<AlertTitle>Something went wrong</AlertTitle>
					<AlertDescription>
						The user list could not be loaded. Try again in a moment.
					</AlertDescription>
				</Alert>
			)}
		/>
	)
}
