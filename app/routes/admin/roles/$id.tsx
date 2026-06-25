import { invariantResponse } from '@epic-web/invariant'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { Fragment, useEffect, useState } from 'react'
import { Link, data, useFetcher } from 'react-router'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Alert, AlertDescription, AlertTitle } from '#app/components/ui/alert.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Field } from '#app/components/ui/field.tsx'
import { FormCard } from '#app/components/ui/form-card.tsx'
import { Icon, type IconName } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { PageHeader } from '#app/components/ui/page-header.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { ToggleChip } from '#app/components/ui/toggle-chip.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { useDoubleCheck } from '#app/utils/misc.tsx'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import {
	DuplicateRoleNameError,
	SystemRoleError,
	createRole,
	deleteRole,
	getRoleForEditor,
	renameRole,
	setRoleGrants,
} from '#app/utils/rbac-admin.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { AdminFloorError } from '#app/utils/user-admin.server.ts'
import {
	type PermissionAccess,
	type PermissionAction,
	type PermissionEntity,
	entityAccesses,
	permissionActions,
	permissionEntities,
} from '#app/utils/user.ts'
import { type Route } from './+types/$id.ts'

export const handle: SEOHandle = {
	// Admin surfaces are never indexed.
	getSitemapEntries: () => null,
}

export const meta: Route.MetaFunction = () => [{ title: 'Role — Admin' }]

/** Whether the route is the create surface (`/admin/roles/new`) vs. an edit. */
function isCreate(id: string) {
	return id === 'new'
}

/** Name + description validation — the Details card (the matrix is separate state). */
const RoleFormSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'Name is required')
		.max(50, 'Name must be 50 characters or fewer'),
	description: z
		.string()
		.trim()
		.max(200, 'Description must be 200 characters or fewer')
		.optional()
		.default(''),
})

export async function loader({ params, request }: Route.LoaderArgs) {
	const creating = isCreate(params.id)
	// Creating a role needs `create:role:any`; editing needs `update:role:any`.
	await requireUserWithPermission(
		request,
		creating ? 'create:role:any' : 'update:role:any',
	)

	if (creating) {
		return {
			isNew: true as const,
			role: {
				id: '',
				name: '',
				description: '',
				system: false,
				userCount: 0,
				grants: [] as string[],
				lockedGrants: [] as string[],
			},
		}
	}

	const role = await getRoleForEditor(params.id)
	invariantResponse(role, 'Not found', { status: 404 })
	return { isNew: false as const, role }
}

export async function action({ params, request }: Route.ActionArgs) {
	const creating = isCreate(params.id)
	const adminId = await requireUserWithPermission(
		request,
		creating ? 'create:role:any' : 'update:role:any',
	)
	// The acting admin is the audit actor — load the identity fields the trail
	// snapshots (ADR-070). The body parse is independent, so overlap the two.
	const [actor, formData] = await Promise.all([
		prisma.user.findUniqueOrThrow({
			where: { id: adminId },
			select: { id: true, email: true, username: true, name: true },
		}),
		request.formData(),
	])
	const intent = formData.get('intent')

	// Delete (edit mode only): the role goes, so navigate back to the list.
	if (intent === 'delete' && !creating) {
		try {
			await deleteRole({ roleId: params.id, actor })
		} catch (error) {
			if (error instanceof AdminFloorError || error instanceof SystemRoleError) {
				return data({ ok: false as const, blocked: error.message }, { status: 422 })
			}
			throw error
		}
		return redirectWithToast('/admin/roles', {
			type: 'success',
			title: 'Role deleted',
			description: 'The role and its grants were removed.',
		})
	}

	// Save: validate the Details, read the controlled grant set, then persist.
	const parsed = RoleFormSchema.safeParse({
		name: formData.get('name') ?? '',
		description: formData.get('description') ?? '',
	})
	if (!parsed.success) {
		return data(
			{ ok: false as const, errors: parsed.error.flatten().fieldErrors },
			{ status: 400 },
		)
	}
	const grants = formData.getAll('grants').map(String)
	const { name, description } = parsed.data

	try {
		if (creating) {
			const { id } = await createRole({ name, description, grants, actor })
			return redirectWithToast(`/admin/roles/${id}`, {
				type: 'success',
				title: 'Role created',
				description: `“${name}” is ready to assign.`,
			})
		}

		// System roles keep their identity locked but their grants editable, so skip
		// the rename for them (the data layer would refuse it) and only set grants.
		const role = await prisma.role.findUnique({
			where: { id: params.id },
			select: { system: true },
		})
		invariantResponse(role, 'Not found', { status: 404 })
		if (!role.system) {
			await renameRole({ roleId: params.id, name, description, actor })
		}
		await setRoleGrants({ roleId: params.id, grants, actor })
		return data({ ok: true as const })
	} catch (error) {
		if (error instanceof AdminFloorError) {
			return data({ ok: false as const, blocked: error.message }, { status: 422 })
		}
		if (error instanceof DuplicateRoleNameError) {
			return data(
				{ ok: false as const, errors: { name: [error.message] } },
				{ status: 400 },
			)
		}
		throw error
	}
}

