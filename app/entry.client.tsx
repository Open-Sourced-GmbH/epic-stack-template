import { startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { HydratedRouter } from 'react-router/dom'

if (ENV.MODE === 'production' && ENV.SENTRY_DSN) {
	void import('./utils/monitoring.client.tsx').then(({ init }) => init())
}

// The react-router-devtools client is injected into root.tsx, so every route
// rendered through root boots its own devtools instance. The rrdt "Styleguide"
// tab iframes the live `/styleguide` route (which renders through root), so the
// framed page spawns a *nested* devtools panel - and each click into its
// Styleguide tab descends another level, stacking a new panel every time.
// rrdt has no per-route opt-out, so we suppress devtools whenever the document
// is framed: the top window keeps full devtools, the embedded route gets none,
// which breaks the recursion. (Dev-only; devtools aren't bundled in prod.)
if (ENV.MODE !== 'production' && window.self !== window.top) {
	const style = document.createElement('style')
	style.textContent =
		'#tanstack_devtools,:has(> [data-testid="react-router-devtools-trigger"]){display:none !important}'
	document.head.append(style)
}

startTransition(() => {
	hydrateRoot(document, <HydratedRouter />)
})
