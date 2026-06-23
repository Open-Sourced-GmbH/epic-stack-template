/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react'
import { expect, test } from 'vitest'
import {
	deriveSelection,
	pruneSelection,
	toggleAllSelection,
	toggleSelection,
	useRowSelection,
} from './row-selection.ts'

test('toggleSelection adds an unselected id, returning a new set', () => {
	const before = new Set<string>()
	const after = toggleSelection(before, 'a')
	expect([...after]).toEqual(['a'])
	// The input is never mutated — callers can rely on referential change.
	expect(before.size).toBe(0)
})

test('toggleSelection removes an already-selected id', () => {
	const after = toggleSelection(new Set(['a', 'b']), 'a')
	expect([...after]).toEqual(['b'])
})

test('toggleAllSelection selects every id when none/some are selected', () => {
	const allIds = ['a', 'b', 'c']
	expect([...toggleAllSelection(new Set(), allIds)]).toEqual(allIds)
	expect([...toggleAllSelection(new Set(['b']), allIds)]).toEqual(allIds)
})

test('toggleAllSelection clears when every id is already selected', () => {
	const allIds = ['a', 'b', 'c']
	expect([...toggleAllSelection(new Set(allIds), allIds)]).toEqual([])
})

test('pruneSelection drops ids that are no longer present', () => {
	const after = pruneSelection(new Set(['a', 'gone', 'c']), ['a', 'b', 'c'])
	expect([...after].sort()).toEqual(['a', 'c'])
})

test('deriveSelection reports an empty selection', () => {
	expect(deriveSelection(new Set(), ['a', 'b'])).toEqual({
		allSelected: false,
		someSelected: false,
		count: 0,
	})
})

test('deriveSelection marks a strict, non-empty subset as someSelected', () => {
	expect(deriveSelection(new Set(['a']), ['a', 'b'])).toEqual({
		allSelected: false,
		someSelected: true,
		count: 1,
	})
})

test('deriveSelection marks a full selection as allSelected, not someSelected', () => {
	expect(deriveSelection(new Set(['a', 'b']), ['a', 'b'])).toEqual({
		allSelected: true,
		someSelected: false,
		count: 2,
	})
})

test('deriveSelection treats an empty id set as neither all nor some', () => {
	expect(deriveSelection(new Set(), [])).toEqual({
		allSelected: false,
		someSelected: false,
		count: 0,
	})
})

test('useRowSelection starts empty and toggles a single row', () => {
	const { result } = renderHook(() => useRowSelection(['a', 'b', 'c']))

	expect(result.current.count).toBe(0)
	expect(result.current.isSelected('a')).toBe(false)

	act(() => result.current.toggle('a'))
	expect(result.current.isSelected('a')).toBe(true)
	expect(result.current.count).toBe(1)
	expect(result.current.someSelected).toBe(true)
	expect(result.current.allSelected).toBe(false)
	expect([...result.current.selected]).toEqual(['a'])

	act(() => result.current.toggle('a'))
	expect(result.current.isSelected('a')).toBe(false)
	expect(result.current.count).toBe(0)
})

test('useRowSelection toggleAll flips between all and none, and clear empties', () => {
	const { result } = renderHook(() => useRowSelection(['a', 'b', 'c']))

	act(() => result.current.toggleAll())
	expect(result.current.allSelected).toBe(true)
	expect(result.current.someSelected).toBe(false)
	expect(result.current.count).toBe(3)

	act(() => result.current.toggleAll())
	expect(result.current.count).toBe(0)
	expect(result.current.allSelected).toBe(false)

	act(() => result.current.toggle('b'))
	act(() => result.current.clear())
	expect(result.current.count).toBe(0)
})

test('useRowSelection drops ids that leave allIds on rerender', () => {
	const { result, rerender } = renderHook(({ ids }) => useRowSelection(ids), {
		initialProps: { ids: ['a', 'b', 'c'] },
	})

	act(() => result.current.toggle('a'))
	act(() => result.current.toggle('c'))
	expect(result.current.count).toBe(2)

	// 'c' leaves the list — it must silently drop out of the selection.
	rerender({ ids: ['a', 'b'] })
	expect(result.current.isSelected('c')).toBe(false)
	expect([...result.current.selected]).toEqual(['a'])
	expect(result.current.count).toBe(1)
})
