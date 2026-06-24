import { invariantResponse } from '@epic-web/invariant'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { useEffect } from 'react'
import {
	redirect,
	Form,
	Link,
	useFetcher,
	useSearchParams,
	useSubmit,
} from 'react-router'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Field } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { useRowSelection } from '#app/components/ui/row-selection.ts'
import { Table, type TableColumn } from '#app/components/ui/table.tsx'
import { type AdminHeader } from '#app/routes/admin/_layout.tsx'
import {
	cacheBackends,
	getAllCacheKeys,
	searchCacheKeys,
} from '#app/utils/cache.server.ts'
import {
	ensureInstance,
	getAllInstances,
	getInstanceInfo,
} from '#app/utils/litefs.server.ts'
import { useDebounce, useDoubleCheck } from '#app/utils/misc.tsx'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import {
	parseCacheEntryId,
	toCacheRows,
	type CacheRow,
} from './+shared/cache-admin.ts'
import { type Route } from './+types/index.ts'

export const handle: SEOHandle & { adminHeader: AdminHeader } = {
	getSitemapEntries: () => null,
	// The admin shell owns the lone PageHeader; this surface only feeds it a title.
	adminHeader: { title: 'Cache' },
}

export const meta: Route.MetaFunction = () => [{ title: 'Cache — Admin' }]

/** The loader payload — exported so render tests can pin a known key list. */
export type CacheAdminData = {
	cacheKeys: { lru: Array<string>; sqlite: Array<string> }
	instance: string
	instances: Record<string, string>
	currentInstanceInfo: { currentInstance: string; primaryInstance: string }
}

export async function loader({ request }: Route.LoaderArgs) {
	await requireUserWithRole(request, 'admin')
	const searchParams = new URL(request.url).searchParams
	const query = searchParams.get('query')
	if (query === '') {
		searchParams.delete('query')
		return redirect(`/admin/cache?${searchParams.toString()}`)
	}
	const limit = Number(searchParams.get('limit') ?? 100)

	const currentInstanceInfo = await getInstanceInfo()
	const instance =
		searchParams.get('instance') ?? currentInstanceInfo.currentInstance
	const instances = await getAllInstances()
	await ensureInstance(instance)

	const cacheKeys =
		typeof query === 'string'
			? await searchCacheKeys(query, limit)
			: await getAllCacheKeys(limit)
	return { cacheKeys, instance, instances, currentInstanceInfo }
}

/**
 * Delete one or more cache entries. This extends the original single-key delete:
 * the selected row ids ride as repeated `cacheKey` fields, each `type:key` (a
 * lone row's ghost-trash submits exactly one). Each id carries its own backend,
 * so a delete spanning both the LRU and SQLite caches lands in one submit.
 */
export async function action({ request }: Route.ActionArgs) {
	await requireUserWithRole(request, 'admin')
	const formData = await request.formData()
	const { currentInstance } = await getInstanceInfo()
	const instance = formData.get('instance') ?? currentInstance

	invariantResponse(typeof instance === 'string', 'instance must be a string')
	await ensureInstance(instance)

	const ids = formData.getAll('cacheKey').map(String)
	for (const id of ids) {
		const parsed = parseCacheEntryId(id)
		invariantResponse(parsed, `Invalid cache entry id: ${id}`)
		await cacheBackends[parsed.type].delete(parsed.key)
	}
	return { success: true, deleted: ids.length }
}

/** The branded `#` tile that leads each key row (the sprite has no hash glyph). */
function KeyTile() {
	return (
		<div
			aria-hidden="true"
			className="bg-brand-soft text-brand flex size-9 shrink-0 items-center justify-center rounded-lg font-mono text-body-sm font-semibold"
		>
			#
		</div>
	)
}

