// Owned preview — mirrors the `switch` specimen (off / on / disabled, plus the
// dark-mode-toggle composition: sun/moon glyphs flanking a labelled Switch).
import { Label, Switch } from 'epic-stack-template'

// Inline sun/moon glyphs — the curated bundle doesn't export Icon, so the
// theme-toggle composition draws its own (mirrors the app's sun/moon sprite).
const Sun = () => (
	<svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden>
		<circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
		<path
			d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
		/>
	</svg>
)

const Moon = () => (
	<svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden>
		<path
			d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinejoin="round"
		/>
	</svg>
)

export const States = () => (
	<div className="flex flex-col gap-3">
		<div className="flex items-center gap-2">
			<Switch id="sw-off" />
			<Label htmlFor="sw-off">Off</Label>
		</div>
		<div className="flex items-center gap-2">
			<Switch id="sw-on" defaultChecked />
			<Label htmlFor="sw-on">On</Label>
		</div>
		<div className="flex items-center gap-2">
			<Switch id="sw-disabled" disabled />
			<Label htmlFor="sw-disabled">Disabled</Label>
		</div>
	</div>
)

export const ThemeToggle = () => (
	<div className="flex items-center gap-3">
		<span className="text-muted-foreground">
			<Sun />
		</span>
		<Switch aria-label="Dark mode" defaultChecked />
		<span className="text-muted-foreground">
			<Moon />
		</span>
	</div>
)
