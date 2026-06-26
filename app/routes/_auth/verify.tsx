import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { Form, useSearchParams } from 'react-router'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ErrorList, OTPField } from '#app/components/forms.tsx'
import { FormCard } from '#app/components/ui/form-card.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import {
	VerificationTypeSchema,
	VerifySchema,
	codeQueryParam,
	redirectToQueryParam,
	targetQueryParam,
	typeQueryParam,
	type VerificationTypes,
} from '#app/utils/verification.ts'
import { type Route } from './+types/verify.ts'
import { validateRequest } from './verify.server.ts'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	await checkHoneypot(formData)
	return validateRequest(request, formData)
}

type VerifyHeading = { eyebrow: string; title: string; description: string }

const checkEmail: VerifyHeading = {
	eyebrow: 'Verify your email',
	title: 'Check your email',
	description: "We've sent you a code to verify your email address.",
}

const headings: Record<VerificationTypes, VerifyHeading> = {
	onboarding: checkEmail,
	'reset-password': checkEmail,
	'change-email': checkEmail,
	'2fa': {
		eyebrow: 'Two-factor auth',
		title: 'Check your 2FA app',
		description: 'Please enter your 2FA code to verify your identity.',
	},
}

export default function VerifyRoute({ actionData }: Route.ComponentProps) {
	const [searchParams] = useSearchParams()
	const isPending = useIsPending()
	const parseWithZoddType = VerificationTypeSchema.safeParse(
		searchParams.get(typeQueryParam),
	)
	const type = parseWithZoddType.success ? parseWithZoddType.data : null
	const heading = type ? headings[type] : null

	const [form, fields] = useForm({
		id: 'verify-form',
		constraint: getZodConstraint(VerifySchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: VerifySchema })
		},
		defaultValue: {
			code: searchParams.get(codeQueryParam),
			type: type,
			target: searchParams.get(targetQueryParam),
			redirectTo: searchParams.get(redirectToQueryParam),
		},
	})

	return (
		<main className="w-full max-w-[360px]">
			<div className="flex flex-col gap-2 text-center">
				<p className="text-brand text-body-xs font-semibold tracking-wide uppercase">
					{heading?.eyebrow ?? 'Verification'}
				</p>
				<h1 className="text-h4">
					{heading?.title ?? 'Invalid verification type'}
				</h1>
				{heading ? (
					<p className="text-muted-foreground text-body-sm">
						{heading.description}
					</p>
				) : null}
			</div>

			<FormCard className="mt-6 p-6 text-left">
				<ErrorList errors={form.errors} id={form.errorId} />
				<Form method="POST" {...getFormProps(form)}>
					<HoneypotInputs />
					<div className="flex items-center justify-center">
						<OTPField
							labelProps={{
								htmlFor: fields[codeQueryParam].id,
								children: 'Code',
							}}
							inputProps={{
								...getInputProps(fields[codeQueryParam], { type: 'text' }),
								autoComplete: 'one-time-code',
								autoFocus: true,
							}}
							errors={fields[codeQueryParam].errors}
						/>
					</div>
					<input
						{...getInputProps(fields[typeQueryParam], { type: 'hidden' })}
					/>
					<input
						{...getInputProps(fields[targetQueryParam], { type: 'hidden' })}
					/>
					<input
						{...getInputProps(fields[redirectToQueryParam], {
							type: 'hidden',
						})}
					/>
					<StatusButton
						className="mt-2 w-full"
						status={isPending ? 'pending' : (form.status ?? 'idle')}
						type="submit"
						disabled={isPending}
					>
						Submit
					</StatusButton>
				</Form>
			</FormCard>
		</main>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