/** The "Key" cell — `#` tile + the mono key (linking to its value page) + backend. */
function KeyCell({ row, instance }: { row: CacheRow; instance: string }) {
	const valuePage = `/admin/cache/${row.type}/${encodeURIComponent(row.key)}?instance=${instance}`
	return (
		<div className="flex min-w-0 items-center gap-3">
			<KeyTile />
			<div className="flex min-w-0 flex-col gap-0.5">
				<Link
					reloadDocument
					to={valuePage}
					className="focus-cosy truncate rounded-sm font-mono text-body-sm"
				>
					{row.key}
				</Link>
				<span className="text-muted-foreground text-body-xs uppercase">
					{row.type}
				</span>
			</div>
		</div>
	)
}

/** A row's ghost trash — a single-entry submit through the shared delete action. */
function RowDeleteButton({
	row,
	instance,
}: {
	row: CacheRow
	instance: string
}) {
	const fetcher = useFetcher<typeof action>()
	const dc = useDoubleCheck()
	return (
		<fetcher.Form method="POST" className="justify-self-end">
			<input type="hidden" name="cacheKey" value={row.id} />
			<input type="hidden" name="instance" value={instance} />
			<Button
				variant="ghost"
				size="icon-sm"
				{...dc.getButtonProps({
					type: 'submit',
					'aria-label': dc.doubleCheck
						? `Confirm delete ${row.key}`
						: `Delete ${row.key}`,
				})}
			>
				<Icon
					name={dc.doubleCheck ? 'check' : 'trash'}
					className="size-4"
				/>
			</Button>
		</fetcher.Form>
	)
}

/** The slice of {@link useRowSelection} the bulk-action bar drives. */
type BarSelection = Pick<
	ReturnType<typeof useRowSelection>,
	'count' | 'selected' | 'clear'
>

/**
 * The selection toolbar shown above the Table once a key is checked: the count
 * plus a bulk Delete. It submits the selected row ids (`type:key`) + instance to
 * this route's `action` via a fetcher (no navigation), then clears the selection
 * on success. Delete is destructive, so it uses the double-check confirm pattern.
 */
function BulkActionBar({
	selection,
	instance,
}: {
	selection: BarSelection
	instance: string
}) {
	const fetcher = useFetcher<typeof action>()
	const deleteCheck = useDoubleCheck()
	const { count, selected, clear } = selection
	const ids = [...selected]
	const busy = fetcher.state !== 'idle'

	// Drop the selection once the bulk delete lands, so the bar collapses and the
	// revalidated list shows through.
	useEffect(() => {
		if (fetcher.state === 'idle' && fetcher.data?.success) {
			clear()
		}
	}, [fetcher.state, fetcher.data, clear])

	if (count === 0) return null

	return (
		<div className="bg-card border-border mb-4 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3">
			<span className="text-body-sm font-medium" aria-live="polite">
				{count} selected
			</span>
			<fetcher.Form method="post" className="ml-auto flex items-center gap-2">
				<input type="hidden" name="instance" value={instance} />
				{ids.map((id) => (
					<input key={id} type="hidden" name="cacheKey" value={id} />
				))}
				<Button
					variant="destructive"
					size="sm"
					disabled={busy}
					{...deleteCheck.getButtonProps({ type: 'submit' })}
				>
					{deleteCheck.doubleCheck ? 'Confirm delete' : 'Delete'}
				</Button>
			</fetcher.Form>
		</div>
	)
}

/** Build the column set bound to the current `instance` (cells need it for links). */
function columnsFor(instance: string): Array<TableColumn<CacheRow>> {
	return [
		{
			key: 'key',
			header: 'Key',
			cell: (row) => <KeyCell row={row} instance={instance} />,
		},
		{
			key: 'actions',
			header: '',
			headerClassName: 'sr-only',
			cell: (row) => <RowDeleteButton row={row} instance={instance} />,
		},
	]
}

/** `grid-template-columns`: the Key cell flexes, the trash track hugs. */
const columnTemplate = 'minmax(0,1fr) max-content'

