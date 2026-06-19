/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { Carousel, type CarouselSlide } from './__carousel.tsx'

// Default to reduced motion so autoplay/progress stay off unless a test opts in.
beforeEach(() => {
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: query.includes('reduce'),
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}))
})

afterEach(() => {
	vi.unstubAllGlobals()
})

const slides: CarouselSlide[] = [
	{ id: 'one', label: 'One', content: <p>First panel</p> },
	{ id: 'two', label: 'Two', content: <p>Second panel</p> },
	{ id: 'three', label: 'Three', content: <p>Third panel</p> },
]

test('renders a tab per slide with the first selected and its panel shown', () => {
	render(<Carousel label="Demo" slides={slides} />)

	const tablist = screen.getByRole('tablist', { name: 'Demo' })
	const tabs = within(tablist).getAllByRole('tab')
	expect(tabs.map((t) => t.textContent)).toEqual(['One', 'Two', 'Three'])
	expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
	expect(screen.getByText('First panel')).toBeVisible()
})

test('clicking a tab selects it and shows its panel', async () => {
	const user = userEvent.setup()
	render(<Carousel label="Demo" slides={slides} />)

	await user.click(screen.getByRole('tab', { name: 'Three' }))

	expect(screen.getByRole('tab', { name: 'Three' })).toHaveAttribute(
		'aria-selected',
		'true',
	)
	expect(screen.getByText('Third panel')).toBeVisible()
})

test('next/previous arrows advance and wrap around', async () => {
	const user = userEvent.setup()
	render(<Carousel label="Demo" slides={slides} />)

	// Previous from the first slide wraps to the last.
	await user.click(screen.getByRole('button', { name: /previous/i }))
	expect(screen.getByText('Third panel')).toBeVisible()

	// Next from the last slide wraps back to the first.
	await user.click(screen.getByRole('button', { name: /next/i }))
	expect(screen.getByText('First panel')).toBeVisible()
})

test('reduced motion: no autoplay control and slides do not auto-advance', () => {
	vi.useFakeTimers()
	try {
		render(<Carousel label="Demo" slides={slides} />)

		expect(
			screen.queryByRole('button', { name: /pause|play/i }),
		).not.toBeInTheDocument()

		vi.advanceTimersByTime(20_000)
		expect(screen.getByText('First panel')).toBeVisible()
	} finally {
		vi.useRealTimers()
	}
})

/** Stub `matchMedia` so motion is allowed (no reduce). */
function allowMotion() {
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}))
}

test('motion allowed: autoplays, advancing to the next slide after 7s', () => {
	allowMotion()
	vi.useFakeTimers()
	try {
		render(<Carousel label="Demo" slides={slides} />)

		// The play/pause control shows once motion is enhanced on mount.
		expect(screen.getByRole('button', { name: /pause/i })).toBeVisible()
		expect(screen.getByText('First panel')).toBeVisible()

		act(() => {
			vi.advanceTimersByTime(7_000)
		})
		expect(screen.getByText('Second panel')).toBeVisible()
	} finally {
		vi.useRealTimers()
	}
})

test('pausing stops autoplay and flips the control to Play', () => {
	allowMotion()
	vi.useFakeTimers()
	try {
		render(<Carousel label="Demo" slides={slides} />)

		act(() => {
			screen.getByRole('button', { name: /pause/i }).click()
		})
		expect(screen.getByRole('button', { name: /play/i })).toBeVisible()

		act(() => {
			vi.advanceTimersByTime(20_000)
		})
		expect(screen.getByText('First panel')).toBeVisible()
	} finally {
		vi.useRealTimers()
	}
})

test('hovering the carousel pauses autoplay', () => {
	allowMotion()
	vi.useFakeTimers()
	try {
		const { container } = render(<Carousel label="Demo" slides={slides} />)

		fireEvent.mouseEnter(container.firstChild as Element)
		act(() => {
			vi.advanceTimersByTime(20_000)
		})
		expect(screen.getByText('First panel')).toBeVisible()
	} finally {
		vi.useRealTimers()
	}
})
