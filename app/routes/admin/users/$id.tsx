import { invariantResponse } from '@epic-web/invariant'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { useEffect, useState } from 'react'
import { Link, data, useFetcher } from 'react-router'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Alert, AlertDescription, AlertTitle } from '#app/components/ui/alert.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogOverlay,
	DialogTitle,
} from '#app/components/ui/dialog.tsx'
import { FormCard } from '#app/components/ui/form-card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { PageHeader } from '#app/components/ui/page-header.tsx'
import { Separator } from '#app/components/ui/separator.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { TagInput } from '#app/components/ui/tag-input.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
import { UserAvatar } from '#app/components/user-avatar.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { useDoubleCheck } from '#app/utils/misc.tsx'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { createToastHeaders, redirectWithToast } from '#app/utils/toast.server.ts'
import {
	AdminFloorError,
	SelfDeactivationError,
	SelfDeletionError,
	deleteUser,
	revokeUserSessions,
	sendUserPasswordReset,
	setUserDeactivated,
	setUserRoles,
} from '#app/utils/user-admin.server.ts'
import { formatDate } from '../../blog/__feed.tsx'
import { type Route } from './+types/$id.ts'

export const handle: SEOHandle = {
	// Admin surfaces are never indexed.
	getSitemapEntries: () => null,
}

export const meta: Route.MetaFunction = () => [{ title: 'User — Admin' }]

export async function loader({ params, request }: Route.LoaderArgs) {
	// Managing a user's access requires the broad `update:user:any` — the same
	// permission the mutation guards on, so a viewer who can't change roles never
	// reaches the editor.
	const currentUserId = await requireUserWithPermission(
		request,
		'update:user:any',
	)

	// The user, the assignable-role list, and the live-session count are independent
	// reads — fire together. "Active" sessions are the unexpired ones (what the
	// Sessions card surfaces and Force log out clears).
	const [user, roles, sessionCount] = await Promise.all([
		prisma.user.findUnique({
			where: { id: params.id },
			select: {
				id: true,
				name: true,
				username: true,
				email: true,
				createdAt: true,
				deactivatedAt: true,
				image: { select: { objectKey: true } },
				roles: { select: { name: true }, orderBy: { name: 'asc' } },
			},
		}),
		prisma.role.findMany({ select: { name: true }, orderBy: { name: 'asc' } }),
		prisma.session.count({
			where: { userId: params.id, expirationDate: { gt: new Date() } },
		}),
	])
	invariantResponse(user, 'Not found', { status: 404 })

	return {
		user: { ...user, roles: user.roles.map((r) => r.name) },
		allRoles: roles.map((r) => r.name),
		currentUserId,
		sessionCount,
	}
}

export async function action({ params, request }: Route.ActionArgs) {
	const adminId = await requireUserWithPermission(request, 'update:user:any')
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

	try {
		// Account status: deactivate ↔ reactivate (kills sessions, audited).
		if (intent === 'deactivate' || intent === 'reactivate') {
			const result = await setUserDeactivated({
				userId: params.id,
				deactivated: intent === 'deactivate',
				actor,
			})
			return data({ ok: true as const, ...result })
		}

		// Force log out: drop every live session (audited) without deactivating.
		// Toast-without-nav so the list revalidates and the session count updates.
		if (intent === 'force-logout') {
			const { count } = await revokeUserSessions({ userId: params.id, actor })
			const noun = count === 1 ? 'session' : 'sessions'
			return data(
				{ ok: true as const },
				{
					headers: await createToastHeaders({
						type: 'success',
						title: 'Signed out',
						description: `Ended ${count} active ${noun}.`,
					}),
				},
			)
		}

		// Send reset email: arm the user's own reset-password flow (audited). The
		// admin never sets or sees a password — the toast just reports the send.
		if (intent === 'send-reset') {
			const { status } = await sendUserPasswordReset({
				userId: params.id,
				request,
				actor,
			})
			const toast =
				status === 'success'
					? {
							type: 'success' as const,
							title: 'Reset email sent',
							description: 'The user can set a new password from the link.',
						}
					: {
							type: 'error' as const,
							title: 'Couldn’t send email',
							description: 'The reset email failed to send — please try again.',
						}
			return data(
				{ ok: true as const },
				{ headers: await createToastHeaders(toast) },
			)
		}

		// Delete: the irreversible cascade (audited). On success the account is gone,
		// so navigate back to the list with a toast rather than re-rendering it.
		if (intent === 'delete') {
			await deleteUser({ userId: params.id, actor })
			return redirectWithToast('/admin/users', {
				type: 'success',
				title: 'User deleted',
				description: 'The account was permanently deleted.',
			})
		}

		// Default intent: set the user's roles to the submitted set.
		const roleNames = formData.getAll('roles').map(String)
		const result = await setUserRoles({ userId: params.id, roleNames, actor })
		return data({ ok: true as const, ...result })
	} catch (error) {
		// The admin-floor invariant and the self-action guards (ADR-069) are the
		// expected rejections — surface them as the explanatory blocked-operation
		// dialog (with a context-appropriate title), not a generic 500.
		if (
			error instanceof AdminFloorError ||
			error instanceof SelfDeactivationError ||
			error instanceof SelfDeletionError
		) {
			const kind =
				intent === 'delete'
					? ('deletion' as const)
					: intent === 'deactivate' || intent === 'reactivate'
						? ('deactivation' as const)
						: ('role' as const)
			return data(
				{ ok: false as const, blocked: error.message, kind },
				{ status: 422 },
			)
		}
		throw error
	}
}

