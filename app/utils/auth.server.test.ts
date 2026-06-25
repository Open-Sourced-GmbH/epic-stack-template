import { http, HttpResponse } from 'msw'
import { describe, expect, test } from 'vitest'
import { createPassword, createUser } from '#tests/db-utils.ts'
import { server } from '#tests/mocks/index.ts'
import { consoleWarn } from '#tests/setup/setup-test-env.ts'
import {
	checkIsCommonPassword,
	getPasswordHashParts,
	login,
} from './auth.server.ts'
import { prisma } from './db.server.ts'

/** Create a sign-in-able user with a known password (active unless overridden). */
function createUserWithPassword(
	password: string,
	overrides: Record<string, unknown> = {},
) {
	return prisma.user.create({
		select: { id: true, username: true, email: true },
		data: {
			...createUser(),
			password: { create: createPassword(password) },
			...overrides,
		},
	})
}

test('login issues a session for an active user with valid credentials', async () => {
	const password = 'correct horse battery'
	const user = await createUserWithPassword(password)

	const result = await login({ username: user.username, password })

	expect(result?.status).toBe('success')
	if (result?.status !== 'success') throw new Error('expected success')
	expect(result.session.userId).toBe(user.id)
})

test('login returns invalid (no session) for a wrong password', async () => {
	const user = await createUserWithPassword('the-real-password')

	const result = await login({ username: user.username, password: 'nope' })

	expect(result?.status).toBe('invalid')
	expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0)
})

test('login rejects a deactivated user without creating a session', async () => {
	const password = 'still-knows-it'
	const user = await createUserWithPassword(password, {
		deactivatedAt: new Date('2026-03-01'),
	})

	const result = await login({ username: user.username, password })

	// The password is still valid, but the auth path refuses a session.
	expect(result?.status).toBe('deactivated')
	if (result?.status !== 'deactivated') throw new Error('expected deactivated')
	expect(result.email).toBe(user.email)
	expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0)
})

test('checkIsCommonPassword returns true when password is found in breach database', async () => {
	const password = 'testpassword'
	const [prefix, suffix] = getPasswordHashParts(password)

	server.use(
		http.get(`https://api.pwnedpasswords.com/range/${prefix}`, () => {
			// Include the actual suffix in the response with another realistic suffix
			return new HttpResponse(
				`1234567890123456789012345678901234A:1\n${suffix}:1234`,
				{ status: 200 },
			)
		}),
	)

	const result = await checkIsCommonPassword(password)
	expect(result).toBe(true)
})

test('checkIsCommonPassword returns false when password is not found in breach database', async () => {
	const password = 'sup3r-dup3r-s3cret'
	const [prefix] = getPasswordHashParts(password)

	server.use(
		http.get(`https://api.pwnedpasswords.com/range/${prefix}`, () => {
			// Response with realistic suffixes that won't match
			return new HttpResponse(
				'1234567890123456789012345678901234A:1\n' +
					'1234567890123456789012345678901234B:2',
				{ status: 200 },
			)
		}),
	)

	const result = await checkIsCommonPassword(password)
	expect(result).toBe(false)
})

// Error cases
test('checkIsCommonPassword returns false when API returns 500', async () => {
	const password = 'testpassword'
	const [prefix] = getPasswordHashParts(password)

	server.use(
		http.get(`https://api.pwnedpasswords.com/range/${prefix}`, () => {
			return new HttpResponse(null, { status: 500 })
		}),
	)

	const result = await checkIsCommonPassword(password)
	expect(result).toBe(false)
})

test('checkIsCommonPassword returns false when response has invalid format', async () => {
	consoleWarn.mockImplementation(() => {})
	const password = 'testpassword'
	const [prefix] = getPasswordHashParts(password)

	server.use(
		http.get(`https://api.pwnedpasswords.com/range/${prefix}`, () => {
			// A network error makes fetch reject with a TypeError, exercising the
			// "Unknown error during password check" branch.
			return HttpResponse.error()
		}),
	)

	const result = await checkIsCommonPassword(password)
	expect(result).toBe(false)
	expect(consoleWarn).toHaveBeenCalledWith(
		'Unknown error during password check',
		expect.any(TypeError),
	)
})

describe('timeout handling', () => {
	// normally we'd use fake timers for a test like this, but there's an issue
	// with AbortSignal.timeout() and fake timers: https://github.com/sinonjs/fake-timers/issues/418
	// beforeEach(() => vi.useFakeTimers())
	// afterEach(() => vi.useRealTimers())

	test('checkIsCommonPassword times out after 1 second', async () => {
		consoleWarn.mockImplementation(() => {})
		server.use(
			http.get('https://api.pwnedpasswords.com/range/:prefix', async () => {
				const twoSecondDelay = 2000
				await new Promise((resolve) => setTimeout(resolve, twoSecondDelay))
				// swap to this when we can use fake timers:
				// await vi.advanceTimersByTimeAsync(twoSecondDelay)
				return new HttpResponse(
					'1234567890123456789012345678901234A:1\n' +
						'1234567890123456789012345678901234B:2',
					{ status: 200 },
				)
			}),
		)

		const result = await checkIsCommonPassword('testpassword')
		expect(result).toBe(false)
		expect(consoleWarn).toHaveBeenCalledWith('Password check timed out')
	})
})
