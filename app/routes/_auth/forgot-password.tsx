import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { data, redirect, Link, useFetcher } from 'react-router'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { ForgotPasswordEmail } from '#app/components/emails/forgot-password.tsx'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { FormCard } from '#app/components/ui/form-card.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { sendEmail } from '#app/utils/email.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { EmailSchema, UsernameSchema } from '#app/utils/user-validation.ts'
import { prepareVerification } from '#app/utils/verification.server.ts'
import { type Route } from './+types/forgot-password.ts'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

const ForgotPasswordSchema = z.object({
	usernameOrEmail: z.union([EmailSchema, UsernameSchema]),
})

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	await checkHoneypot(formData)
	const submission = await parseWithZod(formData, {
		schema: ForgotPasswordSchema.superRefine(async (data, ctx) => {
			const user = await prisma.user.findFirst({
				where: {
					OR: [
						{ email: data.usernameOrEmail },
						{ username: data.usernameOrEmail },
					],
				},
				select: { id: true },
			})
			if (!user) {
				ctx.addIssue({
					path: ['usernameOrEmail'],
					code: z.ZodIssueCode.custom,
					message: 'No user exists with this username or email',
				})
				return
			}
		}),
		async: true,
	})
	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const { usernameOrEmail } = submission.value

	const user = await prisma.user.findFirstOrThrow({
		where: { OR: [{ email: usernameOrEmail }, { username: usernameOrEmail }] },
		select: { email: true, username: true },
	})

	const { verifyUrl, redirectTo, otp } = await prepareVerification({
		period: 10 * 60,
		request,
		type: 'reset-password',
		target: usernameOrEmail,
	})

	const response = await sendEmail({
		to: user.email,
		subject: `Epic Notes Password Reset`,
		react: (
			<ForgotPasswordEmail onboardingUrl={verifyUrl.toString()} otp={otp} />
		),
	})

	if (response.status === 'success') {
		return redirect(redirectTo.toString())
	} else {
		return data(
			{ result: submission.reply({ formErrors: [response.error.message] }) },
			{ status: 500 },
		)
	}
}

export const meta: Route.MetaFunction = () => {
	return [{ title: 'Password Recovery for Epic Notes' }]
}

export default function ForgotPasswordRoute() {
	const forgotPassword = useFetcher<typeof action>()

	const [form, fields] = useForm({
		id: 'forgot-password-form',
		constraint: getZodConstraint(ForgotPasswordSchema),
		lastResult: forgotPassword.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ForgotPasswordSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<div className="w-full max-w-[360px]">
			<div className="flex flex-col gap-2 text-center">
				<p className="text-brand text-sm font-semibold tracking-wide uppercase">
					Account recovery
				</p>
				<h1 className="text-h4">Forgot password</h1>
				<p className="text-muted-foreground text-body-sm">
					No worries, we'll send you reset instructions.
				</p>
			</div>

			<FormCard className="mt-6 p-6 text-left">
				<forgotPassword.Form method="POST" {...getFormProps(form)}>
					<HoneypotInputs />
					<Field
						labelProps={{
							htmlFor: fields.usernameOrEmail.id,
							children: 'Username or Email',
						}}
						inputProps={{
							autoFocus: true,
							...getInputProps(fields.usernameOrEmail, { type: 'text' }),
						}}
						errors={fields.usernameOrEmail.errors}
					/>
					<ErrorList errors={form.errors} id={form.errorId} />
					<StatusButton
						className="mt-2 w-full"
						status={
							forgotPassword.state === 'submitting'
								? 'pending'
								: (form.status ?? 'idle')
						}
						type="submit"
						disabled={forgotPassword.state !== 'idle'}
					>
						Recover password
					</StatusButton>
				</forgotPassword.Form>
			</FormCard>

			<p className="text-muted-foreground text-body-sm mt-6 text-center">
				Remember your password?{' '}
				<Link to="/login" className="text-brand font-semibold">
					Back to login
				</Link>
			</p>
		</div>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
