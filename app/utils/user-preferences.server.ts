import { prisma } from '#app/utils/db.server.ts'

/**
 * A user's notification preferences. Today this is just the product-email
 * opt-in, but the shape leaves room to grow without churning every call site.
 */
export type UserPreferences = {
	allowProductEmails: boolean
}

/** Read the current user's preferences. */
export async function getUserPreferences(
	userId: string,
): Promise<UserPreferences> {
	const { allowProductEmails } = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: { allowProductEmails: true },
	})
	return { allowProductEmails }
}

/** Persist the current user's preferences. */
export async function updateUserPreferences(
	userId: string,
	preferences: UserPreferences,
): Promise<void> {
	await prisma.user.update({
		where: { id: userId },
		data: { allowProductEmails: preferences.allowProductEmails },
		select: { id: true },
	})
}

/**
 * The product-email check-point: a sender consults this before delivering a
 * product email so an opted-out user is never contacted. The template ships no
 * product-email sender yet — this is the seam senders will call.
 */
export async function mayReceiveProductEmails(
	userId: string,
): Promise<boolean> {
	const { allowProductEmails } = await getUserPreferences(userId)
	return allowProductEmails
}
