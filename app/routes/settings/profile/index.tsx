import {
	getFormProps,
	getInputProps,
	useForm,
	useInputControl,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { Img } from 'openimg/react'
import { type ReactNode, useRef } from 'react'
import { data, Link, useFetcher } from 'react-router'
import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { FormCard } from '#app/components/ui/form-card.tsx'
import { Icon, type IconName } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { Switch } from '#app/components/ui/switch.tsx'
import { requireUserId, sessionKey } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { getUserImgSrc, useDoubleCheck } from '#app/utils/misc.tsx'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { twoFAVerificationType } from '#app/utils/two-factor.ts'
import { updateUserPreferences } from '#app/utils/user-preferences.server.ts'
import { NameSchema, UsernameSchema } from '#app/utils/user-validation.ts'
import { type Route } from './+types/index.ts'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

const ProfileFormSchema = z.object({
	name: NameSchema.nullable().default(null),
	username: UsernameSchema,
})

const PreferencesFormSchema = z.object({
	allowProductEmails: z.boolean().optional(),
})

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			username: true,
			email: true,
			allowProductEmails: true,
			image: {
				select: { objectKey: true },
			},
			_count: {
				select: {
					sessions: {
						where: {
							expirationDate: { gt: new Date() },
						},
					},
				},
			},
		},
	})

	const twoFactorVerification = await prisma.verification.findUnique({
		select: { id: true },
		where: { target_type: { type: twoFAVerificationType, target: userId } },
	})

	const password = await prisma.password.findUnique({
		select: { userId: true },
		where: { userId },
	})

	return {
		user,
		hasPassword: Boolean(password),
		isTwoFactorEnabled: Boolean(twoFactorVerification),
		allowProductEmails: user.allowProductEmails,
	}
}

type ProfileActionArgs = {
	request: Request
	userId: string
	formData: FormData
}
const profileUpdateActionIntent = 'update-profile'
const preferencesUpdateActionIntent = 'update-preferences'
const signOutOfSessionsActionIntent = 'sign-out-of-sessions'
const deleteDataActionIntent = 'delete-data'

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const intent = formData.get('intent')
	switch (intent) {
		case profileUpdateActionIntent: {
			return profileUpdateAction({ request, userId, formData })
		}
		case preferencesUpdateActionIntent: {
			return preferencesUpdateAction({ request, userId, formData })
		}
		case signOutOfSessionsActionIntent: {
			return signOutOfSessionsAction({ request, userId, formData })
		}
		case deleteDataActionIntent: {
			return deleteDataAction({ request, userId, formData })
		}
		default: {
			throw new Response(`Invalid intent "${intent}"`, { status: 400 })
		}
	}
}

/** A branded hub row linking to a settings sub-page or resource. */
function AccountLinkRow({
	to,
	icon,
	children,
	reloadDocument,
	download,
}: {
	to: string
	icon: IconName
	children: ReactNode
	/** Trigger a full document navigation (for the data-download resource). */
	reloadDocument?: boolean
	/** Suggested filename when the target is a download. */
	download?: string
}) {
	return (
		<li>
			<Link
				to={to}
				reloadDocument={reloadDocument}
				download={download}
				className="group hover:bg-muted -mx-3 flex items-center gap-3 rounded-lg px-3 py-3 transition-colors"
			>
				<Icon
					name={icon}
					className="text-muted-foreground size-4 shrink-0"
				/>
				<span className="flex-1">{children}</span>
				<Icon
					name="arrow-right"
					className="text-muted-foreground/60 group-hover:text-brand size-4 shrink-0 transition-colors"
				/>
			</Link>
		</li>
	)
}

