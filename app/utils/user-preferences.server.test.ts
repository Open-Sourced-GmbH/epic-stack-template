import { expect, test } from 'vitest'
import { prisma } from '#app/utils/db.server.ts'
import { createUser } from '#tests/db-utils.ts'
import {
	getUserPreferences,
	mayReceiveProductEmails,
	updateUserPreferences,
} from './user-preferences.server.ts'

async function makeUser() {
	return prisma.user.create({ select: { id: true }, data: createUser() })
}

test('a fresh account is opted in to product emails by default', async () => {
	const { id } = await makeUser()
	expect(await getUserPreferences(id)).toEqual({ allowProductEmails: true })
})

test('updating the preference round-trips through a read', async () => {
	const { id } = await makeUser()

	await updateUserPreferences(id, { allowProductEmails: false })
	expect(await getUserPreferences(id)).toEqual({ allowProductEmails: false })

	await updateUserPreferences(id, { allowProductEmails: true })
	expect(await getUserPreferences(id)).toEqual({ allowProductEmails: true })
})

// The send-site check-point: a sender consults this before delivering a
// product email, so an opted-out user is never contacted.
test('mayReceiveProductEmails mirrors the stored opt-in', async () => {
	const { id } = await makeUser()
	expect(await mayReceiveProductEmails(id)).toBe(true)

	await updateUserPreferences(id, { allowProductEmails: false })
	expect(await mayReceiveProductEmails(id)).toBe(false)
})
