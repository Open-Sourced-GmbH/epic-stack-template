import * as AvatarPrimitive from '@radix-ui/react-avatar'
import * as React from 'react'

import { cn } from '#app/utils/misc.tsx'

/**
 * Avatar — a user image with a graceful initials fallback, on the Radix base
 * (`@radix-ui/react-avatar`). Compose: `Avatar` (root) wrapping an
 * `AvatarImage` (the photo) and an `AvatarFallback` (shown until the image
 * loads, or for good if it never does — so a missing/slow image degrades to
 * initials instead of a broken-image glyph). Replaces the hand-rolled
 * `rounded-full` + `object-cover` circles in the user rows / dropdown.
 *
 * Tokens only — the fallback uses the `bg-muted`/`text-muted-foreground` pair.
 * Size and shape it with utility classes on the root (`size-8`, `size-16`, …);
 * the base is a `size-10` circle.
 */
function Avatar({
	className,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
	return (
		<AvatarPrimitive.Root
			data-slot="avatar"
			className={cn(
				'relative flex size-10 shrink-0 overflow-hidden rounded-full',
				className,
			)}
			{...props}
		/>
	)
}

function AvatarImage({
	className,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
	return (
		<AvatarPrimitive.Image
			data-slot="avatar-image"
			className={cn('aspect-square size-full object-cover', className)}
			{...props}
		/>
	)
}

function AvatarFallback({
	className,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
	return (
		<AvatarPrimitive.Fallback
			data-slot="avatar-fallback"
			className={cn(
				'bg-muted text-muted-foreground flex size-full items-center justify-center rounded-full text-sm font-medium',
				className,
			)}
			{...props}
		/>
	)
}

export { Avatar, AvatarImage, AvatarFallback }
