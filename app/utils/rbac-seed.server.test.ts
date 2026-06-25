import { expect, test } from 'vitest'
import { prisma } from '#app/utils/db.server.ts'
import { getPermissionMatrix } from '#app/utils/user.ts'
import { reconcileRbac } from './rbac-seed.server.ts'

const permKey = (p: { action: string; entity: string; access: string }) =>
	`${p.action}:${p.entity}:${p.access}`

test('reconcileRbac reconciles the whole permission catalog from the registry', async () => {
	await reconcileRbac()

	const stored = await prisma.permission.findMany({
		select: { action: true, entity: true, access: true },
	})
	const storedKeys = new Set(stored.map(permKey))
	// Every registry permission is present — including the new `role` entity, the
	// proof the catalog is reconciled from the vocabulary, not a frozen list.
	for (const permission of getPermissionMatrix()) {
		expect(storedKeys.has(permKey(permission))).toBe(true)
	}
	expect(storedKeys.has('read:role:any')).toBe(true)
})

test('reconcileRbac provisions user and admin as system roles, granting the new role entity to admin', async () => {
	await reconcileRbac()

	const admin = await prisma.role.findUnique({
		where: { name: 'admin' },
		select: {
			system: true,
			permissions: { select: { entity: true, access: true } },
		},
	})
	expect(admin?.system).toBe(true)
	// System roles are registry-governed: the seed reconciles admin to every
	// `:any` permission, so it picks up `role:any` the moment `role` joins the
	// vocabulary (without it, no capable admin would exist — the floor needs it).
	expect(admin?.permissions.every((p) => p.access === 'any')).toBe(true)
	expect(
		admin?.permissions.some((p) => p.entity === 'role' && p.access === 'any'),
	).toBe(true)

	const user = await prisma.role.findUnique({
		where: { name: 'user' },
		select: { system: true },
	})
	expect(user?.system).toBe(true)
})

test('re-running reconcileRbac leaves custom (UI-created) roles untouched', async () => {
	await reconcileRbac()

	// A role created through the UI (ADR-069) — not a registry/system role. Its
	// grants are DB-owned, so the seed must never reconcile or re-flag it.
	const readPostAny = await prisma.permission.findUniqueOrThrow({
		where: {
			action_entity_access: { action: 'read', entity: 'post', access: 'any' },
		},
		select: { id: true },
	})
	await prisma.role.create({
		data: {
			name: 'editor',
			description: 'Curates the blog',
			system: false,
			permissions: { connect: { id: readPostAny.id } },
		},
	})

	await reconcileRbac()

	const editor = await prisma.role.findUnique({
		where: { name: 'editor' },
		select: {
			system: true,
			description: true,
			permissions: { select: { id: true } },
		},
	})
	// The custom role survives a re-seed verbatim: still custom, same lone grant —
	// the seed only governs the registry roles, so UI edits are never clobbered.
	expect(editor?.system).toBe(false)
	expect(editor?.description).toBe('Curates the blog')
	expect(editor?.permissions).toEqual([{ id: readPostAny.id }])
})
