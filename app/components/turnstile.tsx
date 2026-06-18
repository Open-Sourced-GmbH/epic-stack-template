import { useEffect, useRef } from 'react'
import { useNonce } from '#app/utils/nonce-provider.ts'

/**
 * Cloudflare Turnstile widget. Renders nothing unless TURNSTILE_SITE_KEY is
 * configured, so the feature is opt-in and dev/tests stay untouched. Place it
 * inside the <Form> you want to protect — the widget injects its
 * `cf-turnstile-response` token as a hidden input, which the server verifies
 * via checkTurnstile (turnstile.server.ts).
 */

const SCRIPT_SRC =
	'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

declare global {
	interface Window {
		turnstile?: {
			render: (el: HTMLElement, options: { sitekey: string }) => string
			remove: (widgetId: string) => void
		}
	}
}

function loadTurnstileScript(nonce: string): Promise<void> {
	const existing = document.querySelector<HTMLScriptElement>(
		`script[src="${SCRIPT_SRC}"]`,
	)
	if (existing) {
		if (existing.dataset.loaded === 'true') return Promise.resolve()
		return new Promise((resolve) =>
			existing.addEventListener('load', () => resolve()),
		)
	}
	return new Promise((resolve, reject) => {
		const script = document.createElement('script')
		script.src = SCRIPT_SRC
		script.async = true
		script.defer = true
		script.nonce = nonce
		script.addEventListener('load', () => {
			script.dataset.loaded = 'true'
			resolve()
		})
		script.addEventListener('error', () => reject(new Error('turnstile')))
		document.head.appendChild(script)
	})
}

export function TurnstileWidget() {
	const nonce = useNonce()
	const siteKey = ENV.TURNSTILE_SITE_KEY
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const container = containerRef.current
		if (!siteKey || !container) return
		let widgetId: string | undefined
		let cancelled = false
		void loadTurnstileScript(nonce).then(() => {
			if (cancelled || !window.turnstile) return
			widgetId = window.turnstile.render(container, { sitekey: siteKey })
		})
		return () => {
			cancelled = true
			if (widgetId) window.turnstile?.remove(widgetId)
		}
	}, [siteKey, nonce])

	if (!siteKey) return null
	return <div ref={containerRef} className="my-4" />
}
