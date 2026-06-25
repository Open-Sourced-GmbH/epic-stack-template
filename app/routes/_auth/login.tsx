import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { startAuthentication } from '@simplewebauthn/browser'
import { useOptimistic, useState, useTransition } from 'react'
import { data, Form, Link, useNavigate, useSearchParams } from 'react-router'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { CheckboxField, ErrorList, Field } from '#app/components/forms.tsx'
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from '#app/components/ui/alert.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { FormCard } from '#app/components/ui/form-card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Separator } from '#app/components/ui/separator.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { login, requireAnonymous } from '#app/utils/auth.server.ts'
import {
	ProviderConnectionForm,
	providerNames,
} from '#app/utils/connections.tsx'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { getErrorMessage, useIsPending } from '#app/utils/misc.tsx'
import { handleNewSession } from '#app/utils/two-factor.server.ts'
import { PasswordSchema, UsernameSchema } from '#app/utils/user-validation.ts'
import { type Route } from './+types/login.ts'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

const LoginFormSchema = z.object({
	username: UsernameSchema,
	password: PasswordSchema,
	redirectTo: z.string().optional(),
	remember: z.boolean().optional(),
})

const AuthenticationOptionsSchema = z.object({
	options: z.object({ challenge: z.string() }),
}) satisfies z.ZodType<{ options: PublicKeyCredentialRequestOptionsJSON }>

export async function loader({ request }: Route.LoaderArgs) {
	await requireAnonymous(request)
	return {}
}

