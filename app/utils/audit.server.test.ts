import { expect, test } from 'vitest'
import { prisma } from '#app/utils/db.server.ts'
import { createUser } from '#tests/db-utils.ts'
import { getAuditEvents, recordAuditEvent } from './audit.server.ts'
import { getPermissionMatrix } from './user.ts'

test('the RBAC vocabulary generates read:audit:any', () => {
	const matrix = getPermissionMatrix()
	expect(matrix).toContainEqual({
		action: 'read',
		entity: 'audit',
		access: 'any',
	})
	// audit is admin-only — never scoped to :own
	expect(matrix).not.toContainEqual({
		action: 'read',
		entity: 'audit',
		access: 'own',
	})
})

test('an event stays fully readable after its actor and target are deleted', async () => {
	const actor = await prisma.user.create({ data: createUser() })
	const target = await prisma.user.create({ data: createUser() })

	await recordAuditEvent({
		event: 'role.granted',
		actor,
		target: { id: target.id, type: 'user', label: target.email },
		details: { role: 'admin' },
	})

	// The actor and target are later deleted — the trail must survive.
	await prisma.user.delete({ where: { id: actor.id } })
	await prisma.user.delete({ where: { id: target.id } })

	const { events } = await getAuditEvents()
	expect(events).toHaveLength(1)
	const [entry] = events
	expect(entry).toMatchObject({
		event: 'role.granted',
		// the FK is blanked by SetNull, but the denormalized labels persist
		actorId: null,
		actorLabel: actor.name,
		targetId: target.id,
		targetType: 'user',
		targetLabel: target.email,
		details: { role: 'admin' },
	})
})

test('events are filterable by actor, target, and event', async () => {
	const alice = await prisma.user.create({ data: createUser() })
	const bob = await prisma.user.create({ data: createUser() })

	await recordAuditEvent({
		event: 'role.granted',
		actor: alice,
		target: { id: 'role-1', type: 'role', label: 'admin' },
	})
	await recordAuditEvent({
		event: 'user.deactivated',
		actor: alice,
		target: { id: bob.id, type: 'user', label: bob.email },
	})
	await recordAuditEvent({
		event: 'role.granted',
		actor: bob,
		target: { id: 'role-1', type: 'role', label: 'admin' },
	})

	const byActor = await getAuditEvents({ filters: { actorId: alice.id } })
	expect(byActor.total).toBe(2)
	expect(byActor.events.every((e) => e.actorId === alice.id)).toBe(true)

	const byTarget = await getAuditEvents({ filters: { targetId: bob.id } })
	expect(byTarget.total).toBe(1)
	expect(byTarget.events[0]?.event).toBe('user.deactivated')

	const byEvent = await getAuditEvents({ filters: { event: 'role.granted' } })
	expect(byEvent.total).toBe(2)
	expect(byEvent.events.every((e) => e.event === 'role.granted')).toBe(true)

	const byActorAndEvent = await getAuditEvents({
		filters: { actorId: alice.id, event: 'role.granted' },
	})
	expect(byActorAndEvent.total).toBe(1)
})

test('events page newest-first with a stable, complete order', async () => {
	// Explicit, distinct timestamps so ordering is deterministic regardless of
	// how fast the rows are written.
	for (let i = 0; i < 5; i++) {
		await prisma.auditEvent.create({
			data: {
				event: 'user.deactivated',
				actorLabel: `actor-${i}`,
				createdAt: new Date(2026, 0, 1, 0, 0, i),
			},
		})
	}

	const first = await getAuditEvents({ page: 1, perPage: 2 })
	expect(first.total).toBe(5)
	expect(first.pageCount).toBe(3)
	expect(first.page).toBe(1)
	// newest-first: the last-created (i=4) comes first
	expect(first.events.map((e) => e.actorLabel)).toEqual(['actor-4', 'actor-3'])

	const second = await getAuditEvents({ page: 2, perPage: 2 })
	expect(second.events.map((e) => e.actorLabel)).toEqual(['actor-2', 'actor-1'])

	const third = await getAuditEvents({ page: 3, perPage: 2 })
	expect(third.events.map((e) => e.actorLabel)).toEqual(['actor-0'])

	// a junk page clamps to a real page (≥ 1)
	const clamped = await getAuditEvents({ page: 0, perPage: 2 })
	expect(clamped.page).toBe(1)
})
