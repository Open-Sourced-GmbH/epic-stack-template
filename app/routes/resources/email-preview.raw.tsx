import {
	assertEmailPreviewDev,
	renderEmailTemplate,
} from '#app/utils/email-preview.server.tsx'
import { type Route } from './+types/email-preview.raw.ts'

/**
 * Resource route (no default export) - serves a single rendered email as raw
 * HTML so the preview UI can show it in an iframe. Dev-only.
 *
 * `?scheme=dark` injects a *simulated* forced-dark transform (invert +
 * hue-rotate, with images re-inverted so logos/photos stay normal). This
 * approximates how auto-inverting clients (Gmail, Outlook) render emails that
 * ship no dark-mode CSS - useful for spotting unreadable text / vanishing
 * logos. It is NOT the same as OS prefers-color-scheme, which can't be forced
 * into an iframe from the parent.
 */
const DARK_SIMULATION_STYLE = `<style>
	html { background-color: #111111 !important; filter: invert(1) hue-rotate(180deg); }
	img { filter: invert(1) hue-rotate(180deg); }
</style>`

export async function loader({ request }: Route.LoaderArgs) {
	assertEmailPreviewDev()

	const params = new URL(request.url).searchParams
	const name = params.get('name')
	let html = name ? await renderEmailTemplate(name) : null
	if (html == null) {
		throw new Response('Unknown email template', { status: 404 })
	}

	if (params.get('scheme') === 'dark') {
		html = html.includes('</head>')
			? html.replace('</head>', `${DARK_SIMULATION_STYLE}</head>`)
			: `${DARK_SIMULATION_STYLE}${html}`
	}

	return new Response(html, {
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': 'no-store',
		},
	})
}
