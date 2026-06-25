import { prisma } from './db.server.ts'

/**
 * One row of the admin roles list (`/admin/roles`) — the clean DTO the route
 * renders: the role's identity, whether it is a protected built-in (`system`),
 * and how many users hold it.
 */
export type AdminRole = {
	id: string
	name: string
	description: string
	/** A built-in role (`user`/`admin`) — view-only, never renamed or deleted. */
	system: boolean
	/** How many users currently hold this role. */
	userCount: number
}

/**
 * Every role for the admin roles list, system roles first (the protected
 * built-ins sit at the top) then custom roles alphabetically, each carrying its
 * member count. Read-only — role mutations live in the role editor (ADR-069).
 */
export async function listRoles(): Promise<AdminRole[]> {
	const rows = await prisma.role.findMany({
		orderBy: [{ system: 'desc' }, { name: 'asc' }],
		select: {
			id: true,
			name: true,
			description: true,
			system: true,
			_count: { select: { users: true } },
		},
	})
	return rows.map((role) => ({
		id: role.id,
		name: role.name,
		description: role.description,
		system: role.system,
		userCount: role._count.users,
	}))
}
