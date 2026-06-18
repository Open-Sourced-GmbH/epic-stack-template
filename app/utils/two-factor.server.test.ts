import { expect, test } from 'vitest'
import { prisma } from '#app/utils/db.server.ts'
import { createUser } from '#tests/db-utils.ts'
import { BASE_URL } from '#tests/utils.ts'
import { isTwoFactorEnabled } from './two-factor.server.ts'
import { isCodeValid, prepareVerification } from './verification.server.ts'

async function createTestUser() {
	return prisma.user.create({ data: createUser(), select: { id: true } })
}

test('isTwoFactorEnabled is false for a user with no authenticator', async () => {
	const user = await createTestUser()
	expect(await isTwoFactorEnabled(user.id)).toBe(false)
})

test('isTwoFactorEnabled is true once an authenticator exists', async () => {
	const user = await createTestUser()
	await prepareVerification({
		period: 10 * 60,
		request: new Request(BASE_URL),
		type: '2fa',
		target: user.id,
	})

	expect(await isTwoFactorEnabled(user.id)).toBe(true)
})

test('validating a 2fa code leaves the authenticator enabled', async () => {
	const user = await createTestUser()
	const { otp } = await prepareVerification({
		period: 10 * 60,
		request: new Request(BASE_URL),
		type: '2fa',
		target: user.id,
	})

	expect(
		await isCodeValid({ code: otp, type: '2fa', target: user.id }),
	).toBe(true)
	// the credential is permanent — verifying it must not consume it
	expect(await isTwoFactorEnabled(user.id)).toBe(true)
})
