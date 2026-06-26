import { Command as CommandPrimitive } from 'cmdk'
import * as React from 'react'

import { cn } from '#app/utils/misc.tsx'
import {
	type Command as CommandType,
	filterCommands,
	groupCommands,
} from './command.matcher.ts'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogOverlay,
	DialogTitle,
} from './dialog.tsx'
import { Icon } from './icon.tsx'
import { Skeleton } from './skeleton.tsx'
import { Spinner } from './spinner.tsx'

/**
 * ⌘K command palette — a thin UI over the framework-free matcher
 * (`command.matcher.ts`, which owns all ranking/grouping/filtering). The
 * `cmdk` primitive supplies keyboard navigation (↑↓ wrap via `loop`, ↵ to
 * select); `filterCommands` does the matching (`shouldFilter={false}` keeps
 * cmdk's own fuzzy filter out of the way), so the visible list is always what
 * the deep module returns.
 *
 * Styled with design tokens only (`bg-popover`/`text-popover-foreground`,
 * selected row `bg-brand-soft`, icon tile `bg-brand`). The overlay form
 * (`CommandPalette` with `open`/`onOpenChange`) is a Radix dialog —
 * `role="dialog"`, focus trap, esc-to-close — and is a deliberate transient
 * client-overlay exception to ADR 023 (route-based dialogs): it is not
 * content-bearing or bookmarkable.
 *
 * **⌘K binding is the consumer's responsibility.** The palette owns `open` as a
 * controlled prop but does NOT register a global hotkey — wire ⌘K / Ctrl-K where
 * you mount it so it lives next to your other page shortcuts. Canonical wiring:
 *
 * ```tsx
 * const [open, setOpen] = React.useState(false)
 * React.useEffect(() => {
 *   function onKeyDown(e: KeyboardEvent) {
 *     // ⌘K on macOS, Ctrl+K elsewhere
 *     if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
 *       e.preventDefault()
 *       setOpen((prev) => !prev)
 *     }
 *   }
 *   document.addEventListener('keydown', onKeyDown)
 *   return () => document.removeEventListener('keydown', onKeyDown)
 * }, [])
 * return <CommandPalette commands={commands} open={open} onOpenChange={setOpen} />
 * ```
 *
 * For remote command sources, pass `loading` while the fetch is in flight so the
 * list shows Skeleton placeholders instead of the "No results found." state.
 */

// --- Styled cmdk primitives (shadcn-style wrappers, tokens only) -------------

