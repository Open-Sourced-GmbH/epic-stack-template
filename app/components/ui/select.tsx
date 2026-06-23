import * as SelectPrimitive from '@radix-ui/react-select'
import * as React from 'react'

import { cn } from '#app/utils/misc.tsx'
import { Icon } from './icon.tsx'

/**
 * Select — a labelled dropdown on the Radix base (`@radix-ui/react-select`):
 * a focus-managed listbox with full keyboard + ARIA (the trigger is a
 * `role="combobox"`, the panel a `role="listbox"`), typeahead, and an
 * outside-click / esc dismissal. Compose: `Select` (root, controlled via
 * `value`/`onValueChange` or uncontrolled via `defaultValue`) wrapping a
 * `SelectTrigger` (holding a `SelectValue`) and a `SelectContent` of
 * `SelectItem`s — optionally bucketed into `SelectGroup`s with a `SelectLabel`
 * and split by a `SelectSeparator`.
 *
 * The trigger matches `Input` exactly — same `border-input`/`bg-background`
 * surface, `h-10` height, and `focus-cosy` ring — and honours the same
 * invalid-state contract: `aria-invalid` repaints the border with
 * `--input-invalid`. The panel is a token-styled popover (`bg-popover`/
 * `text-popover-foreground`), and the selected item shows a brand check.
 *
 * Like the other overlay primitives (Dialog, Tooltip), the content is rendered
 * in place rather than through a `Portal`, so the live `/styleguide` route can
 * snapshot the open panel (the snapshot reads each specimen's own DOM subtree).
 */
function Select(props: React.ComponentProps<typeof SelectPrimitive.Root>) {
	return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup(
	props: React.ComponentProps<typeof SelectPrimitive.Group>,
) {
	return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue(
	props: React.ComponentProps<typeof SelectPrimitive.Value>,
) {
	return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
	className,
	children,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
	return (
		<SelectPrimitive.Trigger
			data-slot="select-trigger"
			className={cn(
				// Mirror the Input surface: same border/background tokens, height,
				// padding, focus ring, invalid border, and disabled treatment.
				'focus-cosy border-input bg-background placeholder:text-muted-foreground aria-[invalid]:border-input-invalid flex h-10 w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-base outline-hidden disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground md:text-sm [&>span]:truncate',
				className,
			)}
			{...props}
		>
			{children}
			<SelectPrimitive.Icon asChild>
				{/* Inline chevron — there is no chevron in the icon sprite, so (like
				    the dropdown-menu indicators) it is drawn inline. */}
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden
					className="text-muted-foreground size-4 shrink-0 opacity-80"
				>
					<path d="m6 9 6 6 6-6" />
				</svg>
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	)
}

function SelectContent({
	className,
	children,
	position = 'popper',
	...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
	return (
		<SelectPrimitive.Content
			data-slot="select-content"
			position={position}
			className={cn(
				'bg-popover text-popover-foreground border-border data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border shadow-md',
				position === 'popper' &&
					'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
				className,
			)}
			{...props}
		>
			<SelectPrimitive.Viewport
				className={cn(
					'p-1',
					position === 'popper' &&
						'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
				)}
			>
				{children}
			</SelectPrimitive.Viewport>
		</SelectPrimitive.Content>
	)
}

function SelectLabel({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
	return (
		<SelectPrimitive.Label
			data-slot="select-label"
			className={cn(
				'text-muted-foreground px-2 py-1.5 text-xs font-semibold',
				className,
			)}
			{...props}
		/>
	)
}

function SelectItem({
	className,
	children,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
	return (
		<SelectPrimitive.Item
			data-slot="select-item"
			className={cn(
				'focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50',
				className,
			)}
			{...props}
		>
			<span className="absolute left-2 flex size-4 items-center justify-center">
				<SelectPrimitive.ItemIndicator>
					<Icon name="check" className="text-brand size-4" />
				</SelectPrimitive.ItemIndicator>
			</span>
			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
		</SelectPrimitive.Item>
	)
}

function SelectSeparator({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
	return (
		<SelectPrimitive.Separator
			data-slot="select-separator"
			className={cn('bg-muted -mx-1 my-1 h-px', className)}
			{...props}
		/>
	)
}

export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
}