export default function EditUserProfile({ loaderData }: Route.ComponentProps) {
	return (
		<div className="flex flex-col gap-8">
			<FormCard
				title="Profile"
				description="Your photo, name, and username."
			>
				<div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start">
					<div className="relative size-40 shrink-0">
						<Img
							src={getUserImgSrc(loaderData.user.image?.objectKey)}
							alt={loaderData.user.name ?? loaderData.user.username}
							className="h-full w-full rounded-full object-cover"
							width={832}
							height={832}
							isAboveFold
						/>
						<Button
							asChild
							variant="outline"
							className="absolute top-1 -right-1 flex size-10 items-center justify-center rounded-full p-0"
						>
							<Link
								preventScrollReset
								to="photo"
								title="Change profile photo"
								aria-label="Change profile photo"
							>
								<Icon name="camera" className="size-4" />
							</Link>
						</Button>
					</div>
					<div className="w-full flex-1">
						<UpdateProfile loaderData={loaderData} />
					</div>
				</div>
			</FormCard>

			<FormCard title="Account & security">
				<ul className="flex flex-col">
					<AccountLinkRow to="change-email" icon="envelope-closed">
						Change email from {loaderData.user.email}
					</AccountLinkRow>
					<AccountLinkRow
						to="two-factor"
						icon={loaderData.isTwoFactorEnabled ? 'lock-closed' : 'lock-open-1'}
					>
						{loaderData.isTwoFactorEnabled ? '2FA is enabled' : 'Enable 2FA'}
					</AccountLinkRow>
					<AccountLinkRow
						to={loaderData.hasPassword ? 'password' : 'password/create'}
						icon="dots-horizontal"
					>
						{loaderData.hasPassword ? 'Change Password' : 'Create a Password'}
					</AccountLinkRow>
					<AccountLinkRow to="connections" icon="link-2">
						Manage connections
					</AccountLinkRow>
					<AccountLinkRow to="passkeys" icon="passkey">
						Manage passkeys
					</AccountLinkRow>
					<AccountLinkRow
						to="/resources/download-user-data"
						icon="download"
						reloadDocument
						download="my-epic-notes-data.json"
					>
						Download your data
					</AccountLinkRow>
				</ul>
			</FormCard>

			<FormCard
				title="Preferences"
				description="Choose what lands in your inbox."
			>
				<Preferences loaderData={loaderData} />
			</FormCard>

			<FormCard
				title="Active sessions"
				description="Sign out everywhere except this device."
			>
				<SignOutOfSessions loaderData={loaderData} />
			</FormCard>

			<FormCard
				variant="destructive"
				title="Delete account & data"
				description="Permanently delete your account and all of its data. This cannot be undone."
			>
				<DeleteData />
			</FormCard>
		</div>
	)
}

async function profileUpdateAction({ userId, formData }: ProfileActionArgs) {
	const submission = await parseWithZod(formData, {
		async: true,
		schema: ProfileFormSchema.superRefine(async ({ username }, ctx) => {
			const existingUsername = await prisma.user.findUnique({
				where: { username },
				select: { id: true },
			})
			if (existingUsername && existingUsername.id !== userId) {
				ctx.addIssue({
					path: ['username'],
					code: z.ZodIssueCode.custom,
					message: 'A user already exists with this username',
				})
			}
		}),
	})
	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { username, name } = submission.value

	await prisma.user.update({
		select: { username: true },
		where: { id: userId },
		data: {
			name: name,
			username: username,
		},
	})

	return {
		result: submission.reply(),
	}
}

async function preferencesUpdateAction({
	userId,
	formData,
}: ProfileActionArgs) {
	const submission = parseWithZod(formData, { schema: PreferencesFormSchema })
	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	// An unchecked Switch submits no value, so absence means "opted out".
	await updateUserPreferences(userId, {
		allowProductEmails: submission.value.allowProductEmails ?? false,
	})

	return { result: submission.reply() }
}

function Preferences({
	loaderData,
}: {
	loaderData: Route.ComponentProps['loaderData']
}) {
	const fetcher = useFetcher<typeof preferencesUpdateAction>()
	const formRef = useRef<HTMLFormElement>(null)

	const [form, fields] = useForm({
		id: 'edit-preferences',
		constraint: getZodConstraint(PreferencesFormSchema),
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: PreferencesFormSchema })
		},
		defaultValue: {
			allowProductEmails: loaderData.allowProductEmails ? 'on' : '',
		},
	})

	// Drive the Radix Switch as a Conform-controlled checkbox: 'on' when opted
	// in, '' when opted out. Toggling submits immediately — a preference toggle
	// shouldn't need a separate Save press.
	const allowProductEmails = useInputControl(fields.allowProductEmails)
	const checked = allowProductEmails.value === 'on'

	return (
		<fetcher.Form method="POST" ref={formRef} {...getFormProps(form)}>
			<input
				type="hidden"
				name="intent"
				value={preferencesUpdateActionIntent}
			/>
			<div className="flex items-center justify-between gap-4">
				<label htmlFor={fields.allowProductEmails.id} className="flex-1">
					<span className="text-body-sm block font-medium">Product emails</span>
					<span className="text-muted-foreground text-body-xs block">
						Occasional product news and updates. Account and security emails are
						always sent.
					</span>
				</label>
				<Switch
					id={fields.allowProductEmails.id}
					checked={checked}
					onCheckedChange={(state) => {
						allowProductEmails.change(state ? 'on' : '')
						formRef.current?.requestSubmit()
					}}
					onFocus={() => allowProductEmails.focus()}
					onBlur={() => allowProductEmails.blur()}
				/>
			</div>
			<ErrorList
				errors={fields.allowProductEmails.errors}
				id={fields.allowProductEmails.errorId}
			/>
		</fetcher.Form>
	)
}

