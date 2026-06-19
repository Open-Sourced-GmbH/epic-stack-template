import {
	assertEmailPreviewDev,
	listEmailTemplates,
} from '#app/utils/email-preview.server.tsx'
import { type Route } from './+types/email-preview.ts'

/**
 * Dev-only email template gallery. A resource route that returns a *standalone*
 * HTML document (not rendered through root.tsx) - so it carries no app nav and
 * no react-router-devtools injection. That keeps it safe to embed in the rrdt
 * "Emails" tab without nesting devtools-in-devtools. The right pane iframes the
 * chrome-less `email-preview/raw` route. 404s in production.
 *
 * Viewport (desktop/mobile) and theme (light/dark) are driven by query params
 * rather than inline JS, so the page works under any CSP and needs no client
 * bundle. Dark mode themes the gallery chrome and shows the email on a dark
 * backdrop - it simulates a dark email-client surround, not OS-forced
 * prefers-color-scheme (which can't be forced into an iframe from the parent).
 */
export async function loader({ request }: Route.LoaderArgs) {
	assertEmailPreviewDev()

	const templates = listEmailTemplates()
	const params = new URL(request.url).searchParams
	const selected = params.get('name') ?? templates[0]?.name ?? ''
	const view = params.get('view') === 'mobile' ? 'mobile' : 'desktop'
	const theme = params.get('theme') === 'dark' ? 'dark' : 'light'
	const current = templates.find((t) => t.name === selected) ?? templates[0]

	const href = (overrides: {
		name?: string
		view?: string
		theme?: string
	}) => {
		const next = new URLSearchParams({ name: selected, view, theme })
		for (const [k, v] of Object.entries(overrides)) next.set(k, v)
		return `?${next.toString()}`
	}

	const groups = new Map<string, typeof templates>()
	for (const t of templates) {
		const list = groups.get(t.group) ?? []
		list.push(t)
		groups.set(t.group, list)
	}

	const sidebar = [...groups.entries()]
		.map(
			([group, items]) => `
			<div class="group">
				<div class="group-label">${esc(group)}</div>
				${items
					.map(
						(t) =>
							`<a class="item${t.name === selected ? ' active' : ''}" href="${esc(href({ name: t.name }))}">${esc(t.label)}</a>`,
					)
					.join('')}
			</div>`,
		)
		.join('')

	const rawUrl = `/resources/email-preview/raw?name=${encodeURIComponent(selected)}${theme === 'dark' ? '&scheme=dark' : ''}`
	const subjectLine = current?.subject
		? `<span class="subject">Subject: ${esc(current.subject)}</span>`
		: `<span class="muted">Subject set at send site</span>`

	const seg = (label: string, active: boolean, linkHref: string) =>
		`<a class="seg${active ? ' active' : ''}" href="${esc(linkHref)}">${label}</a>`

	const viewToggle = `<div class="segmented">${seg('Desktop', view === 'desktop', href({ view: 'desktop' }))}${seg('Mobile', view === 'mobile', href({ view: 'mobile' }))}</div>`
	const themeToggle = `<div class="segmented">${seg('☀ Light', theme === 'light', href({ theme: 'light' }))}${seg('🌙 Dark', theme === 'dark', href({ theme: 'dark' }))}</div>`

	const html = `<!doctype html>
<html lang="en" class="${theme}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Email preview</title>
<style>
	* { box-sizing: border-box; }
	html.light { --bg:#f8fafc; --panel:#f8fafc; --border:#e2e8f0; --text:#0f172a; --muted:#94a3b8; --sub:#64748b; --hover:#e2e8f0; --stage:#eef2f6; --accent:#0ea5e9; }
	html.dark  { --bg:#0b1220; --panel:#111827; --border:#1f2937; --text:#e5e7eb; --muted:#6b7280; --sub:#9ca3af; --hover:#1f2937; --stage:#0b1220; --accent:#38bdf8; }
	body { margin: 0; font-family: system-ui, sans-serif; color: var(--text); background: var(--bg); }
	.wrap { display: flex; height: 100vh; }
	aside { width: 320px; flex-shrink: 0; border-right: 1px solid var(--border); overflow-y: auto; padding: 16px; background: var(--panel); }
	h1 { font-size: 16px; margin: 0 0 2px; }
	.count { font-size: 12px; color: var(--sub); margin: 0 0 16px; }
	.group { margin-bottom: 16px; }
	.group-label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin: 0 0 6px; }
	.item { display: block; padding: 6px 8px; margin-bottom: 2px; border-radius: 6px; font-size: 13px; text-decoration: none; color: var(--text); }
	.item:hover { background: var(--hover); }
	.item.active { background: var(--accent); color: #fff; }
	main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
	header { padding: 10px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 12px; background: var(--panel); }
	header strong { font-size: 14px; }
	.subject { font-size: 12px; color: var(--sub); }
	.muted { font-size: 12px; color: var(--muted); }
	.toolbar { margin-left: auto; display: flex; gap: 10px; align-items: center; }
	.segmented { display: inline-flex; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
	.seg { padding: 4px 10px; font-size: 12px; text-decoration: none; color: var(--text); background: transparent; white-space: nowrap; }
	.seg + .seg { border-left: 1px solid var(--border); }
	.seg.active { background: var(--accent); color: #fff; }
	.openraw { font-size: 12px; color: var(--accent); text-decoration: none; }
	.stage { flex: 1; min-height: 0; background: var(--stage); display: flex; justify-content: center; align-items: flex-start; overflow: auto; padding: ${view === 'mobile' ? '24px' : '0'}; }
	.viewport { background: #fff; display: flex; ${view === 'mobile' ? 'width: 390px; height: 844px; flex-shrink: 0; border-radius: 28px; box-shadow: 0 8px 40px rgba(0,0,0,.45); overflow: hidden;' : 'width: 100%; height: 100%;'} }
	iframe { flex: 1; width: 100%; height: 100%; border: none; background: #fff; }
</style>
</head>
<body>
<div class="wrap">
	<aside>
		<h1>📧 Email preview</h1>
		<p class="count">Dev-only · ${templates.length} templates</p>
		${sidebar}
	</aside>
	<main>
		<header>
			<strong>${esc(current?.label ?? '-')}</strong>
			${subjectLine}
			<div class="toolbar">
				${viewToggle}
				${themeToggle}
				<a class="openraw" href="${rawUrl}" target="_blank" rel="noreferrer">Open raw ↗</a>
			</div>
		</header>
		<div class="stage">
			${
				selected
					? `<div class="viewport"><iframe title="${esc(current?.label ?? selected)}" src="${rawUrl}"></iframe></div>`
					: `<p style="padding:16px">No templates registered.</p>`
			}
		</div>
	</main>
</div>
</body>
</html>`

	return new Response(html, {
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': 'no-store',
		},
	})
}

function esc(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
}
