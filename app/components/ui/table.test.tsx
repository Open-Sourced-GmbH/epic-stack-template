/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import { DropdownMenuItem } from './dropdown-menu.tsx'
import { useRowSelection } from './row-selection.ts'
import { type TableColumn, Table } from './table.tsx'

type Row = { id: string; name: string; size: string }

const rows: Row[] = [
	{ id: 'a', name: 'alpha', size: '1 KB' },
	{ id: 'b', name: 'beta', size: '2 KB' },
]

const columns: Array<TableColumn<Row>> = [
	{ key: 'name', header: 'Name', cell: (r) => r.name },
	{ key: 'size', header: 'Size', cell: (r) => r.size },
]

test('renders a table with column headers and a cell per row/column', () => {
	render(
		<Table
			aria-label="Keys"
			columns={columns}
			data={rows}
			getRowId={(r) => r.id}
			columnTemplate="1fr auto"
		/>,
	)

	const table = screen.getByRole('table', { name: 'Keys' })
	expect(within(table).getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
	expect(within(table).getByRole('columnheader', { name: 'Size' })).toBeInTheDocument()

	// One data row per item (header row excluded by the rowgroup split).
	const bodyRows = within(table)
		.getAllByRole('row')
		.filter((row) => within(row).queryAllByRole('cell').length > 0)
	expect(bodyRows).toHaveLength(2)
	expect(within(bodyRows[0]!).getByText('alpha')).toBeInTheDocument()
	expect(within(bodyRows[0]!).getByText('1 KB')).toBeInTheDocument()
	expect(within(bodyRows[1]!).getByText('beta')).toBeInTheDocument()
})

function SelectableTable() {
	const selection = useRowSelection(rows.map((r) => r.id))
	return (
		<Table
			aria-label="Keys"
			columns={columns}
			data={rows}
			getRowId={(r) => r.id}
			columnTemplate="1fr auto"
			selection={selection}
			getRowLabel={(r) => r.name}
		/>
	)
}

test('select-all checkbox goes indeterminate for a strict subset, checked for all', async () => {
	const user = userEvent.setup()
	render(<SelectableTable />)

	const selectAll = screen.getByRole('checkbox', { name: /select all/i })
	expect(selectAll).not.toBeChecked()

	// Selecting one of two rows is a strict subset → indeterminate ("mixed").
	await user.click(screen.getByRole('checkbox', { name: 'Select alpha' }))
	expect(selectAll).toBePartiallyChecked()

	// Selecting the second row completes the set → fully checked.
	await user.click(screen.getByRole('checkbox', { name: 'Select beta' }))
	expect(selectAll).toBeChecked()
})

test('the select-all header checkbox toggles every row at once', async () => {
	const user = userEvent.setup()
	render(<SelectableTable />)

	await user.click(screen.getByRole('checkbox', { name: /select all/i }))

	expect(screen.getByRole('checkbox', { name: 'Select alpha' })).toBeChecked()
	expect(screen.getByRole('checkbox', { name: 'Select beta' })).toBeChecked()
})

test('a selected row carries the brand left bar', async () => {
	const user = userEvent.setup()
	render(<SelectableTable />)

	await user.click(screen.getByRole('checkbox', { name: 'Select alpha' }))

	const selectedRow = screen
		.getByRole('checkbox', { name: 'Select alpha' })
		.closest('[role="row"]')
	expect(selectedRow).toHaveClass('shadow-[inset_3px_0_0_0_var(--brand)]')
})

test('renders a per-row action menu that opens to reveal its items', async () => {
	const user = userEvent.setup()
	render(
		<Table
			aria-label="Keys"
			columns={columns}
			data={rows}
			getRowId={(r) => r.id}
			columnTemplate="1fr auto"
			rowActions={(r) => <DropdownMenuItem>Delete {r.name}</DropdownMenuItem>}
			getRowActionsLabel={(r) => `Actions for ${r.name}`}
		/>,
	)

	const trigger = screen.getByRole('button', { name: 'Actions for alpha' })
	expect(screen.queryByRole('menuitem', { name: 'Delete alpha' })).toBeNull()

	await user.click(trigger)
	expect(
		screen.getByRole('menuitem', { name: 'Delete alpha' }),
	).toBeInTheDocument()
})

test('renders the empty state (title + CTA) in place of rows when there is no data', () => {
	render(
		<Table
			aria-label="Keys"
			columns={columns}
			data={[]}
			getRowId={(r) => r.id}
			columnTemplate="1fr auto"
			emptyState={{
				title: 'No keys yet',
				description: 'Cached values will show up here.',
				action: <button type="button">Refresh</button>,
			}}
		/>,
	)

	expect(screen.getByText('No keys yet')).toBeInTheDocument()
	expect(screen.getByText('Cached values will show up here.')).toBeInTheDocument()
	expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
	// Column headers are suppressed — there are no rows to head.
	expect(screen.queryByRole('columnheader')).toBeNull()
})

test('renders Skeleton placeholder rows while loading, not the data', () => {
	const { container } = render(
		<Table
			aria-label="Keys"
			columns={columns}
			data={rows}
			getRowId={(r) => r.id}
			columnTemplate="1fr auto"
			loading
			loadingRows={4}
		/>,
	)

	expect(
		container.querySelectorAll('[data-slot="skeleton"]').length,
	).toBeGreaterThanOrEqual(4)
	// Real data is withheld until loading resolves.
	expect(screen.queryByText('alpha')).toBeNull()
})

test('renders a footer slot (e.g. the pager) beneath the rows', () => {
	render(
		<Table
			aria-label="Keys"
			columns={columns}
			data={rows}
			getRowId={(r) => r.id}
			columnTemplate="1fr auto"
			footer={<nav aria-label="Pagination">pager</nav>}
		/>,
	)

	expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
})

test('getRowHref makes the whole row a labelled link to the detail view', () => {
	const Stub = createRoutesStub([
		{
			path: '/',
			Component: () => (
				<Table
					aria-label="Keys"
					columns={columns}
					data={rows}
					getRowId={(r) => r.id}
					getRowHref={(r) => `/keys/${r.id}`}
					getRowLabel={(r) => r.name}
					columnTemplate="1fr auto"
				/>
			),
		},
	])
	render(<Stub initialEntries={['/']} />)

	const link = screen.getByRole('link', { name: 'alpha' })
	expect(link).toHaveAttribute('href', '/keys/a')
	// The anchor stretches to fill the row, which turns relative for it.
	expect(link.closest('[role="row"]')).toHaveClass('relative')
})

test('a navigable row keeps its checkbox and ⋯ menu clickable above the overlay', async () => {
	const user = userEvent.setup()
	function NavigableTable() {
		const selection = useRowSelection(rows.map((r) => r.id))
		return (
			<Table
				aria-label="Keys"
				columns={columns}
				data={rows}
				getRowId={(r) => r.id}
				getRowHref={(r) => `/keys/${r.id}`}
				getRowLabel={(r) => r.name}
				selection={selection}
				rowActions={(r) => <DropdownMenuItem>Delete {r.name}</DropdownMenuItem>}
				getRowActionsLabel={(r) => `Actions for ${r.name}`}
				columnTemplate="1fr auto"
			/>
		)
	}
	const Stub = createRoutesStub([{ path: '/', Component: NavigableTable }])
	render(<Stub initialEntries={['/']} />)

	// The selection checkbox still toggles despite the stretched row link.
	await user.click(screen.getByRole('checkbox', { name: 'Select alpha' }))
	expect(screen.getByRole('checkbox', { name: 'Select alpha' })).toBeChecked()

	// The ⋯ menu still opens.
	await user.click(screen.getByRole('button', { name: 'Actions for alpha' }))
	expect(
		screen.getByRole('menuitem', { name: 'Delete alpha' }),
	).toBeInTheDocument()
})

test('applies zebra striping only when opted in', () => {
	const { rerender } = render(
		<Table
			aria-label="Keys"
			columns={columns}
			data={rows}
			getRowId={(r) => r.id}
			columnTemplate="1fr auto"
		/>,
	)

	const dataRows = () =>
		screen
			.getAllByRole('row')
			.filter((row) => within(row).queryAllByRole('cell').length > 0)

	// Off by default — no zebra utility on the rows.
	expect(dataRows()[1]).not.toHaveClass('even:bg-muted/40')

	rerender(
		<Table
			aria-label="Keys"
			columns={columns}
			data={rows}
			getRowId={(r) => r.id}
			columnTemplate="1fr auto"
			zebra
		/>,
	)
	expect(dataRows()[1]).toHaveClass('even:bg-muted/40')
})
