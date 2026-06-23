import { type ReactNode } from 'react'

import { cn } from '#app/utils/misc.tsx'
import { Button } from './button.tsx'
import { Checkbox } from './checkbox.tsx'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from './dropdown-menu.tsx'
import { Icon } from './icon.tsx'
import { type useRowSelection } from './row-selection.ts'
import { Skeleton } from './skeleton.tsx'

/**
 * The slice of {@link useRowSelection} the Table consumes. The consumer owns the
 * hook (so it can also drive a bulk-action bar) and hands the Table this view of
 * it; passing `selection` switches on the select-all header + per-row checkboxes.
 */
export type RowSelection = Pick<
	ReturnType<typeof useRowSelection>,
	'isSelected' | 'toggle' | 'toggleAll' | 'allSelected' | 'someSelected'
>

/** The select-all header checkbox's tri-state, derived from the selection. */
function headerCheckedState(
	selection: RowSelection,
): boolean | 'indeterminate' {
	if (selection.allSelected) return true
	if (selection.someSelected) return 'indeterminate'
	return false
}

/** The branded empty-state content shown when a table has no rows. */
export type TableEmptyState = {
	/** Glyph rendered in a `bg-brand-soft` tile above the title. */
	icon?: ReactNode
	title: ReactNode
	description?: ReactNode
	/** A call-to-action (e.g. a "New post" Button). */
	action?: ReactNode
}

/** The dashed empty card — brand icon tile + title + optional description/CTA. */
function TableEmpty({ icon, title, description, action }: TableEmptyState) {
	return (
		<div
			data-slot="table-empty"
			className="border-border m-4 flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center"
		>
			{icon != null ? (
				<div className="bg-brand-soft text-brand flex size-12 items-center justify-center rounded-xl">
					{icon}
				</div>
			) : null}
			<div className="flex flex-col gap-1">
				<p className="text-h6">{title}</p>
				{description != null ? (
					<p className="text-muted-foreground text-body-sm">{description}</p>
				) : null}
			</div>
			{action != null ? <div className="mt-2">{action}</div> : null}
		</div>
	)
}

export type TableColumn<Row> = {
	/** Stable key for the column. */
	key: string
	/** Header cell content. */
	header: ReactNode
	/** Render the body cell for a row. */
	cell: (row: Row) => ReactNode
	/** Optional className for the body cell. */
	className?: string
	/** Optional className for the header cell. */
	headerClassName?: string
}

type TableProps<Row> = {
	/** Column definitions, left-to-right. */
	columns: Array<TableColumn<Row>>
	/** Row data. */
	data: Row[]
	/** Stable id for a row (drives React keys and selection). */
	getRowId: (row: Row) => string
	/**
	 * `grid-template-columns` for the data columns. The selection and row-action
	 * tracks (when enabled) are added automatically around it.
	 */
	columnTemplate: string
	/**
	 * Row-selection state from {@link useRowSelection}. When present, the Table
	 * renders the select-all header checkbox and a per-row checkbox.
	 */
	selection?: RowSelection
	/** Accessible label for a row's selection checkbox (e.g. the row title). */
	getRowLabel?: (row: Row) => string
	/** Per-row overflow-menu content (a fragment of `DropdownMenuItem`s). */
	rowActions?: (row: Row) => ReactNode
	/** Accessible label for a row's ⋯ action trigger. @default 'Row actions' */
	getRowActionsLabel?: (row: Row) => string
	/**
	 * Branded empty state shown (in place of the header + rows) when `data` is
	 * empty and not loading — a dashed card with an optional brand icon tile.
	 */
	emptyState?: TableEmptyState
	/** Render Skeleton placeholder rows instead of the data. */
	loading?: boolean
	/** Number of Skeleton rows to show while loading. @default 3 */
	loadingRows?: number
	/** Tint alternating rows. @default false */
	zebra?: boolean
	/** Footer slot rendered beneath the rows (e.g. a `<Pagination/>`). */
	footer?: ReactNode
	className?: string
	'aria-label'?: string
}