/** The grant key the matrix toggles and the data layer stores. */
function grantKey(action: PermissionAction, entity: PermissionEntity, access: PermissionAccess) {
	return `${action}:${entity}:${access}`
}

/** Per-entity row label + glyph for the matrix. */
const ENTITY_META: Record<PermissionEntity, { label: string; icon: IconName }> = {
	user: { label: 'Users', icon: 'avatar' },
	post: { label: 'Posts', icon: 'file-text' },
	audit: { label: 'Audit log', icon: 'clock' },
	role: { label: 'Roles', icon: 'lock-closed' },
}

const ACTION_LABELS: Record<PermissionAction, string> = {
	create: 'Create',
	read: 'Read',
	update: 'Update',
	delete: 'Delete',
}

const ALL_SCOPES: PermissionAccess[] = ['own', 'any']

const LOCK_REASON =
	'Required to keep at least one admin who can manage users and roles.'

/**
 * The permission grant matrix (feature composite, not a `ui/*` primitive): a
 * bordered entity × action grid whose cells hold a `ToggleChip` per scope the
 * entity supports (`own` / `any`). Toggling updates the controlled `grants` set;
 * floor-critical grants the data layer would refuse to strip render locked-on.
 */
function GrantMatrix({
	grants,
	lockedGrants,
	onToggle,
}: {
	grants: Set<string>
	lockedGrants: Set<string>
	onToggle: (key: string, next: boolean) => void
}) {
	return (
		<div className="overflow-x-auto">
			<div
				role="grid"
				aria-label="Permission grants"
				className="border-border grid min-w-[600px] overflow-hidden rounded-lg border"
				style={{ gridTemplateColumns: 'minmax(104px,1.1fr) repeat(4,1fr)' }}
			>
				<div className="text-muted-foreground border-border bg-muted/40 text-body-2xs border-b px-3 py-2 font-medium">
					Resource
				</div>
				{permissionActions.map((action) => (
					<div
						key={action}
						className="text-muted-foreground border-border bg-muted/40 text-body-2xs border-b px-3 py-2 text-center font-medium"
					>
						{ACTION_LABELS[action]}
					</div>
				))}

				{permissionEntities.map((entity) => {
					const scopes = ALL_SCOPES.filter((scope) =>
						(entityAccesses[entity] as readonly string[]).includes(scope),
					)
					return (
						<Fragment key={entity}>
							<div className="border-border flex items-center gap-2 border-b px-3 py-2.5">
								<span className="bg-brand-soft text-brand flex size-6 shrink-0 items-center justify-center rounded-md">
									<Icon name={ENTITY_META[entity].icon} className="size-3.5" />
								</span>
								<span className="text-body-sm font-medium">
									{ENTITY_META[entity].label}
								</span>
							</div>
							{permissionActions.map((action) => (
								<div
									key={action}
									className="border-border flex items-center justify-center gap-1.5 border-b px-2 py-2.5"
								>
									{scopes.map((scope) => {
										const key = grantKey(action, entity, scope)
										return (
											<ToggleChip
												key={scope}
												pressed={grants.has(key)}
												locked={lockedGrants.has(key)}
												lockedReason={LOCK_REASON}
												onPressedChange={(next) => onToggle(key, next)}
												aria-label={`${ACTION_LABELS[action]} ${ENTITY_META[entity].label} (${scope})`}
											>
												{scope}
											</ToggleChip>
										)
									})}
								</div>
							))}
						</Fragment>
					)
				})}
			</div>
		</div>
	)
}

