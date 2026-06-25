import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as React from 'react'

import { cn } from '#app/utils/misc.tsx'

/**
 * Sheet — a slide-over panel on the Radix `Dialog` base (no new dependency), so
 * focus trap, esc-to-close, `role="dialog"` labelled by its `SheetTitle`, and
 * an outside-click / `SheetClose` dismissal come for free. It anchors to an edge
 * (`side="left" | "right"`) as a full-height rail rather than a centered card —
 * the foundation the section `Sidebar`'s mobile drawer mounts in.
 *
 * Compose: `Sheet` (root, controlled via `open`/`onOpenChange` or uncontrolled
 * via `defaultOpen`) wrapping a `SheetTrigger`, an optional `SheetOverlay`, and a
 * `SheetContent` holding a `SheetTitle` (+ optional `SheetDescription`) and a
 * `SheetClose`.
 *
 * Styled with design tokens only — the panel surface is `bg-popover`/
 * `text-popover-foreground` with a `border-border` edge; the overlay is a
 * translucent scrim. Like the other overlay primitives (Dialog, Tooltip), the
 * content is rendered in place rather than through a `Portal`, so the live
 * `/styleguide` route can snapshot it (the snapshot reads each specimen's own
 * DOM subtree).
 */
function Sheet(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
	return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger(
	props: React.ComponentProps<typeof DialogPrimitive.Trigger>,
) {
	return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
	return <DialogPrimitive.Close data-slot="sheet-close" {...props} />
}

/**
 * Opt-in portal to `document.body` for the overlay + content. The Sheet renders
 * in place by default (so `/styleguide` can snapshot the open panel), but an
 * in-place fixed panel is clipped to the nearest ancestor that establishes a
 * containing block for fixed descendants — e.g. a sticky navbar with
 * `backdrop-blur`/`filter`/`transform`. Real app drawers mounted inside such
 * chrome must wrap their overlay + content in `SheetPortal` so the panel sizes
 * to the viewport, not that ancestor.
 */
function SheetPortal(
	props: React.ComponentProps<typeof DialogPrimitive.Portal>,
) {
	return <DialogPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			data-slot="sheet-overlay"
			className={cn(
				'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
				className,
			)}
			{...props}
		/>
	)
}

function SheetContent({
	className,
	side = 'left',
	...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
	/** Edge the panel anchors to and slides from. @default 'left' */
	side?: 'left' | 'right'
}) {
	return (
		<DialogPrimitive.Content
			data-slot="sheet-content"
			data-side={side}
			className={cn(
				'bg-popover text-popover-foreground border-border data-[state=open]:animate-in data-[state=closed]:animate-out fixed inset-y-0 z-50 flex h-full w-3/4 max-w-sm flex-col gap-4 p-6 shadow-lg data-[state=closed]:duration-200 data-[state=open]:duration-300',
				side === 'left'
					? 'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left left-0 border-r'
					: 'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right right-0 border-l',
				className,
			)}
			{...props}
		/>
	)
}

function SheetTitle({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			data-slot="sheet-title"
			className={cn('text-h6 font-semibold', className)}
			{...props}
		/>
	)
}

function SheetDescription({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			data-slot="sheet-description"
			className={cn('text-muted-foreground text-body-sm', className)}
			{...props}
		/>
	)
}

export {
	Sheet,
	SheetTrigger,
	SheetClose,
	SheetPortal,
	SheetOverlay,
	SheetContent,
	SheetTitle,
	SheetDescription,
}
