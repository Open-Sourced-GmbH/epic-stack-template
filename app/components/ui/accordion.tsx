import * as AccordionPrimitive from '@radix-ui/react-accordion'
import * as React from 'react'

import { cn } from '#app/utils/misc.tsx'
import { Icon } from './icon.tsx'

/** `Omit` that distributes over a union, preserving each member's shape. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
	? Omit<T, K>
	: never

/**
 * `type` is required on Radix's discriminated Root union; make it optional here
 * so the wrapper can default to single-open.
 */
type AccordionProps = DistributiveOmit<
	React.ComponentProps<typeof AccordionPrimitive.Root>,
	'type'
> & { type?: 'single' | 'multiple' }

/**
 * Accordion — a Radix-compound Foundation component (ADR 019). Defaults to
 * single-open behavior (`type="single"`, collapsible); pass `type="multiple"`
 * to allow several panels open at once (its `defaultValue`/`value` are arrays
 * rather than a single string).
 *
 * Styled with design tokens only. The open state is brand-tinted: the trigger's
 * plus icon sits in a circular chip that rotates 45° (reading as ✕) and fills
 * brand with a `--primary-foreground` glyph, while the question tints
 * `text-brand` on hover. The content height animates via the
 * `accordion-down`/`-up` keyframes (see `tailwind.css`) — a keyframe `animation`,
 * not a CSS `transition`, because Radix's `Presence` only keeps a closing panel
 * mounted while a CSS animation is running, so a transition never plays on close.
 * Height (`.34s`) trails the icon rotate (`.3s`) on a shared
 * `cubic-bezier(.3,.7,.3,1)` ease so the icon leads and the panel follows as one
 * gesture; the chip's fill/border/color cross-fade at `.2s`. A `motion-reduce`
 * fallback drops the height/rotate motion.
 *
 * A per-item `disabled` (on `AccordionItem`) renders the trigger dimmed and
 * non-interactive — Radix forwards it to the trigger button and skips the item
 * in keyboard roving focus. Accordions may be nested (an `AccordionContent` can
 * hold its own `Accordion`) and grouped into page sections; give each nested
 * `Accordion` its own item `value`s so an inner single-open state never
 * collides with the outer one.
 */
function Accordion({ type = 'single', ...props }: AccordionProps) {
	// `collapsible` is a single-only Radix prop, so only attach it for single.
	const rootProps = (
		type === 'single' ? { type, collapsible: true, ...props } : { type, ...props }
	) as React.ComponentProps<typeof AccordionPrimitive.Root>
	return <AccordionPrimitive.Root data-slot="accordion" {...rootProps} />
}

function AccordionItem({
	className,
	...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
	return (
		<AccordionPrimitive.Item
			data-slot="accordion-item"
			className={cn('border-border border-b', className)}
			{...props}
		/>
	)
}

function AccordionTrigger({
	className,
	children,
	...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
	return (
		<AccordionPrimitive.Header className="flex">
			<AccordionPrimitive.Trigger
				data-slot="accordion-trigger"
				className={cn(
					'focus-cosy group flex flex-1 items-center justify-between gap-4 py-4 text-left text-body-md font-medium outline-hidden focus-visible:rounded-sm disabled:pointer-events-none disabled:opacity-50',
					className,
				)}
				{...props}
			>
				<span className="text-foreground group-hover:text-brand transition-colors duration-150">
					{children}
				</span>
				<span className="border-border bg-card text-muted-foreground group-data-[state=open]:bg-brand group-data-[state=open]:text-primary-foreground grid size-8 shrink-0 place-items-center rounded-full border group-data-[state=open]:rotate-45 group-data-[state=open]:border-transparent [transition:transform_.3s_cubic-bezier(.3,.7,.3,1),background-color_.2s,border-color_.2s,color_.2s] motion-reduce:transition-none">
					<Icon name="plus" size="sm" />
				</span>
			</AccordionPrimitive.Trigger>
		</AccordionPrimitive.Header>
	)
}

function AccordionContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
	return (
		<AccordionPrimitive.Content
			data-slot="accordion-content"
			className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up motion-reduce:animate-none"
			{...props}
		>
			<div className={cn('text-muted-foreground pb-4 text-body-sm', className)}>
				{children}
			</div>
		</AccordionPrimitive.Content>
	)
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
