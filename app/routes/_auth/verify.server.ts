import { type Submission } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { data } from 'react-router'
import { z } from 'zod'
import { handleVerification as handleChangeEmailVerification } from '#app/routes/settings/profile/change-email.server.tsx'
import { isCodeValid } from '#app/utils/verification.server.ts'
import { handleVerification as handleLoginTwoFactorVerification } from './login.server.ts'
import { handleVerification as handleOnboardingVerification } from './onboarding/index.server.ts'
import { handleVerification as handleResetPasswordVerification } from './reset-password.server.ts'
import {
	VerifySchema,
	codeQueryParam,
	targetQueryParam,
	typeQueryParam,
} from './verify.tsx'

export type VerifyFunctionArgs = {
	request: Request
	submission: Submission<
		z.input<typeof VerifySchema>,
		string[],
		z.output<typeof VerifySchema>
	>
	body: FormData | URLSearchParams
}

export async function validateRequest(
	request: Request,
	body: URLSearchParams | FormData,
) {
	const submission = await parseWithZod(body, {
		schema: VerifySchema.superRefine(async (data, ctx) => {
			const codeIsValid = await isCodeValid({
				code: data[codeQueryParam],
				type: data[typeQueryParam],
				target: data[targetQueryParam],
			})
			if (!codeIsValid) {
				ctx.addIssue({
					path: ['code'],
					code: z.ZodIssueCode.custom,
					message: `Invalid code`,
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

	const { value: submissionValue } = submission

	// Each handler owns consuming its own Verification (ephemeral types delete it;
	// the 2fa authenticator is permanent and is never consumed) — so dispatch here
	// is a plain switch with no special-cased deletion policy.
	switch (submissionValue[typeQueryParam]) {
		case 'reset-password': {
			return handleResetPasswordVerification({ request, body, submission })
		}
		case 'onboarding': {
			return handleOnboardingVerification({ request, body, submission })
		}
		case 'change-email': {
			return handleChangeEmailVerification({ request, body, submission })
		}
		case '2fa': {
			return handleLoginTwoFactorVerification({ request, body, submission })
		}
	}
}
