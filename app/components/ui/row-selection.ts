import { useCallback, useMemo, useState } from 'react'

export function toggleSelection(
	selected: ReadonlySet<string>,
	id: string,
): Set<string> {
	const next = new Set(selected)
	if (next.has(id)) {
		next.delete(id)
	} else {
		next.add(id)
	}
	return next
}

export function toggleAllSelection(
	selected: ReadonlySet<string>,
	allIds: readonly string[],
): Set<string> {
	// All currently present → none; otherwise select the full id set.
	const allPresent =
		allIds.length > 0 && allIds.every((id) => selected.has(id))
	return allPresent ? new Set() : new Set(allIds)
}

export function pruneSelection(
	selected: ReadonlySet<string>,
	allIds: readonly string[],
): Set<string> {
	return new Set(allIds.filter((id) => selected.has(id)))
}

export function deriveSelection(
	selected: ReadonlySet<string>,
	allIds: readonly string[],
): { allSelected: boolean; someSelected: boolean; count: number } {
	// Count only ids that are actually present, so a stale selection never
	// over-reports. `someSelected` is the strict-subset case that drives the
	// header checkbox's indeterminate state.
	const count = allIds.reduce((n, id) => (selected.has(id) ? n + 1 : n), 0)
	const allSelected = allIds.length > 0 && count === allIds.length
	const someSelected = count > 0 && count < allIds.length
	return { allSelected, someSelected, count }
}

/**
 * Track multi-row selection over a caller-provided id list. The selection state
 * is held raw and pruned on read against the current `allIds`, so ids that leave
 * the list silently drop out without an effect. All transition/derivation logic
 * lives in the pure helpers above, keeping this hook a thin wrapper.
 */
export function useRowSelection(allIds: string[]) {
	const [raw, setRaw] = useState<ReadonlySet<string>>(() => new Set())

	const selected = useMemo(() => pruneSelection(raw, allIds), [raw, allIds])
	const { allSelected, someSelected, count } = useMemo(
		() => deriveSelection(selected, allIds),
		[selected, allIds],
	)

	const isSelected = useCallback((id: string) => selected.has(id), [selected])
	const toggle = useCallback((id: string) => {
		setRaw((prev) => toggleSelection(prev, id))
	}, [])
	const toggleAll = useCallback(() => {
		setRaw((prev) => toggleAllSelection(pruneSelection(prev, allIds), allIds))
	}, [allIds])
	const clear = useCallback(() => setRaw(new Set()), [])

	return {
		selected,
		isSelected,
		toggle,
		toggleAll,
		clear,
		allSelected,
		someSelected,
		count,
	}
}
