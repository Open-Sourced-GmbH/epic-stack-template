/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import AdminAuditIndex, { type AuditView } from './index.tsx'

type LoaderData = {
	rows: AuditView[]
	total: number
	page: number
	pageCount: number
	filters: { event: string; actorId: string; targetId: string }
}

function makeRow(overrides: Partial<AuditView> = {}): AuditView {
	return {
		id: 'e1',
		event: 'role.granted',
		createdAt: new Date('2026-01-01T10:00:00Z'),
		actor: {
			id: 'actor-1',
			label: 'Ada Lovelace',
			imageObjectKey: null,
			deleted: false,
		},
		target: {
			id: 'target-1',
			type: 'user',
			label: 'grace@example.com',
			deleted: false,
		},
		diff: { added: ['admin'], removed: [] },
		...overrides,
	}
}

function loaderData(overrides: Partial<LoaderData> = {}): LoaderData {
	return {
		rows: [makeRow()],
		total: 1,
		page: 1,
		pageCount: 1,
		filters: { event: '', actorId: '', targetId: '' },
		...overrides,
	}
}

function renderViewer(data: LoaderData) {
	const Stub = createRoutesStub([
		{
			path: '/admin/audit',
			Component: AdminAuditIndex,
			loader: () => data,
			HydrateFallback: () => null,
		},
	])
	render(<Stub initialEntries={['/admin/audit']} />)
}

test('renders an event with its actor, tonal event badge, and target', async () => {
	renderViewer(loaderData())

	expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
	// Scope to the table: the event label also appears as a filter Select option.
	const table = within(await screen.findByRole('table'))
	// The event name maps to a human label, not the raw dotted string.
	expect(table.getByText('Role granted')).toBeInTheDocument()
	expect(table.queryByText('role.granted')).toBeNull()
	expect(table.getByText('grace@example.com')).toBeInTheDocument()
	expect(screen.getByText(/1 event/i)).toBeInTheDocument()
})

test('a deleted actor renders the denormalized-label fallback, not a link', async () => {
	renderViewer(
		loaderData({
			rows: [
				makeRow({
					actor: {
						id: null,
						label: 'ghost@example.com',
						imageObjectKey: null,
						deleted: true,
					},
				}),
			],
		}),
	)

	const fallback = await screen.findByText('ghost@example.com')
	expect(fallback).toBeInTheDocument()
	// The fallback is plain italic text — never a filter link.
	expect(fallback.closest('a')).toBeNull()
})

test('a deleted target renders the "Deleted user" fallback', async () => {
	renderViewer(
		loaderData({
			rows: [
				makeRow({
					target: {
						id: 'gone-1',
						type: 'user',
						label: 'gone@example.com',
						deleted: true,
					},
				}),
			],
		}),
	)

	expect(await screen.findByText(/deleted user/i)).toBeInTheDocument()
	// The denormalized email is hidden behind the fallback copy.
	expect(screen.queryByText('gone@example.com')).toBeNull()
})

test('a system event (no actor) reads "System"', async () => {
	renderViewer(loaderData({ rows: [makeRow({ actor: null })] }))

	expect(await screen.findByText('System')).toBeInTheDocument()
})

test('expanding a grant row reveals the inline add/remove diff', async () => {
	const user = userEvent.setup()
	renderViewer(
		loaderData({
			rows: [
				makeRow({
					event: 'role.permissions.changed',
					diff: { added: ['read:user:any'], removed: ['delete:user:any'] },
				}),
			],
		}),
	)

	// The diff is hidden until the row is expanded.
	expect(screen.queryByText(/\+ grant read:user:any/i)).toBeNull()

	await user.click(
		await screen.findByRole('button', { name: /show .*detail/i }),
	)

	expect(
		await screen.findByText(/\+ grant read:user:any/i),
	).toBeInTheDocument()
	expect(screen.getByText(/− revoke delete:user:any/i)).toBeInTheDocument()
})

test('a row with no diff exposes no expand control', async () => {
	renderViewer(
		loaderData({
			rows: [makeRow({ event: 'user.deactivated', diff: null })],
		}),
	)

	// Scope to the table: the event label also appears as a filter Select option.
	const table = within(await screen.findByRole('table'))
	await table.findByText('User deactivated')
	expect(screen.queryByRole('button', { name: /show .*detail/i })).toBeNull()
})

test('shows the empty state when there are no events', async () => {
	renderViewer(loaderData({ rows: [], total: 0 }))

	expect(await screen.findByText(/no audit events yet/i)).toBeInTheDocument()
})

test('a filtered empty list offers a Clear filters affordance', async () => {
	renderViewer(
		loaderData({
			rows: [],
			total: 0,
			filters: { event: 'role.granted', actorId: '', targetId: '' },
		}),
	)

	expect(await screen.findByText(/no matching events/i)).toBeInTheDocument()
	// Both the toolbar and the empty card offer a way back to the unfiltered log.
	const clears = screen.getAllByRole('link', { name: /clear filters/i })
	expect(clears.length).toBeGreaterThanOrEqual(1)
	expect(clears[0]).toHaveAttribute('href', '/admin/audit')
})

test('paginates, carrying the active event filter onto the page links', async () => {
	renderViewer(
		loaderData({
			rows: [makeRow()],
			total: 40,
			page: 1,
			pageCount: 2,
			filters: { event: 'role.granted', actorId: '', targetId: '' },
		}),
	)

	const pager = await screen.findByRole('navigation', { name: /pagination/i })
	expect(within(pager).getByRole('link', { name: '2' })).toHaveAttribute(
		'href',
		'/admin/audit?event=role.granted&page=2',
	)
})