function Table<Row>({
	columns,
	data,
	getRowId,
	columnTemplate,
	selection,
	getRowLabel,
	rowActions,
	getRowActionsLabel,
	emptyState,
	loading = false,
	loadingRows = 3,
	zebra = false,
	footer,
	className,
	'aria-label': ariaLabel,
}: TableProps<Row>) {
	// The select-all checkbox occupies a leading `min-content` track and the ⋯
	// action menu a trailing one, around the consumer's data columns.
	const fullTemplate = [
		selection ? 'min-content' : null,
		columnTemplate,
		rowActions ? 'min-content' : null,
	]
		.filter(Boolean)
		.join(' ')
	const rowStyle = { gridTemplateColumns: fullTemplate }
	// Show the branded empty card only when the consumer supplied one; otherwise
	// fall through to the header over zero rows.
	const showEmpty = !loading && data.length === 0 && emptyState != null
	// Count the data columns plus the selection/action tracks, so each skeleton
	// row fills the same grid as a real one.
	const cellCount = columns.length + (selection ? 1 : 0) + (rowActions ? 1 : 0)

	return (
		<div
			role="table"
			aria-label={ariaLabel}
			data-slot="table"
			className={cn(
				'bg-card border-border overflow-hidden rounded-xl border',
				className,
			)}
		>
			{showEmpty && emptyState ? (
				<TableEmpty {...emptyState} />
			) : (
				<>
					<div role="rowgroup">
						<div
							role="row"
							style={rowStyle}
							className="text-muted-foreground border-border text-body-2xs grid items-center gap-3 border-b px-4 py-2.5 font-medium tracking-wide uppercase"
						>
							{selection ? (
								<div role="columnheader">
									<Checkbox
										checked={headerCheckedState(selection)}
										onCheckedChange={() => selection.toggleAll()}
										aria-label="Select all rows"
									/>
								</div>
							) : null}
							{columns.map((column) => (
								<div
									key={column.key}
									role="columnheader"
									className={column.headerClassName}
								>
									{column.header}
								</div>
							))}
							{rowActions ? (
								<div role="columnheader">
									<span className="sr-only">Actions</span>
								</div>
							) : null}
						</div>
					</div>
					<div role="rowgroup">
						{loading
							? Array.from({ length: loadingRows }, (_, rowIndex) => (
									<div
										key={`skeleton-${rowIndex}`}
										role="row"
										aria-hidden="true"
										style={rowStyle}
										className="border-border grid items-center gap-3 border-b px-4 py-3 last:border-b-0"
									>
										{Array.from({ length: cellCount }, (_, cellIndex) => (
											<div key={cellIndex} role="cell">
												<Skeleton className="h-4 w-full" />
											</div>
										))}
									</div>
								))
							: data.map((row) => {
									const id = getRowId(row)
									const isSelected = selection?.isSelected(id) ?? false
									return (
										<div
											key={id}
											role="row"
											style={rowStyle}
											className={cn(
												'border-border hover:bg-accent text-body-sm grid items-center gap-3 border-b px-4 py-3 transition-colors last:border-b-0',
												zebra && 'even:bg-muted/40',
												isSelected && 'shadow-[inset_3px_0_0_0_var(--brand)]',
											)}
										>
											{selection ? (
												<div role="cell">
													<Checkbox
														checked={isSelected}
														onCheckedChange={() => selection.toggle(id)}
														aria-label={`Select ${getRowLabel?.(row) ?? 'row'}`}
													/>
												</div>
											) : null}
											{columns.map((column) => (
												<div
													key={column.key}
													role="cell"
													className={column.className}
												>
													{column.cell(row)}
												</div>
											))}
											{rowActions ? (
												<div role="cell" className="justify-self-end">
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button
																variant="ghost"
																size="icon-sm"
																aria-label={
																	getRowActionsLabel?.(row) ?? 'Row actions'
																}
															>
																<Icon
																	name="dots-horizontal"
																	className="size-4"
																/>
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															{rowActions(row)}
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											) : null}
										</div>
									)
								})}
					</div>
					{footer != null ? (
						<div
							data-slot="table-footer"
							className="border-border flex items-center justify-end border-t px-4 py-3"
						>
							{footer}
						</div>
					) : null}
				</>
			)}
		</div>
	)
}

export { Table }
