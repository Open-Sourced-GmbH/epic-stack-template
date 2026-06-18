import { getUserId, requireUserId } from './auth.server.ts'
import { authSessionStorage } from './session.server.ts'
import { redirectWithToast } from './toast.server.ts'
import { twoFAVerificationType } from './two-factor.ts'
import {
	getRedirectToUrl,
	getVerification,
	verifySessionStorage,
} from './verification.server.ts'

/**
 * The Two-Factor Authenticator is a *permanent* credential (see the domain
 * glossary): it shares the `verification` table with one-time Verifications but
 * is never consumed/deleted on verify. This module owns that distinction — it
 * intentionally has no access to `consumeVerification`.
 */

// session keys for the 2FA login handoff — owned here so they live with the
// rest of the two-factor flow rather than being shared back to login.server.ts
export const verifiedTimeKey = 'verified-time'
export const unverifiedSessionIdKey = 'unverified-session-id'
export const rememberKey = 'remember'

export async function isTwoFactorEnabled(userId: string) {
	const verification = await getVerification({
		type: twoFAVerificationType,
		target: userId,
	})
	return Boolean(verification)
}

export async function shouldRequestTwoFA(request: Request) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	if (verifySession.has(unverifiedSessionIdKey)) return true
	const userId = await getUserId(request)
	if (!userId) return false
	// if it's over two hours since they last verified, we should request 2FA again
	if (!(await isTwoFactorEnabled(userId))) return false
	const verifiedTime = authSession.get(verifiedTimeKey) ?? new Date(0)
	const twoHours = 1000 * 60 * 2
	return Date.now() - verifiedTime > twoHours
}

export async function requireRecentVerification(request: Request) {
	const userId = await requireUserId(request)
	const shouldReverify = await shouldRequestTwoFA(request)
	if (shouldReverify) {
		const reqUrl = new URL(request.url)
		const redirectUrl = getRedirectToUrl({
			request,
			target: userId,
			type: twoFAVerificationType,
			redirectTo: reqUrl.pathname + reqUrl.search,
		})
		throw await redirectWithToast(redirectUrl.toString(), {
			title: 'Please Reverify',
			description: 'Please reverify your account before proceeding',
		})
	}
}
