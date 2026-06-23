/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import { FeedSkeleton, PostCard } from './__feed.tsx'

test('the loading skeleton renders a hero plus a card grid of placeholders', () => {
	const { container } = render(<FeedSkeleton cards={6} />)
	// 1 hero + 6 cards × 3 lines = 19 skeleton placeholders.
	const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
	expect(skeletons).toHaveLength(1 + 6 * 3)
})

test('a coverless post card falls back to a decorative gradient cover', () => {
	const Stub = createRoutesStub([
		{
			path: '/',
			Component: () => (
				<PostCard
					post={{
						id: '1',
						title: 'No cover here',
						slug: 'no-cover',
						excerpt: 'An excerpt.',
						publishedAt: new Date('2026-01-01'),
						coverImage: null,
						author: null,
						tags: [],
					}}
				/>
			),
		},
	])
	render(<Stub initialEntries={['/']} />)

	// The card still links to its article and shows the author fallback credit.
	expect(screen.getByRole('link', { name: /no cover here/i })).toHaveAttribute(
		'href',
		'/blog/no-cover',
	)
	expect(screen.getByText(/Open Sourced/)).toBeInTheDocument()
})
