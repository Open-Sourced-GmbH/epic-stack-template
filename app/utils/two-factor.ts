import { type VerificationTypes } from './verification.ts'

/**
 * Client-safe vocabulary for the Two-Factor flows. Lives here (not in a route)
 * so both client routes and `two-factor.server.ts` import these discriminants
 * *down* from the util layer. The server-side logic lives in
 * `two-factor.server.ts`.
 */

// The permanent Two-Factor Authenticator credential (see the domain glossary):
// a standing `verification` row, never consumed on verify.
export const twoFAVerificationType = '2fa' satisfies VerificationTypes

// The transient verification used *while enabling* 2FA. Distinct from the
// permanent `'2fa'` authenticator: a one-time row that is promoted to a
// `'2fa'` authenticator once its code is confirmed, and is not a
// `VerificationTypes` member because it never reaches the `/verify` route.
export const twoFAVerifyVerificationType = '2fa-verify'
