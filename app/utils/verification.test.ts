import { expect, test } from 'vitest'
import { twoFAVerificationType } from './two-factor.ts'
import { consumedOnVerify, VerificationTypeSchema } from './verification.ts'

test('every Verification type has a consume policy', () => {
	for (const type of VerificationTypeSchema.options) {
		expect(consumedOnVerify[type]).toBeTypeOf('boolean')
	}
})

test('only the permanent Two-Factor Authenticator is never consumed on verify', () => {
	// Encodes the glossary distinction: ephemeral Verifications are deleted on
	// consume; the permanent Two-Factor Authenticator (`2fa`) never is.
	for (const [type, consumed] of Object.entries(consumedOnVerify)) {
		expect(consumed).toBe(type !== twoFAVerificationType)
	}
})