export function HydrateFallback() {
	return (
		<main className="container max-w-(--shell-max) py-8">
			<Table
				aria-label="Cache keys"
				columns={columnsFor('')}
				data={[]}
				getRowId={(row) => row.id}
				columnTemplate={columnTemplate}
				loading
				loadingRows={6}
			/>
		</main>
	)
}

/**
 * The cache admin (`/admin/cache`): every cached key (LRU + SQLite) in one
 * managed `Table` inside the admin shell. An in-card toolbar carries the debounced
 * search + a live key count and the instance / limit controls; rows are a `#`
 * tile + the mono key (click-through to its value) + a ghost trash. Multi-select
 * drives a bulk Delete that extends the single-key delete path. Admin-only at the
 * loader.
 */
export default function CacheAdminRoute({ loaderData }: Route.ComponentProps) {
	const [searchParams] = useSearchParams()
	const submit = useSubmit()
	const query = searchParams.get('query') ?? ''
	const limit = searchParams.get('limit') ?? '100'
	const instance = searchParams.get('instance') ?? loaderData.instance

	const rows = toCacheRows(loaderData.cacheKeys)
	const total = rows.length
	// Selection lives here (not in the Table) so the bulk-action bar can read it;
	// it's keyed on the current rows' ids and prunes itself as the list changes.
	const selection = useRowSelection(rows.map((row) => row.id))

	const handleFormChange = useDebounce(async (form: HTMLFormElement) => {
		await submit(form)
	}, 400)

	return (
		<main className="container max-w-(--shell-max) py-8">
			<Form
				method="get"
				className="mb-4 flex flex-col gap-3"
				onChange={(e) => handleFormChange(e.currentTarget)}
			>
				<div className="flex flex-wrap items-end gap-4">
					<Field
						className="mb-0 flex-1"
						labelProps={{ children: 'Search' }}
						inputProps={{
							type: 'search',
							name: 'query',
							defaultValue: query,
							placeholder: 'Filter keys…',
						}}
					/>
					<Field
						className="mb-0 w-28"
						labelProps={{ children: 'Limit' }}
						inputProps={{
							name: 'limit',
							defaultValue: limit,
							type: 'number',
							step: '1',
							min: '1',
							max: '10000',
						}}
					/>
					<div className="mb-2 flex flex-col gap-1">
						<label
							htmlFor="cache-instance"
							className="text-foreground text-body-xs font-medium"
						>
							Instance
						</label>
						<select
							id="cache-instance"
							name="instance"
							defaultValue={instance}
							className="border-input bg-background h-10 rounded-md border px-3 text-body-sm"
						>
							{Object.entries(loaderData.instances).map(([inst, region]) => (
								<option key={inst} value={inst}>
									{[
										inst,
										`(${region})`,
										inst === loaderData.currentInstanceInfo.currentInstance
											? '(current)'
											: '',
										inst === loaderData.currentInstanceInfo.primaryInstance
											? '(primary)'
											: '',
									]
										.filter(Boolean)
										.join(' ')}
								</option>
							))}
						</select>
					</div>
				</div>
				<p className="text-muted-foreground text-body-sm">
					{total} {total === 1 ? 'key' : 'keys'}
				</p>
			</Form>

			<BulkActionBar selection={selection} instance={instance} />

			<Table
				aria-label="Cache keys"
				columns={columnsFor(instance)}
				data={rows}
				getRowId={(row) => row.id}
				columnTemplate={columnTemplate}
				selection={selection}
				getRowLabel={(row) => row.key}
				emptyState={{
					icon: <Icon name="magnifying-glass" className="size-6" />,
					title: query ? 'No keys match' : 'Cache is empty',
					description: query
						? `No cache keys match “${query}”.`
						: 'Cached values will appear here as the app warms up.',
				}}
			/>
		</main>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: ({ error }) => (
					<p>You are not allowed to do that: {error?.data.message}</p>
				),
			}}
		/>
	)
}
