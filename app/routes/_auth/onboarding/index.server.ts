import { invariant } from '@epic-web/invariant'
import { redirect } from 'react-router'
import {
	consumeVerification,
	verifySessionStorage,
} from '#app/utils/verification.server.ts'
import { type VerifyFunctionArgs } from '../verify.server.ts'
import { onboardingEmailSessionKey } from './index.tsx'

export async function handleVerification({ submission }: VerifyFunctionArgs) {
	invariant(
		submission.status === 'success',
		'Submission should be successful by now',
	)
	await consumeVerification({
		type: submission.value.type,
		target: submission.value.target,
	})
	const verifySession = await verifySessionStorage.getSession()
	verifySession.set(onboardingEmailSessionKey, submission.value.target)
	return redirect('/onboarding', {
		headers: {
			'set-cookie': await verifySessionStorage.commitSession(verifySession),
		},
	})
}