export async function action({ request }: Route.ActionArgs) {
	await requireAnonymous(request)
	const formData = await request.formData()
	await checkHoneypot(formData)
	const submission = await parseWithZod(formData, {
		schema: (intent) =>
			LoginFormSchema.transform(async (data, ctx) => {
				if (intent !== null) return { ...data, outcome: null }

				const outcome = await login(data)
				// Only a bad username/password is a credential error; a deactivated
				// account passes through so the route can show the suspended notice.
				if (outcome.status === 'invalid') {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: 'Invalid username or password',
					})
					return z.NEVER
				}

				return { ...data, outcome }
			}),
		async: true,
	})

	if (submission.status !== 'success' || !submission.value.outcome) {
		return data(
			{ result: submission.reply({ hideFields: ['password'] }) },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { outcome, remember, redirectTo } = submission.value

	// A deactivated account: the credentials were valid, but there's no session —
	// render the "account is deactivated" state (story 33) instead of redirecting.
	if (outcome.status === 'deactivated') {
		return data({ deactivated: { email: outcome.email } })
	}

	return handleNewSession({
		request,
		session: outcome.session,
		remember: remember ?? false,
		redirectTo,
	})
}

export default function LoginPage({ actionData }: Route.ComponentProps) {
	const isPending = useIsPending()
	const [searchParams] = useSearchParams()
	const redirectTo = searchParams.get('redirectTo')

	// A deactivated sign-in attempt swaps the whole form for the suspended notice.
	const deactivated =
		actionData && 'deactivated' in actionData ? actionData.deactivated : null

	const [form, fields] = useForm({
		id: 'login-form',
		constraint: getZodConstraint(LoginFormSchema),
		defaultValue: { redirectTo },
		lastResult: actionData && 'result' in actionData ? actionData.result : undefined,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: LoginFormSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	// Invalid credentials surface as a form-level error (no field path), so we
	// raise it in an `Alert` and mark both fields `aria-invalid` to drive the
	// `--input-invalid` ring — without touching the frozen validation logic.
	const formErrors = form.errors?.length ? form.errors : null
	const credentialInvalid = formErrors ? { 'aria-invalid': true as const } : {}

	if (deactivated) {
		return <DeactivatedNotice email={deactivated.email} />
	}

	return (
		<div className="w-full max-w-[360px]">
			<div className="flex flex-col gap-2 text-center">
				<p className="text-brand text-sm font-semibold tracking-wide uppercase">
					Welcome back
				</p>
				<h1 className="text-h4">Sign in to your account</h1>
				<p className="text-muted-foreground text-body-sm">
					Enter your details to continue.
				</p>
			</div>

			<FormCard className="mt-6 p-6 text-left">
				<Form method="POST" {...getFormProps(form)}>
					<HoneypotInputs />
					{formErrors ? (
						<Alert tone="error" className="mb-4">
							<ErrorList errors={formErrors} id={form.errorId} />
						</Alert>
					) : null}
					<Field
						labelProps={{ children: 'Username' }}
						inputProps={{
							...getInputProps(fields.username, { type: 'text' }),
							autoFocus: true,
							className: 'lowercase',
							autoComplete: 'username',
							...credentialInvalid,
						}}
						errors={fields.username.errors}
					/>

					<Field
						labelProps={{ children: 'Password' }}
						inputProps={{
							...getInputProps(fields.password, {
								type: 'password',
							}),
							autoComplete: 'current-password',
							...credentialInvalid,
						}}
						errors={fields.password.errors}
					/>

					<div className="flex items-center justify-between">
						<CheckboxField
							labelProps={{
								htmlFor: fields.remember.id,
								children: 'Remember me',
							}}
							buttonProps={getInputProps(fields.remember, {
								type: 'checkbox',
							})}
							errors={fields.remember.errors}
						/>
						<Link
							to="/forgot-password"
							className="text-brand text-body-xs font-semibold"
						>
							Forgot password?
						</Link>
					</div>

					<input {...getInputProps(fields.redirectTo, { type: 'hidden' })} />

					<StatusButton
						className="mt-2 w-full"
						status={isPending ? 'pending' : (form.status ?? 'idle')}
						type="submit"
						disabled={isPending}
					>
						Log in
					</StatusButton>
				</Form>

				<Separator label="or continue with" className="my-6" />

				<div className="flex flex-col gap-3">
					<PasskeyLogin
						redirectTo={redirectTo}
						remember={fields.remember.value === 'on'}
					/>
					{providerNames.map((providerName) => (
						<ProviderConnectionForm
							key={providerName}
							type="Login"
							providerName={providerName}
							redirectTo={redirectTo}
						/>
					))}
				</div>
			</FormCard>

			<p className="text-muted-foreground text-body-sm mt-6 text-center">
				New here?{' '}
				<Link
					to={
						redirectTo
							? `/signup?redirectTo=${encodeURIComponent(redirectTo)}`
							: '/signup'
					}
					className="text-brand font-semibold"
				>
					Create an account
				</Link>
			</p>
		</div>
	)
}

/**
 * The deactivated sign-in state (story 33): the credentials were valid but the
 * account is deactivated, so there's no session. Rendered in the minimal auth
 * shell — an "Access suspended" alert naming the account and reassuring the user
 * their data is safe, plus a way to reach an admin and to step back to sign-in.
 */
function DeactivatedNotice({ email }: { email: string }) {
	return (
		<div className="w-full max-w-[380px]">
			<div className="flex flex-col gap-2 text-center">
				<p className="text-brand text-sm font-semibold tracking-wide uppercase">
					Account access
				</p>
				<h1 className="text-h4">This account is deactivated</h1>
				<p className="text-muted-foreground text-body-sm">
					An administrator has suspended access to this account.
				</p>
			</div>

			<FormCard className="mt-6 p-6 text-left">
				<Alert tone="error">
					<AlertTitle>Access suspended</AlertTitle>
					<AlertDescription>
						Access for <span className="font-medium">{email}</span> has been
						suspended. Your data is safe and nothing has been deleted — an
						administrator can restore access.
					</AlertDescription>
				</Alert>

				<div className="mt-6 flex flex-col gap-3">
					<Button asChild size="wide">
						<Link to="/support">Contact an administrator</Link>
					</Button>
					<Button asChild variant="ghost" size="wide">
						<Link to="/login">Back to sign in</Link>
					</Button>
				</div>
			</FormCard>

			<p className="text-muted-foreground text-body-sm mt-6 text-center">
				Need help?{' '}
				<Link to="/support" className="text-brand font-semibold">
					Contact support
				</Link>
			</p>
		</div>
	)
}

const VerificationResponseSchema = z.discriminatedUnion('status', [
	z.object({
		status: z.literal('success'),
		location: z.string(),
	}),
	z.object({
		status: z.literal('error'),
		error: z.string(),
	}),
])

function PasskeyLogin({
	redirectTo,
	remember,
}: {
	redirectTo: string | null
	remember: boolean
}) {
	const [isPending] = useTransition()
	const [error, setError] = useState<string | null>(null)
	const [passkeyMessage, setPasskeyMessage] = useOptimistic<string | null>(
		'Login with a passkey',
	)
	const navigate = useNavigate()

	async function handlePasskeyLogin() {
		try {
			setPasskeyMessage('Generating Authentication Options')
			// Get authentication options from the server
			const optionsResponse = await fetch('/webauthn/authentication')
			const json = await optionsResponse.json()
			const { options } = AuthenticationOptionsSchema.parse(json)

			setPasskeyMessage('Requesting your authorization')
			const authResponse = await startAuthentication({ optionsJSON: options })
			setPasskeyMessage('Verifying your passkey')

			// Verify the authentication with the server
			const verificationResponse = await fetch('/webauthn/authentication', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ authResponse, remember, redirectTo }),
			})

			const verificationJson = await verificationResponse.json().catch(() => ({
				status: 'error',
				error: 'Unknown error',
			}))

			const parsedResult =
				VerificationResponseSchema.safeParse(verificationJson)
			if (!parsedResult.success) {
				throw new Error(parsedResult.error.message)
			} else if (parsedResult.data.status === 'error') {
				throw new Error(parsedResult.data.error)
			}
			const { location } = parsedResult.data

			setPasskeyMessage("You're logged in! Navigating...")
			await navigate(location ?? '/')
		} catch (e) {
			const errorMessage = getErrorMessage(e)
			setError(`Failed to authenticate with passkey: ${errorMessage}`)
		}
	}

	return (
		<form action={handlePasskeyLogin}>
			<StatusButton
				id="passkey-login-button"
				aria-describedby="passkey-login-button-error"
				variant="outline"
				className="w-full"
				status={isPending ? 'pending' : error ? 'error' : 'idle'}
				type="submit"
				disabled={isPending}
			>
				<span className="inline-flex items-center gap-1.5">
					<Icon name="passkey" />
					<span>{passkeyMessage}</span>
				</span>
			</StatusButton>
			<div className="mt-2">
				<ErrorList errors={[error]} id="passkey-login-button-error" />
			</div>
		</form>
	)
}

export const meta: Route.MetaFunction = () => {
	return [{ title: 'Login to Epic Notes' }]
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
