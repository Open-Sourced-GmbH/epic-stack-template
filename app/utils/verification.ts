import { type Submission } from '@conform-to/react'
import { z } from 'zod'

/**
 * Client-safe vocabulary for Verifications — the verify URL's query-param names,
 * the set of Verification types, and the contract every verify-flow handler
 * satisfies. Lives here (not in a route or in `verification.server.ts`) so both
 * client routes and server utilities import the vocabulary *down* from the util
 * layer instead of reaching up into a route module. The server-side logic that
 * acts on these lives in `verification.server.ts`.
 */

export const codeQueryParam = 'code'
export const targetQueryParam = 'target'
export const typeQueryParam = 'type'
export const redirectToQueryParam = 'redirectTo'

const types = ['onboarding', 'reset-password', 'change-email', '2fa'] as const
export const VerificationTypeSchema = z.enum(types)
export type VerificationTypes = z.infer<typeof VerificationTypeSchema>

export const VerifySchema = z.object({
	[codeQueryParam]: z.string().min(6).max(6),
	[typeQueryParam]: VerificationTypeSchema,
	[targetQueryParam]: z.string(),
	[redirectToQueryParam]: z.string().optional(),
})

/**
 * Whether a Verification of each type is *consumed* (deleted) once its code
 * verifies. Ephemeral Verifications are deleted; the permanent Two-Factor
 * Authenticator (`2fa`) is a standing credential and is never consumed. The
 * `/verify` dispatcher reads this so the seam — not each handler — owns the
 * ephemeral-vs-permanent invariant. Typed as `Record<VerificationTypes, …>` so
 * adding a Verification type without a consume policy is a compile error. See
 * the domain glossary (Verification vs Two-Factor Authenticator).
 */
export const consumedOnVerify: Record<VerificationTypes, boolean> = {
	onboarding: true,
	'reset-password': true,
	'change-email': true,
	'2fa': false,
}

/**
 * What every `/verify` handler receives. The submission is already validated
 * (its code checked) by the dispatcher; the handler finalizes its own flow.
 */
export type VerifyFunctionArgs = {
	request: Request
	submission: Submission<
		z.input<typeof VerifySchema>,
		string[],
		z.output<typeof VerifySchema>
	>
}

/** A handler registered against a Verification type in the `/verify` dispatcher. */
export type VerifyHandler = (args: VerifyFunctionArgs) => Promise<unknown>
