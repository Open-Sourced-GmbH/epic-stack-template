/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import {
	getPaginationRange,
	Pagination,
	PAGINATION_ELLIPSIS,
} from './pagination.tsx'

test('a single page (or none) collapses the range to nothing to render', () => {
	expect(getPaginationRange(1, 1)).toEqual([1])
	expect(getPaginationRange(1, 0)).toEqual([])
})

test('a short range lists every page with no ellipsis', () => {
	expect(getPaginationRange(2, 4)).toEqual([1, 2, 3, 4])
})

test('the window keeps first, last, and current ±1, collapsing the rest', () => {
	// page 5 of 10: first … 4 5 6 … last
	expect(getPaginationRange(5, 10)).toEqual([
		1,
		PAGINATION_ELLIPSIS,
		4,
		5,
		6,
		PAGINATION_ELLIPSIS,
		10,
	])
})

test('a current page adjacent to an end does not leave a one-page gap', () => {
	// page 2 of 10: 1 2 3 … 10 (no ellipsis between 1 and 2)
	expect(getPaginationRange(2, 10)).toEqual([1, 2, 3, PAGINATION_ELLIPSIS, 10])
	// page 9 of 10: 1 … 8 9 10
	expect(getPaginationRange(9, 10)).toEqual([1, PAGINATION_ELLIPSIS, 8, 9, 10])
})

test('an out-of-range page is clamped into the valid window', () => {
	expect(getPaginationRange(0, 5)).toEqual(getPaginationRange(1, 5))
	expect(getPaginationRange(99, 5)).toEqual(getPaginationRange(5, 5))
})

function renderPager(page: number, pageCount: number) {
	render(
		<Pagination
			page={page}
			pageCount={pageCount}
			getPageHref={(p) => (p > 1 ? `/blog?page=${p}` : '/blog')}
		/>,
	)
	return screen.getByRole('navigation', { name: 'Pagination' })
}

test('renders inside a labelled Pagination nav', () => {
	const nav = renderPager(1, 5)
	expect(nav).toBeInTheDocument()
})

test('a single page renders no pager at all', () => {
	const { container } = render(
		<Pagination page={1} pageCount={1} getPageHref={() => '/blog'} />,
	)
	expect(container).toBeEmptyDOMElement()
})

test('the active page is marked aria-current and links the others', () => {
	const nav = renderPager(3, 5)
	const current = within(nav).getByRole('link', { current: 'page' })
	expect(current).toHaveTextContent('3')

	// page 4 is a navigable link to the next page
	const four = within(nav).getByRole('link', { name: '4' })
	expect(four).toHaveAttribute('href', '/blog?page=4')
	expect(four).not.toHaveAttribute('aria-current')
})

test('prev is disabled on the first page and next on the last', () => {
	const first = renderPager(1, 5)
	const prev = within(first).getByLabelText('Previous page')
	expect(prev).toHaveAttribute('aria-disabled', 'true')
	expect(prev).not.toHaveAttribute('href')
	// next is live on page 1
	expect(within(first).getByLabelText('Next page')).toHaveAttribute(
		'href',
		'/blog?page=2',
	)

	render(
		<Pagination page={5} pageCount={5} getPageHref={(p) => `/blog?page=${p}`} />,
	)
	const last = screen.getAllByRole('navigation', { name: 'Pagination' })[1]!
	const next = within(last).getByLabelText('Next page')
	expect(next).toHaveAttribute('aria-disabled', 'true')
	expect(next).not.toHaveAttribute('href')
})

test('a collapsed gap renders a non-interactive ellipsis', () => {
	const nav = renderPager(5, 10)
	// the ellipsis is presentational, not a link
	expect(within(nav).getAllByText('…').length).toBeGreaterThanOrEqual(1)
	expect(within(nav).queryByRole('link', { name: '…' })).toBeNull()
})
