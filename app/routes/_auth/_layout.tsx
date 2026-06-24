import { Outlet } from 'react-router'
import { AppShell } from '#app/components/app-shell.tsx'

// Auth is a transient pre-login pass-through (ADR-062/067), so it rides the
// universal AppShell navbar in its `minimal` variant — logo + theme toggle
// only, no product links, no identity, no accent picker. (This supersedes the
// bare-card-with-no-navbar shape of ADR-066 for auth.)

/**
 * The pine logo lockup: a `rounded-xl bg-brand` tile carrying the pine glyph in
 * `text-primary-foreground`. The glyph is an inline two-tier pine (the sprite
 * has no pine icon), drawn with `currentColor` so it inherits the tile's text
 * colour and stays correct in light and dark.
 */
function AuthBrand() {
	return (
		<div className="flex flex-col items-center gap-3">
			<div className="bg-brand text-primary-foreground flex size-12 items-center justify-center rounded-xl shadow-sm">
				<svg
					viewBox="0 0 24 24"
					className="size-7"
					aria-hidden
					focusable="false"
				>
					<polygon points="12,3 7,11 17,11" fill="currentColor" />
					<polygon points="12,8 6,16 18,16" fill="currentColor" />
					<rect x="11" y="15" width="2" height="5" rx="0.5" fill="currentColor" />
				</svg>
			</div>
			<span className="sr-only">Epic Notes</span>
		</div>
	)
}

/**
 * Shared auth-shell layout for every `_auth/` route (login, signup, onboarding,
 * the password/verify tail). The {@link AppShell} `minimal` navbar owns the
 * chrome (logo + theme toggle); the content area keeps the resolved design (B):
 * one faint top brand-glow radial (the slice's lone decorative flourish —
 * static, so there is no motion to reduce) and a centered single column
 * carrying the pine logo lockup over the routed surface (`<Outlet />`). No
 * marketing chrome, no accent customizer.
 */
export default function AuthLayout() {
	return (
		<AppShell variant="minimal">
			<div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-12">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-x-0 top-0 h-72"
					style={{
						background:
							'radial-gradient(60% 100% at 50% 0%, var(--brand-glow), transparent 70%)',
					}}
				/>
				<div className="relative z-10 flex w-full flex-col items-center gap-8">
					<AuthBrand />
					<Outlet />
				</div>
			</div>
		</AppShell>
	)
}
