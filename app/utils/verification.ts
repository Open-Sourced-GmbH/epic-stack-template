import { z } from 'zod'

/**
 * Client-safe vocabulary for Verifications — the verify URL's query-param names
 * and the set of Verification types. Lives here (not in a route or in
 * `verification.server.ts`) so both client routes and server utilities import
 * the vocabulary *down* from the util layer instead of reaching up into a route
 * module. The server-side logic that acts on these lives in
 * `verification.server.ts`.
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