/** Are two grant sets equal? (Used to derive the dirty state.) */
function setsEqual(a: Set<string>, b: Set<string>) {
	return a.size === b.size && [...a].every((value) => b.has(value))
}

/**
 * The role editor (`/admin/roles/$id`, `/admin/roles/new`): a **Details** card
 * (Name + Description, locked for system roles) and a **Permissions** card holding
 * the grant matrix. The matrix is controlled state; a sticky save bar appears only
 * when the form is dirty and submits the whole grant set. Admin-only at the loader
 * (`create:role:any` / `update:role:any`); a floor-breaching change is refused and
 * surfaced as an error alert.
 */
export default function RoleEditor({ loaderData }: Route.ComponentProps) {
	const { isNew, role } = loaderData
	const fetcher = useFetcher<typeof action>()
	const deleteFetcher = useFetcher<typeof action>()
	const dc = useDoubleCheck()

	// Controlled form state, seeded from the loader and re-synced on every
	// revalidation — so a successful save (loader re-reads) clears the dirty bar and
	// a blocked grant change (server rejects, loader unchanged) snaps the chips back.
	const [name, setName] = useState(role.name)
	const [description, setDescription] = useState(role.description)
	const [grants, setGrants] = useState<Set<string>>(() => new Set(role.grants))
	useEffect(() => {
		setName(role.name)
		setDescription(role.description)
		setGrants(new Set(role.grants))
	}, [role])

	const lockedGrants = new Set(role.lockedGrants)

	function toggleGrant(key: string, next: boolean) {
		setGrants((prev) => {
			const updated = new Set(prev)
			if (next) updated.add(key)
			else updated.delete(key)
			return updated
		})
	}

	function discard() {
		setName(role.name)
		setDescription(role.description)
		setGrants(new Set(role.grants))
	}

	const dirty =
		name !== role.name ||
		description !== role.description ||
		!setsEqual(grants, new Set(role.grants))

	const saving = fetcher.state !== 'idle'
	const saveData = fetcher.data
	const fieldErrors: { name?: string[]; description?: string[] } | undefined =
		saveData && !saveData.ok && 'errors' in saveData ? saveData.errors : undefined
	const blockedFrom = (result: typeof fetcher.data) =>
		result && !result.ok && 'blocked' in result ? result.blocked : null
	const blocked = blockedFrom(fetcher.data) ?? blockedFrom(deleteFetcher.data)

	return (
		<TooltipProvider>
		<main className="container max-w-[860px] py-8">
			<Link
				to="/admin/roles"
				className="text-muted-foreground hover:text-foreground focus-cosy text-body-sm mb-4 inline-flex items-center gap-1 rounded-sm font-medium"
			>
				<Icon name="arrow-left" className="size-4" />
				All roles
			</Link>

			<PageHeader
				eyebrow="Access"
				title={isNew ? 'New role' : role.name}
				headingLevel={1}
				className="mb-6"
				actions={
					isNew ? (
						<Badge variant="brand">Custom</Badge>
					) : (
						<Badge variant={role.system ? 'outline' : 'brand'} dot>
							{role.system ? 'System' : 'Custom'}
						</Badge>
					)
				}
			/>

			{blocked ? (
				<Alert tone="error" className="mb-6">
					<AlertTitle>Change blocked</AlertTitle>
					<AlertDescription>{blocked}</AlertDescription>
				</Alert>
			) : null}

			<fetcher.Form method="post" className="flex flex-col gap-6">
				<FormCard
					title="Details"
					description={
						role.system
							? 'System roles are built in — their name and description can’t be changed.'
							: 'Name and describe this role.'
					}
				>
					{role.system ? (
						// A disabled input isn't submitted, so round-trip the locked values in
						// hidden fields and explain the lock on a focusable span.
						<>
							<input type="hidden" name="name" value={role.name} />
							<input type="hidden" name="description" value={role.description} />
							<div className="flex flex-col gap-4">
								<Tooltip>
									<TooltipTrigger asChild>
										<span tabIndex={0}>
											<Field
												label="Name"
												htmlFor="role-name"
												error={fieldErrors?.name?.[0]}
											>
												<Input id="role-name" value={role.name} disabled />
											</Field>
										</span>
									</TooltipTrigger>
									<TooltipContent>
										System roles can’t be renamed.
									</TooltipContent>
								</Tooltip>
								<Field label="Description" htmlFor="role-description">
									<Textarea
										id="role-description"
										value={role.description}
										disabled
									/>
								</Field>
							</div>
						</>
					) : (
						<div className="flex flex-col gap-4">
							<Field label="Name" htmlFor="role-name" error={fieldErrors?.name?.[0]} required>
								<Input
									id="role-name"
									name="name"
									value={name}
									onChange={(event) => setName(event.currentTarget.value)}
									placeholder="e.g. Editor"
									autoComplete="off"
								/>
							</Field>
							<Field
								label="Description"
								htmlFor="role-description"
								error={fieldErrors?.description?.[0]}
							>
								<Textarea
									id="role-description"
									name="description"
									value={description}
									onChange={(event) => setDescription(event.currentTarget.value)}
									placeholder="What can someone with this role do?"
								/>
							</Field>
						</div>
					)}
				</FormCard>

				<FormCard
					title="Permissions"
					description="Toggle the access this role grants. Owner-scoped (own) and broad (any) where applicable."
				>
					<div className="mb-3 flex items-center justify-between gap-2">
						<p className="text-muted-foreground text-body-sm">
							{role.system
								? 'Built-in role — its grants are still editable.'
								: 'Cells locked for the admin floor can’t be turned off.'}
						</p>
						<Badge variant="secondary">
							{grants.size} {grants.size === 1 ? 'grant' : 'grants'}
						</Badge>
					</div>

					{/* Hidden inputs carry the controlled grant set into the submission. */}
					{[...grants].map((key) => (
						<input key={key} type="hidden" name="grants" value={key} />
					))}

					<GrantMatrix
						grants={grants}
						lockedGrants={lockedGrants}
						onToggle={toggleGrant}
					/>
				</FormCard>

				{/* The sticky save bar: visible only when the form is dirty. */}
				{dirty ? (
					<div className="bg-card border-border sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-lg">
						<span className="text-body-sm flex items-center gap-2 font-medium">
							<span className="bg-brand size-2 rounded-full" aria-hidden />
							Unsaved changes
						</span>
						<div className="flex items-center gap-2">
							<Button type="button" variant="ghost" onClick={discard} disabled={saving}>
								Discard
							</Button>
							<StatusButton
								type="submit"
								status={saving ? 'pending' : 'idle'}
								disabled={saving}
							>
								{isNew ? 'Create role' : 'Save changes'}
							</StatusButton>
						</div>
					</div>
				) : null}
			</fetcher.Form>

			{/* Danger zone: delete a custom role (system roles can't be deleted). */}
			{!isNew && !role.system ? (
				<FormCard
					variant="destructive"
					title="Danger zone"
					description="Deleting a role removes it from everyone who holds it."
					className="mt-6"
				>
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-muted-foreground text-body-sm">
							{role.userCount === 0
								? 'No users hold this role.'
								: `${role.userCount} ${role.userCount === 1 ? 'user holds' : 'users hold'} this role.`}
						</p>
						<deleteFetcher.Form method="post" className="shrink-0">
							<input type="hidden" name="intent" value="delete" />
							<StatusButton
								{...dc.getButtonProps({ type: 'submit' })}
								variant="destructive"
								status={deleteFetcher.state !== 'idle' ? 'pending' : 'idle'}
								disabled={deleteFetcher.state !== 'idle'}
							>
								{dc.doubleCheck ? 'Confirm delete' : 'Delete role'}
							</StatusButton>
						</deleteFetcher.Form>
					</div>
				</FormCard>
			) : null}
		</main>
		</TooltipProvider>
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
				404: () => (
					<Alert tone="error" className="max-w-md text-left">
						<AlertTitle>Role not found</AlertTitle>
						<AlertDescription>
							This role doesn’t exist — it may have been deleted.
						</AlertDescription>
					</Alert>
				),
			}}
		/>
	)
}
