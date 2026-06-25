import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { Form, useSubmit } from 'react-router'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Field } from '#app/components/forms.tsx'
import { Alert, AlertDescription, AlertTitle } from '#app/components/ui/alert.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Pagination } from '#app/components/ui/pagination.tsx'
import { Table, type TableColumn } from '#app/components/ui/table.tsx'
import { UserAvatar } from '#app/components/user-avatar.tsx'
import { type AdminHeader } from '#app/routes/admin/_layout.tsx'
import { useDebounce } from '#app/utils/misc.tsx'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import {
	getUsersForAdmin,
	type AdminUser,
} from '#app/utils/user-admin.server.ts'
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

/** A user's display name — their name, falling back to the username. */
function displayName(user: AdminUser) {
	return user.name ?? user.username
}

/** The "User" cell — avatar + display name over the (ellipsized) email. */
function UserCell({ user }: { user: AdminUser }) {
	const name = displayName(user)
	return (
		<div className="flex min-w-0 items-center gap-3">
			<UserAvatar
				name={name}
				imageObjectKey={user.image?.objectKey}
				className="size-9"
				fallbackClassName="bg-brand-soft text-brand text-body-2xs"
			/>
			<div className="flex min-w-0 flex-col">
				<span className="text-body-sm truncate font-semibold">{name}</span>
				<span className="text-muted-foreground text-body-2xs truncate">
					{user.email}
				</span>
			</div>
		</div>
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

			<Table
				aria-label="Users"
				columns={columns}
				data={users}
				getRowId={(user) => user.id}
				columnTemplate={columnTemplate}
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
