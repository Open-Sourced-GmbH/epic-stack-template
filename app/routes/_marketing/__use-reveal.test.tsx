/**
 * @vitest-environment jsdom
 */
import { render } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { useReveal } from './__use-reveal.ts'

/** Controllable IntersectionObserver fake: lets a test drive intersections. */
class FakeIntersectionObserver {
	static instances: FakeIntersectionObserver[] = []
	callback: IntersectionObserverCallback
	observed = new Set<Element>()
	constructor(cb: IntersectionObserverCallback) {
		this.callback = cb
		FakeIntersectionObserver.instances.push(this)
	}
	observe(el: Element) {
		this.observed.add(el)
	}
	unobserve(el: Element) {
		this.observed.delete(el)
	}
	disconnect() {
		this.observed.clear()
	}
	enter(el: Element) {
		this.callback(
			[{ target: el, isIntersecting: true } as IntersectionObserverEntry],
			this as unknown as IntersectionObserver,
		)
	}
}

function mockMatchMedia(reduceMotion: boolean) {
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: reduceMotion && query.includes('reduce'),
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}))
}

function Harness() {
	const ref = useRef<HTMLDivElement>(null)
	useReveal(ref)
	return (
		<div ref={ref}>
			<p data-reveal data-testid="one">
				one
			</p>
			<p data-reveal data-testid="two">
				two
			</p>
		</div>
	)
}

afterEach(() => {
	vi.unstubAllGlobals()
	FakeIntersectionObserver.instances.length = 0
})

test('tags [data-reveal] elements and reveals each as it enters the viewport', () => {
	mockMatchMedia(false)
	vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)

	const { getByTestId } = render(<Harness />)

	// Hidden (animatable) state applied up front to every reveal target.
	expect(getByTestId('one')).toHaveClass('rv')
	expect(getByTestId('two')).toHaveClass('rv')
	expect(getByTestId('one')).not.toHaveClass('rv-in')

	const io = FakeIntersectionObserver.instances[0]!
	io.enter(getByTestId('one'))

	// Only the entered element reveals; it is no longer observed.
	expect(getByTestId('one')).toHaveClass('rv-in')
	expect(getByTestId('two')).not.toHaveClass('rv-in')
	expect(io.observed.has(getByTestId('one'))).toBe(false)
})

test('reduced-motion users keep the resting state (no reveal classes, no observer)', () => {
	mockMatchMedia(true)
	vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)

	const { getByTestId } = render(<Harness />)

	expect(getByTestId('one')).not.toHaveClass('rv')
	expect(getByTestId('two')).not.toHaveClass('rv')
	expect(FakeIntersectionObserver.instances).toHaveLength(0)
})