/** The display name — the user's name, falling back to their username. */
function displayName(user: { name: string | null; username: string }) {
	return user.name ?? user.username
}

/** A label / value meta row in the Identity card (value muted, optional mono). */
function MetaRow({
	label,
	children,
	mono = false,
}: {
	label: string
	children: React.ReactNode
	mono?: boolean
}) {
	return (
		<div className="flex items-baseline justify-between gap-4">
			<dt className="text-muted-foreground text-body-sm">{label}</dt>
			<dd className={mono ? 'text-body-sm font-mono' : 'text-body-sm'}>
				{children}
			</dd>
		</div>
	)
}

/** The blocked-dialog copy for each operation that the admin floor can refuse. */
const BLOCKED_COPY = {
	role: {
		title: 'Can’t remove the last admin',
		hint: 'grant another account an admin role first, then revoke this one.',
	},
	deactivation: {
		title: 'Can’t deactivate the last admin',
		hint: 'grant another account an admin role first, then deactivate this one.',
	},
	deletion: {
		title: 'Can’t delete the last admin',
		hint: 'grant another account an admin role first, then delete this one.',
	},
} as const

type BlockedKind = keyof typeof BLOCKED_COPY

/**
 * The blocked-operation dialog (GROUNDED-SPEC Surface 2): why the change was
 * refused plus what to do instead. A transient client overlay driven by the
 * action result (ADR-023 keeps it off a route — it's not bookmarkable). Opens
 * whenever the latest submission came back blocked; closing dismisses it. The
 * `kind` (revoke vs. deactivate) selects the title/hint copy, so it always names
 * the right action.
 */
function AdminFloorDialog({
	kind,
	message,
	open,
	onClose,
}: {
	kind: BlockedKind
	message: string
	open: boolean
	onClose: () => void
}) {
	const { title, hint } = BLOCKED_COPY[kind]
	return (
		<Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
			<DialogOverlay />
			<DialogContent aria-describedby="admin-floor-desc">
				<div className="text-destructive flex items-center gap-2">
					<Icon name="lock-closed" className="size-5" aria-hidden />
					<DialogTitle>{title}</DialogTitle>
				</div>
				<DialogDescription id="admin-floor-desc" className="mt-2">
					{message}
				</DialogDescription>
				<div className="border-border text-muted-foreground text-body-sm mt-4 rounded-md border p-3">
					<span className="text-foreground font-medium">What to do instead:</span>{' '}
					{hint}
				</div>
				<div className="mt-6 flex justify-end">
					<DialogClose asChild>
						<Button type="button" variant="ghost">
							Close
						</Button>
					</DialogClose>
				</div>
			</DialogContent>
		</Dialog>
	)
}

/**
 * The delete-user confirmation (GROUNDED-SPEC Surface 2, Danger card): a transient
 * client overlay (ADR-023 — destructive and not bookmarkable) whose confirm button
 * is a `useDoubleCheck` two-stage so the irreversible cascade always takes a
 * deliberate second click. Submits `intent=delete`; on success the action
 * navigates away (the account is gone), so this dialog is for the same-page guard
 * rails only.
 */
function DeleteUserDialog({
	name,
	open,
	onClose,
	fetcher,
}: {
	name: string
	open: boolean
	onClose: () => void
	fetcher: ReturnType<typeof useFetcher<typeof action>>
}) {
	const dc = useDoubleCheck()
	const pending = fetcher.state !== 'idle'
	return (
		<Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
			<DialogOverlay />
			<DialogContent aria-describedby="delete-user-desc">
				<div className="text-destructive flex items-center gap-2">
					<Icon name="trash" className="size-5" aria-hidden />
					<DialogTitle>Delete {name}?</DialogTitle>
				</div>
				<DialogDescription id="delete-user-desc" className="mt-2">
					This permanently deletes the account and its sessions, password, images,
					connections and passkeys. Authored posts are kept with the author
					credit removed. This can’t be undone.
				</DialogDescription>
				<fetcher.Form method="post" className="mt-6 flex justify-end gap-2">
					<input type="hidden" name="intent" value="delete" />
					<DialogClose asChild>
						<Button type="button" variant="ghost">
							Cancel
						</Button>
					</DialogClose>
					<StatusButton
						{...dc.getButtonProps({ type: 'submit' })}
						variant="destructive"
						status={pending ? 'pending' : 'idle'}
						disabled={pending}
					>
						{dc.doubleCheck ? 'Confirm delete' : 'Delete user'}
					</StatusButton>
				</fetcher.Form>
			</DialogContent>
		</Dialog>
	)
}

