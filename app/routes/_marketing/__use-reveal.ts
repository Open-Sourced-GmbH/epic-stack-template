import { type RefObject, useEffect } from 'react'
import { prefersReducedMotion } from '#app/utils/misc.tsx'

/**
 * Scroll-reveal for marketing sections. Tags every `[data-reveal]` descendant of
 * `ref` with `.rv` (the hidden, animatable state), then adds `.rv-in` as each
 * element scrolls into view.
 *
 * Motion is progressive enhancement: under `prefers-reduced-motion: reduce`, or
 * without JS / `IntersectionObserver`, nothing is tagged — so the resting state
 * rendered server-side (everything visible) stands. The `.rv` / `.rv-in` rules
 * live in `app/styles/tailwind.css`, also gated on `no-preference`.
 */
export function useReveal(ref: RefObject<HTMLElement | null>) {
	useEffect(() => {
		const root = ref.current
		if (!root) return
		if (typeof IntersectionObserver === 'undefined') return
		if (prefersReducedMotion()) return

		const targets = [...root.querySelectorAll<HTMLElement>('[data-reveal]')]
		for (const el of targets) el.classList.add('rv')

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue
					entry.target.classList.add('rv-in')
					observer.unobserve(entry.target)
				}
			},
			{ threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
		)
		for (const el of targets) observer.observe(el)
		return () => observer.disconnect()
	}, [ref])
}
