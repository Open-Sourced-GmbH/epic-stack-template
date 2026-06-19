import { redirect } from 'react-router'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { getUserId, requireUserId, sessionKey } from './auth.server.ts'
import { prisma } from './db.server.ts'
import { combineResponseInits } from './misc.tsx'
import { authSessionStorage } from './session.server.ts'
import { redirectWithToast } from './toast.server.ts'
import { generateTOTP } from './totp.server.ts'
import { twoFAVerificationType, twoFAVerifyVerificationType } from './two-factor.ts'
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

/**
 * Finalize a newly authenticated session — the writer of the login↔2FA
 * handshake. If the user has a Two-Factor Authenticator, it stashes the
 * unverified session id and the remember flag in the verify session (the keys
 * above) and redirects to the 2FA `/verify` step; otherwise it commits the auth
 * session immediately. Shared by every login entrypoint (password login, OAuth
 * callback, passkey), which import it down from here rather than across from a
 * sibling route. The reader of the handshake is the login route's 2FA
 * `handleVerification`.
 */
export async function handleNewSession(
	{
		request,
		session,
		redirectTo,
		remember,
	}: {
		request: Request
		session: { userId: string; id: string; expirationDate: Date }
		redirectTo?: string
		remember: boolean
	},
	responseInit?: ResponseInit,
) {
	const userHasTwoFactor = await isTwoFactorEnabled(session.userId)

	if (userHasTwoFactor) {
		const verifySession = await verifySessionStorage.getSession()
		verifySession.set(unverifiedSessionIdKey, session.id)
		verifySession.set(rememberKey, remember)
		const redirectUrl = getRedirectToUrl({
			request,
			type: twoFAVerificationType,
			target: session.userId,
			redirectTo,
		})
		return redirect(
			`${redirectUrl.pathname}?${redirectUrl.searchParams}`,
			combineResponseInits(
				{
					headers: {
						'set-cookie':
							await verifySessionStorage.commitSession(verifySession),
					},
				},
				responseInit,
			),
		)
	} else {
		const authSession = await authSessionStorage.getSession(
			request.headers.get('cookie'),
		)
		authSession.set(sessionKey, session.id)

		return redirect(
			safeRedirect(redirectTo),
			combineResponseInits(
				{
					headers: {
						'set-cookie': await authSessionStorage.commitSession(authSession, {
							expires: remember ? session.expirationDate : undefined,
						}),
					},
				},
				responseInit,
			),
		)
	}
}

/**
 * The Two-Factor Authenticator enrollment lifecycle (see the domain glossary for
 * Pending Two-Factor Authenticator vs Two-Factor Authenticator). These own every
 * write to the `verification` table for the two `2fa*` types, so the
 * pending-vs-permanent transition is one named operation here rather than raw
 * column writes scattered across the settings routes.
 */

/**
 * Begin enrolling: create (or replace) the Pending Two-Factor Authenticator — a
 * transient `2fa-verify` row holding a fresh TOTP secret. The QR / manual-entry
 * config is read back from this row by the verify route's loader.
 */
export async function prepareTwoFactorEnrollment(userId: string) {
	const { otp: _otp, ...config } = await generateTOTP()
	const verificationData = {
		...config,
		type: twoFAVerifyVerificationType,
		target: userId,
	}
	await prisma.verification.upsert({
		where: {
			target_type: { target: userId, type: twoFAVerifyVerificationType },
		},
		create: verificationData,
		update: verificationData,
	})
}

/**
 * Confirm enrollment: promote the Pending Two-Factor Authenticator *in place*
 * into the permanent Two-Factor Authenticator — its `type` flips `2fa-verify` →
 * `2fa`. The row (and its secret) is preserved; only the discriminant changes.
 */
export async function confirmTwoFactorEnrollment(userId: string) {
	await prisma.verification.update({
		where: {
			target_type: { type: twoFAVerifyVerificationType, target: userId },
		},
		data: { type: twoFAVerificationType },
	})
}

/** Abandon enrollment: delete the Pending Two-Factor Authenticator. */
export async function cancelTwoFactorEnrollment(userId: string) {
	await prisma.verification.deleteMany({
		where: { type: twoFAVerifyVerificationType, target: userId },
	})
}

/** Disable 2FA: delete the permanent Two-Factor Authenticator. */
export async function disableTwoFactor(userId: string) {
	await prisma.verification.delete({
		where: { target_type: { target: userId, type: twoFAVerificationType } },
	})
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
	const twoHours = 1000 * 60 * 60 * 2
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
