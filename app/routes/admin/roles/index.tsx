import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { Link } from 'react-router'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Alert, AlertDescription, AlertTitle } from '#app/components/ui/alert.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { DropdownMenuItem } from '#app/components/ui/dropdown-menu.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Table, type TableColumn } from '#app/components/ui/table.tsx'
import { type AdminHeader } from '#app/routes/admin/_layout.tsx'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { listRoles, type AdminRole } from '#app/utils/rbac-admin.server.ts'
import { type Route } from './+types/index.ts'

/** The header New role button — fed into the admin shell's `PageHeader`. */
function NewRoleButton() {
	return (
		<Button asChild>
			<Link to="/admin/roles/new">
				<Icon name="plus">New role</Icon>
			</Link>
		</Button>
	)
}

export const handle: SEOHandle & { adminHeader: AdminHeader } = {
	// Admin surfaces are never indexed.
	getSitemapEntries: () => null,
	// The admin shell owns the lone PageHeader; this surface feeds it the Access
	// eyebrow, the "Roles" title, and the New role action.
	adminHeader: { eyebrow: 'Access', title: 'Roles', actions: <NewRoleButton /> },
}

export const meta: Route.MetaFunction = () => [{ title: 'Roles — Admin' }]

export async function loader({ request }: Route.LoaderArgs) {
	// Managing roles is admin-only: reading the roles roster requires
	// `read:role:any`, the broad permission only management roles hold.
	await requireUserWithPermission(request, 'read:role:any')
	return { roles: await listRoles() }
}

/** The "Role" cell — brand icon tile + name over the (ellipsized) description. */
function RoleCell({ role }: { role: AdminRole }) {
	return (
		<div className="flex min-w-0 items-center gap-3">
			<div className="bg-brand-soft text-brand flex size-9 shrink-0 items-center justify-center rounded-lg">
				<Icon name="lock-closed" className="size-4" />
			</div>
			<div className="flex min-w-0 flex-col">
				<span className="text-body-sm truncate font-semibold">{role.name}</span>
				{role.description ? (
					<span className="text-muted-foreground text-body-2xs truncate">
						{role.description}
					</span>
				) : null}
			</div>
		</div>
	)
}

/** The System/Custom marker — outline + lock for built-ins, brand tonal for custom. */
function TypeBadge({ role }: { role: AdminRole }) {
	return role.system ? (
		<Badge variant="outline">
			<Icon name="lock-closed" className="mr-1 size-3" />
			System
		</Badge>
	) : (
		<Badge variant="brand">Custom</Badge>
	)
}

const columns: Array<TableColumn<AdminRole>> = [
	{ key: 'role', header: 'Role', cell: (role) => <RoleCell role={role} /> },
	{ key: 'type', header: 'Type', cell: (role) => <TypeBadge role={role} /> },
	{
		key: 'users',
		header: 'Users',
		headerClassName: 'text-right',
		className: 'text-muted-foreground text-body-sm text-right whitespace-nowrap',
		cell: (role) => role.userCount,
	},
]

/** `grid-template-columns`: Role flexes widest, Type and Users hug. */
const columnTemplate = 'minmax(0,1fr) max-content max-content'

/**
 * Per-row overflow menu. **System roles are view-only** — no rename/delete
 * affordance (ADR-069). Custom roles open the editor to edit (delete lands with
 * the role mutation slice). Both link into the (separately-built) role editor.
 */
function rowActions(role: AdminRole) {
	return role.system ? (
		<DropdownMenuItem asChild>
			<Link to={`/admin/roles/${role.id}`}>
				<Icon name="magnifying-glass" className="mr-2 size-4" />
				View
			</Link>
		</DropdownMenuItem>
	) : (
		<DropdownMenuItem asChild>
			<Link to={`/admin/roles/${role.id}`}>
				<Icon name="pencil-1" className="mr-2 size-4" />
				Edit
			</Link>
		</DropdownMenuItem>
	)
}

export function HydrateFallback() {
	return (
		<main className="container max-w-(--shell-max) py-8">
			<Table
				aria-label="Roles"
				columns={columns}
				data={[]}
				getRowId={(role) => role.id}
				columnTemplate={columnTemplate}
				loading
				loadingRows={4}
			/>
		</main>
	)
}

/**
 * The admin roles list (`/admin/roles`): every role in one managed `Table` inside
 * the admin shell (the shell owns the PageHeader, fed via `handle.adminHeader`).
 * Each row carries a brand icon tile + name/description, a System/Custom marker,
 * and a right-aligned member count; the overflow menu offers View for the
 * protected built-ins and Edit for custom roles. A footer summarises the split.
 * Admin-only at the loader (`read:role:any`); a non-manager gets a 403 and never
 * sees the Access group. Read-only this slice — role mutations live in the editor.
 */
export default function AdminRolesIndex({ loaderData }: Route.ComponentProps) {
	const { roles } = loaderData
	const systemCount = roles.filter((role) => role.system).length
	const customCount = roles.length - systemCount

	return (
		<main className="container max-w-(--shell-max) py-8">
			<Table
				aria-label="Roles"
				columns={columns}
				data={roles}
				getRowId={(role) => role.id}
				columnTemplate={columnTemplate}
				rowActions={rowActions}
				getRowActionsLabel={(role) => `Actions for ${role.name}`}
				emptyState={{
					icon: <Icon name="lock-closed" className="size-6" />,
					title: 'No roles yet',
					description: 'Roles will appear here.',
				}}
				footer={
					<p className="text-muted-foreground text-body-sm">
						{roles.length} {roles.length === 1 ? 'role' : 'roles'} ·{' '}
						{systemCount} system, {customCount} custom
					</p>
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
								'You do not have permission to manage roles.'}
						</AlertDescription>
					</Alert>
				),
			}}
			unexpectedErrorHandler={() => (
				<Alert tone="error" className="max-w-md text-left">
					<AlertTitle>Something went wrong</AlertTitle>
					<AlertDescription>
						The role list could not be loaded. Try again in a moment.
					</AlertDescription>
				</Alert>
			)}
		/>
	)
}