/** A blocked action result reduced to its message + which copy to show, or null. */
function blockedResult(
	data: { ok: boolean; blocked?: string; kind?: string } | undefined,
) {
	if (!data || data.ok || !data.blocked) return null
	const kind: BlockedKind =
		data.kind === 'deactivation' || data.kind === 'deletion'
			? data.kind
			: 'role'
	return { message: data.blocked, kind }
}

/**
 * The admin user detail (`/admin/users/$id`): an Identity card (avatar +
 * name/email + meta) and a Roles card where assigned roles show as removable
 * chips with an assign combobox (`TagInput`, resolve-to-existing only). Each edit
 * auto-submits and persists via `setUserRoles`; a revoke that would remove the
 * last capable admin is refused by the admin-floor invariant and surfaces the
 * blocked-operation dialog. Admin-only at the loader (`update:user:any`).
 */
export default function AdminUserDetail({ loaderData }: Route.ComponentProps) {
	const { user, allRoles, currentUserId, sessionCount } = loaderData
	const fetcher = useFetcher<typeof action>()
	const statusFetcher = useFetcher<typeof action>()
	const logoutFetcher = useFetcher<typeof action>()
	const resetFetcher = useFetcher<typeof action>()
	const deleteFetcher = useFetcher<typeof action>()

	// The roles editor is optimistic: local state leads, then reconciles with the
	// server on every revalidation — so a blocked revoke (server rejects, loader
	// re-reads the unchanged roles) snaps the chip back automatically.
	const [roles, setRoles] = useState(user.roles)
	useEffect(() => {
		setRoles(user.roles)
	}, [user.roles])

	function commitRoles(next: string[]) {
		setRoles(next)
		const formData = new FormData()
		for (const role of next) formData.append('roles', role)
		void fetcher.submit(formData, { method: 'post' })
	}

	// The blocked-operation dialog opens on a blocked result and stays open until
	// dismissed; a fresh submission clears the dismissal so a repeat block reopens
	// it (the message string alone wouldn't change). Roles, account status, or a
	// delete can each breach the floor, so read from whichever came back blocked —
	// the `kind` selects the right title/hint.
	const blocked =
		blockedResult(statusFetcher.data) ??
		blockedResult(deleteFetcher.data) ??
		blockedResult(fetcher.data)
	const [dismissed, setDismissed] = useState(false)
	useEffect(() => {
		setDismissed(false)
	}, [fetcher.data, statusFetcher.data, deleteFetcher.data])
	const dialogOpen = Boolean(blocked) && !dismissed

	// The delete confirmation is opened from the Danger card; a blocked delete
	// closes it so the explanatory blocked dialog takes over cleanly.
	const [deleteOpen, setDeleteOpen] = useState(false)
	useEffect(() => {
		if (deleteFetcher.data && !deleteFetcher.data.ok) setDeleteOpen(false)
	}, [deleteFetcher.data])

	const active = user.deactivatedAt == null
	const isSelf = user.id === currentUserId
	const statusPending = statusFetcher.state !== 'idle'
	const logoutPending = logoutFetcher.state !== 'idle'
	const resetPending = resetFetcher.state !== 'idle'
	const name = displayName(user)

	return (
		<main className="container max-w-3xl py-8">
			<Link
				to="/admin/users"
				className="text-muted-foreground hover:text-foreground focus-cosy text-body-sm mb-4 inline-flex items-center gap-1 rounded-sm font-medium"
			>
				<Icon name="arrow-left" className="size-4" />
				All users
			</Link>

			<PageHeader
				eyebrow="Access"
				title={name}
				headingLevel={1}
				className="mb-6"
				actions={
					<Badge variant={active ? 'brand' : 'outline'} dot>
						{active ? 'Active' : 'Deactivated'}
					</Badge>
				}
			/>

			<div className="flex flex-col gap-6">
				<FormCard title="Identity">
					<div className="flex items-center gap-4">
						<UserAvatar
							name={name}
							imageObjectKey={user.image?.objectKey}
							className="size-14"
							fallbackClassName="bg-brand-soft text-brand"
						/>
						<div className="flex min-w-0 flex-col">
							<span className="font-semibold">{name}</span>
							<span className="text-muted-foreground text-body-sm truncate">
								{user.email}
							</span>
						</div>
					</div>

					<Separator className="my-4" />

					<dl className="flex flex-col gap-2">
						<MetaRow label="Joined">{formatDate(user.createdAt)}</MetaRow>
						<MetaRow label="User ID" mono>
							{user.id}
						</MetaRow>
					</dl>
				</FormCard>

				<FormCard
					title="Roles"
					description="Assign or revoke this user’s roles. Changes save automatically."
				>
					<TagInput
						aria-label="Assign roles"
						placeholder="Assign a role…"
						suggestions={allRoles}
						value={roles}
						onChange={commitRoles}
						allowCreate={false}
					/>
				</FormCard>

				<FormCard
					title="Account status"
					description={
						active
							? 'This account is active and can sign in.'
							: 'This account is deactivated and cannot sign in.'
					}
				>
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-muted-foreground text-body-sm">
							{active
								? 'Deactivating ends every active session and blocks sign-in. The account’s content is kept and access can be restored.'
								: 'Reactivating restores sign-in. No content was lost while deactivated.'}
						</p>
						<statusFetcher.Form method="post" className="shrink-0">
							<input
								type="hidden"
								name="intent"
								value={active ? 'deactivate' : 'reactivate'}
							/>
							{isSelf ? (
								// You can't deactivate your own account — disable the control and
								// explain why on a focusable span (a disabled button can't trigger
								// the tooltip itself).
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<span tabIndex={0}>
												<Button type="button" variant="outline" disabled>
													Deactivate
												</Button>
											</span>
										</TooltipTrigger>
										<TooltipContent>
											You can’t deactivate your own account.
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							) : (
								<StatusButton
									type="submit"
									variant="outline"
									status={statusPending ? 'pending' : 'idle'}
									disabled={statusPending}
								>
									{active ? 'Deactivate' : 'Reactivate'}
								</StatusButton>
							)}
						</statusFetcher.Form>
					</div>
				</FormCard>

				<FormCard
					title="Sessions & security"
					description="Revoke active sessions or send the user a password-reset link."
				>
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="min-w-0">
							<p className="text-body-sm font-medium">
								Active sessions ({sessionCount})
							</p>
							<p className="text-muted-foreground text-body-sm">
								Force log out ends every active session; the user can sign back
								in.
							</p>
						</div>
						<logoutFetcher.Form method="post" className="shrink-0">
							<input type="hidden" name="intent" value="force-logout" />
							<StatusButton
								type="submit"
								variant="outline"
								status={logoutPending ? 'pending' : 'idle'}
								disabled={logoutPending || sessionCount === 0}
							>
								Force log out
							</StatusButton>
						</logoutFetcher.Form>
					</div>

					<Separator className="my-4" />

					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="min-w-0">
							<p className="text-body-sm font-medium">Password</p>
							<p className="text-muted-foreground text-body-sm">
								Send a reset link to {user.email}. You never see or set their
								password.
							</p>
						</div>
						<resetFetcher.Form method="post" className="shrink-0">
							<input type="hidden" name="intent" value="send-reset" />
							<StatusButton
								type="submit"
								variant="outline"
								status={resetPending ? 'pending' : 'idle'}
								disabled={resetPending}
							>
								Send reset email
							</StatusButton>
						</resetFetcher.Form>
					</div>
				</FormCard>

				<FormCard
					variant="destructive"
					title="Danger zone"
					description="Irreversible actions. Proceed with care."
				>
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-muted-foreground text-body-sm">
							Permanently delete this account and its data. Authored posts are
							kept with the author credit removed.
						</p>
						{isSelf ? (
							// You can't delete your own account — disable the control and
							// explain why on a focusable span (a disabled button can't trigger
							// the tooltip itself).
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<span tabIndex={0} className="shrink-0">
											<Button type="button" variant="destructive" disabled>
												Delete user…
											</Button>
										</span>
									</TooltipTrigger>
									<TooltipContent>
										You can’t delete your own account.
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						) : (
							<Button
								type="button"
								variant="destructive"
								className="shrink-0"
								onClick={() => setDeleteOpen(true)}
							>
								Delete user…
							</Button>
						)}
					</div>
				</FormCard>
			</div>

			{blocked ? (
				<AdminFloorDialog
					kind={blocked.kind}
					message={blocked.message}
					open={dialogOpen}
					onClose={() => setDismissed(true)}
				/>
			) : null}

			{isSelf ? null : (
				<DeleteUserDialog
					name={name}
					open={deleteOpen}
					onClose={() => setDeleteOpen(false)}
					fetcher={deleteFetcher}
				/>
			)}
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
				404: () => (
					<Alert tone="error" className="max-w-md text-left">
						<AlertTitle>User not found</AlertTitle>
						<AlertDescription>
							This account doesn’t exist — it may have been deleted.
						</AlertDescription>
					</Alert>
				),
			}}
		/>
	)
}
