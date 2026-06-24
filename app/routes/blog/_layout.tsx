import { Outlet } from 'react-router'
import { AppShell } from '#app/components/app-shell.tsx'

/**
 * Shared layout for the public blog. Every `/blog` route — the index, an
 * article (`/blog/$slug`), and a tag archive (`/blog/tags/$tagSlug`) — nests
 * here and renders inside the universal {@link AppShell} navbar (`full`
 * variant, no sidebar — full-width content). The styled feed/article/tag
 * surfaces own their own `<main>`; this just owns the chrome.
 */
export default function BlogLayout() {
	return (
		<AppShell variant="full">
			<Outlet />
		</AppShell>
	)
}
