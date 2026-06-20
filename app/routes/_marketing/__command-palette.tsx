import { useEffect, useRef, useState } from 'react'
import { useFetcher, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { type Command } from '#app/components/ui/command.matcher.ts'
import { CommandPalette } from '#app/components/ui/command.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { AppFrame } from './__app-frame.tsx'
import {
	landingCommands,
	type ThemeMode,
} from './__command-palette.commands.ts'
import { useReveal } from './__use-reveal.ts'

/** Toast copy for each theme command, so running one surfaces feedback (ADR 027). */
const themeToast: Record<ThemeMode, string> = {
	light: 'Theme: Light',
	dark: 'Theme: Dark',
	system: 'Theme: System',
}

/** No-match suggestion chips — each fires a toast to prove an action ran. */
const emptyActions: Command[] = [
	{
		id: 'suggest-start',
		title: 'Start a project',
		group: 'Suggestions',
		icon: 'envelope-closed',
		run: () => toast.success('Start a project'),
	},
	{
		id: 'suggest-support',
		title: 'Contact support',
		group: 'Suggestions',
		icon: 'question-mark-circled',
		run: () => toast.success('Contact support'),
	},
]

/**
 * The ⌘K palette showpiece on the landing. A global ⌘K / Ctrl-K listener toggles
 * the palette anywhere on the page (esc closes — Radix-managed focus trap), and a
 * demo `AppFrame` surfaces a hint pill that opens the same palette.
 *
 * The slice-① command set is built by the framework-free factory
 * (`__command-palette.commands.ts`): Navigation commands navigate (SPA, in-page
 * anchors), Theme commands re-tint the page through the existing cookie + SSR
 * theme plumbing (`/resources/theme-switch`, optimistic) and fire a `sonner`
 * toast. Tokens only; the palette overlay is a deliberate transient client
 * overlay (ADR 023 exception, documented in `command.tsx`).
 */
export function CommandShowpiece() {
	const ref = useRef<HTMLElement>(null)
	useReveal(ref)

	const [open, setOpen] = useState(false)
	const navigate = useNavigate()
	const themeFetcher = useFetcher()

	// Global ⌘K / Ctrl-K toggle — works anywhere on the landing.
	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
				event.preventDefault()
				setOpen((prev) => !prev)
			}
		}
		document.addEventListener('keydown', onKeyDown)
		return () => document.removeEventListener('keydown', onKeyDown)
	}, [])

	/**
	 * Persist a theme change through the existing switch resource. Routing it
	 * through `useFetcher` (action `/resources/theme-switch`) is what lets
	 * `useOptimisticThemeMode` re-tint the whole page live; a toast confirms it.
	 *
	 * No `redirectTo`: that's the no-JS escape hatch (the `<ServerOnly>`-gated
	 * `<Form>` inputs). Sending it from a fetcher makes the action return a
	 * single-fetch redirect to the index `.data` URL that 404s through the splat.
	 */
	function handleTheme(mode: ThemeMode) {
		void themeFetcher.submit(
			{ theme: mode },
			{ method: 'POST', action: '/resources/theme-switch' },
		)
		toast.success(themeToast[mode])
	}

	const commands = landingCommands({ onTheme: handleTheme })

	return (
		<section
			id="command"
			ref={ref}
			aria-labelledby="command-heading"
			className="container scroll-mt-20 py-24"
		>
			<div className="mx-auto max-w-2xl text-center">
				<p className="text-brand text-sm font-semibold tracking-wide uppercase">
					Command palette
				</p>
				<h2
					id="command-heading"
					className="mt-3 text-3xl font-semibold tracking-tight text-balance"
				>
					Everything is a keystroke away
				</h2>
				<p className="text-muted-foreground mt-4 text-pretty">
					Press{' '}
					<kbd className="bg-muted text-muted-foreground border-border rounded-md border px-1.5 py-0.5 text-xs font-medium">
						⌘K
					</kbd>{' '}
					anywhere — or use the bar below — to jump between sections and switch
					theme.
				</p>
			</div>

			<div data-reveal className="mx-auto mt-12 max-w-2xl">
				<AppFrame url="opensourced.studio">
					<button
						type="button"
						onClick={() => setOpen(true)}
						className="bg-background text-muted-foreground border-border hover:border-brand focus-visible:ring-ring flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2"
					>
						<Icon name="magnifying-glass" className="shrink-0" />
						<span className="text-body-sm flex-1">
							Type a command or search…
						</span>
						<kbd className="bg-muted text-muted-foreground border-border rounded-md border px-1.5 py-0.5 text-xs font-medium">
							⌘K
						</kbd>
					</button>
				</AppFrame>
			</div>

			<CommandPalette
				commands={commands}
				open={open}
				onOpenChange={setOpen}
				onNavigate={(href) => navigate(href)}
				emptyActions={emptyActions}
			/>
		</section>
	)
}
