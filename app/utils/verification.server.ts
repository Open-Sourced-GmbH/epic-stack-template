import { createCookieSessionStorage } from 'react-router'
import { prisma } from './db.server.ts'
import { getDomainUrl } from './misc.tsx'
import { generateTOTP, verifyTOTP } from './totp.server.ts'
import { type twoFAVerifyVerificationType } from './two-factor.ts'
import {
	codeQueryParam,
	redirectToQueryParam,
	targetQueryParam,
	typeQueryParam,
	type VerificationTypes,
} from './verification.ts'

export const verifySessionStorage = createCookieSessionStorage({
	cookie: {
		name: 'en_verification',
		sameSite: 'lax', // CSRF protection is advised if changing to 'none'
		path: '/',
		httpOnly: true,
		maxAge: 60 * 10, // 10 minutes
		secrets: process.env.SESSION_SECRET.split(','),
		secure: process.env.NODE_ENV === 'production',
	},
})

/**
 * Slot names for the cross-step verify-session handshake. Each Verification flow
 * is two steps: step 1 (a route action) stashes state in `verifySessionStorage`,
 * step 2 (the flow's `/verify` handler, or the destination route) reads it back
 * to finalize. These keys are the *vehicle* for that state, so they live with the
 * session that holds them rather than in the route that happens to write them.
 *
 * They live here (not in route `.tsx` modules) so the `.server` handlers and
 * destination routes import them *down* from the util layer — the same
 * dependency direction ADR-049 set for auth vocabulary and ADR-051 set for the
 * handler contract. The 2FA login handshake keys are the matching case, owned by
 * `two-factor.server.ts`.
 */
export const onboardingEmailSessionKey = 'onboardingEmail'
export const providerIdKey = 'providerId'
export const prefilledProfileKey = 'prefilledProfile'
export const resetPasswordUsernameSessionKey = 'resetPasswordUsername'
export const newEmailAddressSessionKey = 'new-email-address'

export function getRedirectToUrl({
	request,
	type,
	target,
	redirectTo,
}: {
	request: Request
	type: VerificationTypes
	target: string
	redirectTo?: string
}) {
	const redirectToUrl = new URL(`${getDomainUrl(request)}/verify`)
	redirectToUrl.searchParams.set(typeQueryParam, type)
	redirectToUrl.searchParams.set(targetQueryParam, target)
	if (redirectTo) {
		redirectToUrl.searchParams.set(redirectToQueryParam, redirectTo)
	}
	return redirectToUrl
}

export async function prepareVerification({
	period,
	request,
	type,
	target,
}: {
	period: number
	request: Request
	type: VerificationTypes
	target: string
}) {
	const verifyUrl = getRedirectToUrl({ request, type, target })
	const redirectTo = new URL(verifyUrl.toString())

	const { otp, ...verificationConfig } = await generateTOTP({
		algorithm: 'SHA-256',
		// Leaving off 0, O, and I on purpose to avoid confusing users.
		charSet: 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789',
		period,
	})
	const verificationData = {
		type,
		target,
		...verificationConfig,
		expiresAt: new Date(Date.now() + verificationConfig.period * 1000),
	}
	await prisma.verification.upsert({
		where: { target_type: { target, type } },
		create: verificationData,
		update: verificationData,
	})

	// add the otp to the url we'll email the user.
	verifyUrl.searchParams.set(codeQueryParam, otp)

	return { otp, redirectTo, verifyUrl }
}

export async function isCodeValid({
	code,
	type,
	target,
}: {
	code: string
	type: VerificationTypes | typeof twoFAVerifyVerificationType
	target: string
}) {
	const verification = await prisma.verification.findUnique({
		where: {
			target_type: { target, type },
			OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
		},
		select: { algorithm: true, secret: true, period: true, charSet: true },
	})
	if (!verification) return false
	const result = await verifyTOTP({
		otp: code,
		...verification,
	})
	if (!result) return false

	return true
}

export async function getVerification({
	type,
	target,
}: {
	type: VerificationTypes | typeof twoFAVerifyVerificationType
	target: string
}) {
	return prisma.verification.findUnique({
		select: { id: true },
		where: { target_type: { target, type } },
	})
}

export async function consumeVerification({
	type,
	target,
}: {
	type: VerificationTypes
	target: string
}) {
	await prisma.verification.delete({
		where: { target_type: { type, target } },
	})
}
