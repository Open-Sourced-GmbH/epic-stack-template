import { invariant } from '@epic-web/invariant'
import { redirect } from 'react-router'
import { verifySessionStorage } from '#app/utils/verification.server.ts'
import { type VerifyFunctionArgs } from '#app/utils/verification.ts'
import { onboardingEmailSessionKey } from './index.tsx'

export async function handleVerification({ submission }: VerifyFunctionArgs) {
	invariant(
		submission.status === 'success',
		'Submission should be successful by now',
	)
	// The Verification was already consumed by the `/verify` dispatcher.
	const verifySession = await verifySessionStorage.getSession()
	verifySession.set(onboardingEmailSessionKey, submission.value.target)
	return redirect('/onboarding', {
		headers: {
			'set-cookie': await verifySessionStorage.commitSession(verifySession),
		},
	})
}
