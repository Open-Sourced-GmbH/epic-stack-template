import { AppShell } from '#app/components/app-shell.tsx'
import { MarketingFooter } from './__footer.tsx'

/**
 * Shared marketing chrome. The landing now renders inside the universal
 * {@link AppShell} navbar (`marketing` variant — section anchors + Blog link, accent picker,
 * theme toggle, guest CTA / owner avatar), identical to the public blog. The
 * bespoke sticky header and its theme-customizer dock are retired (EPT-80); the
 * navbar owns the accent + theme controls, so there is no per-surface chrome to
 * reconcile any more.
 *
 * The branded footer survives as landing page content (legal/resource links the
 * navbar doesn't carry), rendered as a sibling of the `<main>` landmark inside
 * the shell's content column.
 *
 * Unlike `blog/_layout.tsx` (multi-route, so each route owns its `<main>`), the
 * marketing surface is the single landing page — so the `<main>` landmark lives
 * here, once, alongside the footer.
 */
export function MarketingLayout({ children }: { children: React.ReactNode }) {
	return (
		<AppShell variant="marketing">
			<main className="flex-1">{children}</main>
			<MarketingFooter />
		</AppShell>
	)
}
