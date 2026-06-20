import { Outlet } from 'react-router'
import { MarketingLayout } from '#app/routes/_marketing/__layout.tsx'

// The blog ships the branded marketing chrome (header/footer/theme customizer),
// so the generic app chrome in root.tsx is suppressed for every blog route.
export const handle = { hideChrome: true }

/**
 * Shared layout for the public blog. Every `/blog` route — the index, an
 * article (`/blog/$slug`), and a tag archive (`/blog/tags/$tagSlug`) — nests
 * here and inherits the marketing chrome via {@link MarketingLayout}. The styled
 * feed/article/tag surfaces land in later slices; this just owns the chrome.
 */
export default function BlogLayout() {
	return (
		<MarketingLayout>
			<Outlet />
		</MarketingLayout>
	)
}