function Command({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive>) {
	return (
		<CommandPrimitive
			data-slot="command"
			loop
			className={cn(
				'bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-lg',
				className,
			)}
			{...props}
		/>
	)
}

function CommandInput({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
	return (
		<div
			className="border-border flex items-center gap-2 border-b px-3"
			data-slot="command-input-wrapper"
		>
			<Icon
				name="magnifying-glass"
				size="sm"
				className="text-muted-foreground shrink-0"
			/>
			<CommandPrimitive.Input
				data-slot="command-input"
				className={cn(
					'placeholder:text-muted-foreground text-body-sm flex h-11 w-full bg-transparent py-3 outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
					className,
				)}
				{...props}
			/>
		</div>
	)
}

function CommandList({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
	return (
		<CommandPrimitive.List
			data-slot="command-list"
			className={cn('max-h-80 overflow-x-hidden overflow-y-auto p-1', className)}
			{...props}
		/>
	)
}

function CommandGroup({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
	return (
		<CommandPrimitive.Group
			data-slot="command-group"
			className={cn(
				'text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-body-2xs [&_[cmdk-group-heading]]:font-medium',
				className,
			)}
			{...props}
		/>
	)
}

function CommandItem({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
	return (
		<CommandPrimitive.Item
			data-slot="command-item"
			className={cn(
				'text-body-sm relative flex cursor-default items-center gap-3 rounded-md px-2 py-2 outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-brand-soft data-[selected=true]:text-foreground',
				className,
			)}
			{...props}
		/>
	)
}

function CommandSeparator({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
	return (
		<CommandPrimitive.Separator
			data-slot="command-separator"
			className={cn('bg-border -mx-1 my-1 h-px', className)}
			{...props}
		/>
	)
}

/**
 * Overlay shell for the palette: composes the shared `Dialog` primitive
 * (`dialog.tsx`) to render the cmdk `Command` root inside, so the focus-trap /
 * esc-to-close / `role="dialog"` plumbing lives in one place. The shared content
 * is re-positioned near the top (`top-[20%]`) and stripped of its default
 * padding so the palette fills the surface; the title/description are visually
 * hidden so the dialog is labelled for screen readers without a chrome header
 * (epic-ui-guidelines). The overlay form is a deliberate transient client-overlay
 * exception to ADR 023 — see `dialog.tsx`.
 */
function CommandDialog({
	open,
	onOpenChange,
	title = 'Command palette',
	description = 'Search for a command to run or a page to go to.',
	children,
}: {
	open: boolean
	onOpenChange?: (open: boolean) => void
	title?: string
	description?: string
	children: React.ReactNode
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogOverlay />
			<DialogContent
				data-slot="command-dialog"
				className="top-[20%] translate-y-0 overflow-hidden p-0"
			>
				<DialogTitle className="sr-only">{title}</DialogTitle>
				<DialogDescription className="sr-only">{description}</DialogDescription>
				{children}
			</DialogContent>
		</Dialog>
	)
}

// --- The palette: matcher + cmdk + empty state -------------------------------

/** Stable empty default so the `emptyActions` prop doesn't allocate per render. */
const NO_EMPTY_ACTIONS: CommandType[] = []

type CommandPaletteProps = {
	/** The command registry to search; matched + grouped by the deep module. */
	commands: CommandType[]
	/** When provided, the palette renders as a dialog overlay (controlled). */
	open?: boolean
	onOpenChange?: (open: boolean) => void
	/**
	 * Pending state for remote command sources: while `true`, the list shows
	 * Skeleton placeholder rows (and a Spinner) instead of results or the
	 * empty/no-results state — so an async fetch reads as "loading", not "empty".
	 */
	loading?: boolean
	/** Navigate for `href` commands. Defaults to a full-page assignment. */
	onNavigate?: (href: string) => void
	/**
	 * Suggested-action chips for the empty / no-match state. Injected by the
	 * consumer so the palette stays free of business logic — e.g. the landing
	 * passes actions whose `run` fires a `sonner` toast (ADR 027).
	 */
	emptyActions?: CommandType[]
	placeholder?: string
}

function defaultNavigate(href: string) {
	if (typeof window !== 'undefined') window.location.href = href
}

/**
 * The ⌘K palette. Renders inline (no `open` prop — used by the styleguide
 * specimen and tests) or as a dialog overlay (`open`/`onOpenChange`).
 */
function CommandPalette({
	commands,
	open,
	onOpenChange,
	onNavigate = defaultNavigate,
	emptyActions = NO_EMPTY_ACTIONS,
	placeholder = 'Type a command or search…',
	loading = false,
}: CommandPaletteProps) {
	const [query, setQuery] = React.useState('')
	const sections = groupCommands(filterCommands(query, commands))
	const hasResults = sections.length > 0

	function handleSelect(command: CommandType) {
		// `run` XOR `href` is enforced by the matcher's discriminated union.
		if (command.href !== undefined) onNavigate(command.href)
		else command.run()
		onOpenChange?.(false)
		setQuery('')
	}

	const body = (
		<Command shouldFilter={false}>
			<CommandInput
				value={query}
				onValueChange={setQuery}
				placeholder={placeholder}
			/>
			<CommandList>
				{loading ? (
					<CommandLoadingState />
				) : hasResults ? (
					sections.map((section) => (
						<CommandGroup key={section.group} heading={section.group}>
							{section.commands.map((command) => (
								<CommandItem
									key={command.id}
									value={command.id}
									onSelect={() => handleSelect(command)}
								>
									{command.icon ? (
										<span className="bg-brand text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-md">
											<Icon name={command.icon} size="sm" />
										</span>
									) : null}
									<span className="truncate">{command.title}</span>
								</CommandItem>
							))}
						</CommandGroup>
					))
				) : (
					<CommandEmptyState
						actions={emptyActions}
						onSelect={handleSelect}
					/>
				)}
			</CommandList>
		</Command>
	)

	if (open === undefined) {
		return (
			<div className="border-border w-full max-w-lg overflow-hidden rounded-lg border shadow-overlay">
				{body}
			</div>
		)
	}

	return (
		<CommandDialog open={open} onOpenChange={onOpenChange}>
			{body}
		</CommandDialog>
	)
}

/** How many Skeleton placeholder rows the loading state paints. */
const LOADING_ROWS = 4

/**
 * Loading / pending state for remote command sources: Skeleton rows mimicking
 * command items (icon tile + label) plus a Spinner, wrapped in a `role="status"`
 * region so assistive tech announces the busy state. Shown instead of the
 * empty/no-results state while `loading` — so an in-flight fetch never reads as
 * "No results found." (Skeleton/Spinner are tokens-only; rows are non-interactive.)
 */
function CommandLoadingState() {
	return (
		<div
			data-slot="command-loading"
			role="status"
			aria-busy="true"
			aria-label="Loading commands"
			className="flex flex-col gap-1 p-1"
		>
			{Array.from({ length: LOADING_ROWS }).map((_, i) => (
				<div
					key={i}
					className="flex items-center gap-3 rounded-md px-2 py-2"
					aria-hidden="true"
				>
					<Skeleton className="size-6 shrink-0 rounded-md" />
					<Skeleton className="h-4 w-2/3" />
				</div>
			))}
			<div className="text-muted-foreground flex items-center justify-center gap-2 py-2 text-body-xs">
				<Spinner className="size-4" title="Loading commands" />
				Loading…
			</div>
		</div>
	)
}

/**
 * Empty / no-match state: a message plus suggested-action chips. Chips are
 * brand-soft pills; selecting one runs its action (the parent handles close).
 */
function CommandEmptyState({
	actions,
	onSelect,
}: {
	actions: CommandType[]
	onSelect: (command: CommandType) => void
}) {
	return (
		<div
			data-slot="command-empty"
			role="status"
			className="flex flex-col items-center gap-4 px-4 py-8 text-center"
		>
			<p className="text-muted-foreground text-body-sm">No results found.</p>
			{actions.length > 0 ? (
				<div className="flex flex-wrap justify-center gap-2">
					{actions.map((action) => (
						<button
							key={action.id}
							type="button"
							onClick={() => onSelect(action)}
							className="focus-cosy bg-brand-soft text-brand text-body-xs inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium outline-hidden hover:brightness-95"
						>
							{action.icon ? <Icon name={action.icon} size="xs" /> : null}
							{action.title}
						</button>
					))}
				</div>
			) : null}
		</div>
	)
}

export {
	Command,
	CommandInput,
	CommandList,
	CommandGroup,
	CommandItem,
	CommandSeparator,
	CommandDialog,
	CommandPalette,
}
