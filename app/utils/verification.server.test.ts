import { faker } from '@faker-js/faker'
import { expect, test } from 'vitest'
import { prisma } from '#app/utils/db.server.ts'
import { BASE_URL } from '#tests/utils.ts'
import {
	consumeVerification,
	isCodeValid,
	prepareVerification,
} from './verification.server.ts'

test('prepareVerification creates a verification whose code validates', async () => {
	const target = faker.internet.email()
	const { otp } = await prepareVerification({
		period: 10 * 60,
		request: new Request(BASE_URL),
		type: 'onboarding',
		target,
	})

	expect(await isCodeValid({ code: otp, type: 'onboarding', target })).toBe(
		true,
	)
})

test('isCodeValid rejects a code that does not match the verification', async () => {
	const target = faker.internet.email()
	await prepareVerification({
		period: 10 * 60,
		request: new Request(BASE_URL),
		type: 'onboarding',
		target,
	})

	expect(
		await isCodeValid({ code: 'WRONG1', type: 'onboarding', target }),
	).toBe(false)
})

test('isCodeValid rejects a code once the verification has expired', async () => {
	const target = faker.internet.email()
	const { otp } = await prepareVerification({
		period: 10 * 60,
		request: new Request(BASE_URL),
		type: 'onboarding',
		target,
	})
	// age the verification past its expiry
	await prisma.verification.update({
		where: { target_type: { target, type: 'onboarding' } },
		data: { expiresAt: new Date(Date.now() - 1000) },
	})

	expect(await isCodeValid({ code: otp, type: 'onboarding', target })).toBe(
		false,
	)
})

test('consumeVerification deletes the verification so its code no longer validates', async () => {
	const target = faker.internet.email()
	const { otp } = await prepareVerification({
		period: 10 * 60,
		request: new Request(BASE_URL),
		type: 'onboarding',
		target,
	})

	await consumeVerification({ type: 'onboarding', target })

	expect(await isCodeValid({ code: otp, type: 'onboarding', target })).toBe(
		false,
	)
})