function UpdateProfile({
	loaderData,
}: {
	loaderData: Route.ComponentProps['loaderData']
}) {
	const fetcher = useFetcher<typeof profileUpdateAction>()

	const [form, fields] = useForm({
		id: 'edit-profile',
		constraint: getZodConstraint(ProfileFormSchema),
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ProfileFormSchema })
		},
		defaultValue: {
			username: loaderData.user.username,
			name: loaderData.user.name,
		},
	})

	return (
		<fetcher.Form method="POST" {...getFormProps(form)}>
			<div className="grid grid-cols-6 gap-x-10">
				<Field
					className="col-span-3"
					labelProps={{
						htmlFor: fields.username.id,
						children: 'Username',
					}}
					inputProps={getInputProps(fields.username, { type: 'text' })}
					errors={fields.username.errors}
				/>
				<Field
					className="col-span-3"
					labelProps={{ htmlFor: fields.name.id, children: 'Name' }}
					inputProps={getInputProps(fields.name, { type: 'text' })}
					errors={fields.name.errors}
				/>
			</div>

			<ErrorList errors={form.errors} id={form.errorId} />

			<div className="mt-8 flex justify-center">
				<StatusButton
					type="submit"
					size="wide"
					name="intent"
					value={profileUpdateActionIntent}
					status={
						fetcher.state !== 'idle' ? 'pending' : (form.status ?? 'idle')
					}
				>
					Save changes
				</StatusButton>
			</div>
		</fetcher.Form>
	)
}

async function signOutOfSessionsAction({ request, userId }: ProfileActionArgs) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const sessionId = authSession.get(sessionKey)
	invariantResponse(
		sessionId,
		'You must be authenticated to sign out of other sessions',
	)
	await prisma.session.deleteMany({
		where: {
			userId,
			id: { not: sessionId },
		},
	})
	return { status: 'success' } as const
}

function SignOutOfSessions({
	loaderData,
}: {
	loaderData: Route.ComponentProps['loaderData']
}) {
	const dc = useDoubleCheck()

	const fetcher = useFetcher<typeof signOutOfSessionsAction>()
	const otherSessionsCount = loaderData.user._count.sessions - 1
	return (
		<div>
			{otherSessionsCount ? (
				<fetcher.Form method="POST">
					<StatusButton
						{...dc.getButtonProps({
							type: 'submit',
							name: 'intent',
							value: signOutOfSessionsActionIntent,
						})}
						variant={dc.doubleCheck ? 'destructive' : 'default'}
						status={
							fetcher.state !== 'idle'
								? 'pending'
								: (fetcher.data?.status ?? 'idle')
						}
					>
						<Icon name="avatar">
							{dc.doubleCheck
								? `Are you sure?`
								: `Sign out of ${otherSessionsCount} other sessions`}
						</Icon>
					</StatusButton>
				</fetcher.Form>
			) : (
				<Icon name="avatar">This is your only session</Icon>
			)}
		</div>
	)
}

async function deleteDataAction({ userId }: ProfileActionArgs) {
	await prisma.user.delete({ where: { id: userId } })
	return redirectWithToast('/', {
		type: 'success',
		title: 'Data Deleted',
		description: 'All of your data has been deleted',
	})
}

function DeleteData() {
	const dc = useDoubleCheck()

	const fetcher = useFetcher<typeof deleteDataAction>()
	return (
		<div>
			<fetcher.Form method="POST">
				<StatusButton
					{...dc.getButtonProps({
						type: 'submit',
						name: 'intent',
						value: deleteDataActionIntent,
					})}
					variant={dc.doubleCheck ? 'destructive' : 'default'}
					status={fetcher.state !== 'idle' ? 'pending' : 'idle'}
				>
					<Icon name="trash">
						{dc.doubleCheck ? `Are you sure?` : `Delete all your data`}
					</Icon>
				</StatusButton>
			</fetcher.Form>
		</div>
	)
}
