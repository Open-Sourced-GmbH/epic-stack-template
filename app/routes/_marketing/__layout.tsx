import { UserDropdown } from '#app/components/user-dropdown.tsx'
import { DEFAULT_ACCENT } from '#app/utils/accent.ts'
import { useOptionalRequestInfo } from '#app/utils/request-info.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import { MarketingFooter } from './__footer.tsx'
import { MarketingHeader } from './__header.tsx'
import { ThemeCustomizer } from './__theme-customizer.tsx'

/**
 * Shared marketing chrome: the sticky translucent header (with the cookie-backed
 * theme customizer in its slot), a `flex-1` main, and the branded footer, laid
 * out as a full-height column. Extracted from the landing so every public
 * marketing surface — the landing and each `/blog` route — renders inside the
 * same chrome from one source, without duplicating the request-info wiring.
 *
 * Consumers set `handle = { hideChrome: true }` so root.tsx suppresses the
 * generic app chrome (this layout ships its own branded header/footer).
 */
export function MarketingLayout({ children }: { children: React.ReactNode }) {
	const requestInfo = useOptionalRequestInfo()
	const user = useOptionalUser()
	return (
		<div className="bg-background text-foreground flex min-h-screen flex-col">
			<MarketingHeader
				themeSwitch={
					<ThemeCustomizer
						accent={requestInfo?.userPrefs.accent ?? DEFAULT_ACCENT}
						cursor={requestInfo?.userPrefs.cursor ?? 'default'}
						theme={requestInfo?.userPrefs.theme ?? null}
					/>
				}
				userMenu={user ? <UserDropdown /> : null}
			/>
			<main className="flex-1">{children}</main>
			<MarketingFooter />
		</div>
	)
}
