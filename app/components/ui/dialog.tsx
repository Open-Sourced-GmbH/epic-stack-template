import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as React from 'react'

import { cn } from '#app/utils/misc.tsx'

/**
 * Dialog — a shared modal overlay on the Radix base (`@radix-ui/react-dialog`):
 * focus trap, esc-to-close, `role="dialog"` labelled by its `DialogTitle`, and
 * an outside-click / `DialogClose` dismissal. Compose: `Dialog` (root, controlled
 * via `open`/`onOpenChange` or uncontrolled via `defaultOpen`) wrapping a
 * `DialogTrigger`, an optional `DialogOverlay`, and a `DialogContent` holding a
 * `DialogTitle` (+ optional `DialogDescription`) and a `DialogClose`.
 *
 * Styled with design tokens only — the content surface is `bg-popover`/
 * `text-popover-foreground` with a `border-border` border; the overlay is a
 * translucent scrim. Like the other overlay primitives (Tooltip), the content
 * is rendered in place rather than through a `Portal`, so the live `/styleguide`
 * route can snapshot it (the snapshot reads each specimen's own DOM subtree).
 *
 * ADR 023 removed *route-based* dialogs in favour of pages — this primitive is
 * the deliberate exception for transient **client overlays** (a ⌘K palette, a
 * confirm step): not content-bearing or bookmarkable, so it has no business
 * being a route. Reach for a page, not this, whenever the content should be
 * linkable or survive a refresh.
 */
function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger(
	props: React.ComponentProps<typeof DialogPrimitive.Trigger>,
) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogClose(
	props: React.ComponentProps<typeof DialogPrimitive.Close>,
) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			data-slot="dialog-overlay"
			className={cn(
				'fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
				className,
			)}
			{...props}
		/>
	)
}

function DialogContent({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
	return (
		<DialogPrimitive.Content
			data-slot="dialog-content"
			className={cn(
				'bg-popover text-popover-foreground border-border fixed top-[50%] left-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-lg border p-6 shadow-overlay data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
				className,
			)}
			{...props}
		/>
	)
}

function DialogTitle({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn('text-h6 font-semibold', className)}
			{...props}
		/>
	)
}

function DialogDescription({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn('text-muted-foreground text-body-sm', className)}
			{...props}
		/>
	)
}

export {
	Dialog,
	DialogTrigger,
	DialogClose,
	DialogOverlay,
	DialogContent,
	DialogTitle,
	DialogDescription,
}
