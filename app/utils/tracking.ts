import { useEffect } from 'react'

declare global {
	interface Window {
		_paq?: Array<unknown[]>
	}
}

function pushPaq(args: Array<unknown>) {
	if (typeof window === 'undefined') return
	if (!window._paq) return
	window._paq.push(args)
}

/**
 * Push a custom event to Matomo's _paq queue.
 * Silently no-ops when Matomo is not loaded (e.g. dev environment).
 */
export function trackEvent(
	category: string,
	action: string,
	name?: string,
	value?: number,
) {
	const args: Array<string | number | undefined> = [
		'trackEvent',
		category,
		action,
	]
	if (name !== undefined) args.push(name)
	if (value !== undefined) args.push(value)
	pushPaq(args)
}

/**
 * Delegated click listener that tracks external link clicks.
 * Covers http(s) and mailto links, firing `external/click/<host>` events.
 */
export function useExternalLinkTracking() {
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			const anchor = (e.target as Element)?.closest?.(
				'a[href]',
			) as HTMLAnchorElement | null
			if (!anchor) return
			const href = anchor.getAttribute('href')
			if (!href) return

			let destination: string | null = null

			if (href.startsWith('http://') || href.startsWith('https://')) {
				try {
					destination = new URL(href).hostname.replace(/^www\./, '')
				} catch {
					destination = href
				}
			} else if (href.startsWith('mailto:')) {
				destination = href.replace('mailto:', '')
			}

			if (destination) {
				trackEvent('external', 'click', destination)
			}
		}
		document.addEventListener('click', handleClick)
		return () => document.removeEventListener('click', handleClick)
	}, [])
}
