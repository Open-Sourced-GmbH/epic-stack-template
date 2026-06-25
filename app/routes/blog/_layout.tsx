import { Outlet } from 'react-router'
import { AppShell } from '#app/components/app-shell.tsx'

/**
 * Shared layout for the public blog. Every `/blog` route — the index, an
 * article (`/blog/$slug`), and a tag archive (`/blog/tags/$tagSlug`) — nests
 * here and renders inside the universal {@link AppShell} navbar (`marketing`
 * variant, no sidebar — full-width content). The blog is a public marketing
 * surface, so it carries the landing section anchors + Blog link and the guest CTA. The
 * styled feed/article/tag surfaces own their own `<main>`; this just owns the
 * chrome.
 */
export default function BlogLayout() {
	return (
		<AppShell variant="marketing">
			<Outlet />
		</AppShell>
	)
}
