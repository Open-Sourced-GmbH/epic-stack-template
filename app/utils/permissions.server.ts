import { data } from 'react-router'
import { requireUserId } from './auth.server.ts'
import { prisma } from './db.server.ts'
import {
	type PermissionString,
	parsePermissionString,
	userHasPermission,
} from './user.ts'

export async function requireUserWithPermission(
	request: Request,
	permission: PermissionString,
) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findFirst({
		select: {
			id: true,
			roles: {
				select: {
					permissions: {
						select: { entity: true, action: true, access: true },
					},
				},
			},
		},
		where: { id: userId },
	})
	if (!user || !userHasPermission(user, permission)) {
		throw data(
			{
				error: 'Unauthorized',
				requiredPermission: parsePermissionString(permission),
				message: `Unauthorized: required permissions: ${permission}`,
			},
			{ status: 403 },
		)
	}
	return user.id
}

export async function requireUserWithRole(request: Request, name: string) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findFirst({
		select: { id: true },
		where: { id: userId, roles: { some: { name } } },
	})
	if (!user) {
		throw data(
			{
				error: 'Unauthorized',
				requiredRole: name,
				message: `Unauthorized: required role: ${name}`,
			},
			{ status: 403 },
		)
	}
	return user.id
}
