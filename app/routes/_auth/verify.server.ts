import { parseWithZod } from '@conform-to/zod'
import { data } from 'react-router'
import { z } from 'zod'
import { handleVerification as handleChangeEmailVerification } from '#app/routes/settings/profile/change-email.server.tsx'
import {
	consumeVerification,
	isCodeValid,
} from '#app/utils/verification.server.ts'
import {
	consumedOnVerify,
	VerifySchema,
	codeQueryParam,
	targetQueryParam,
	typeQueryParam,
	type VerificationTypes,
	type VerifyHandler,
} from '#app/utils/verification.ts'
import { handleVerification as handleLoginTwoFactorVerification } from './login.server.ts'
import { handleVerification as handleOnboardingVerification } from './onboarding/index.server.ts'
import { handleVerification as handleResetPasswordVerification } from './reset-password.server.ts'

// The dispatch registry. `satisfies Record<VerificationTypes, VerifyHandler>`
// makes the mapping exhaustive — adding a Verification type without a handler is
// a compile error — while preserving each handler's precise return type for the
// route's `actionData`.
const verifyHandlers = {
	'reset-password': handleResetPasswordVerification,
	onboarding: handleOnboardingVerification,
	'change-email': handleChangeEmailVerification,
	'2fa': handleLoginTwoFactorVerification,
} satisfies Record<VerificationTypes, VerifyHandler>

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
	const type = submissionValue[typeQueryParam]

	// Consume the Verification *here*, before the handler runs, for every
	// ephemeral type — the seam owns the invariant. The permanent Two-Factor
	// Authenticator (`2fa`) is excluded by `consumedOnVerify` and is never
	// deleted on verify.
	if (consumedOnVerify[type]) {
		await consumeVerification({
			type,
			target: submissionValue[targetQueryParam],
		})
	}

	return verifyHandlers[type]({ request, submission })
}
