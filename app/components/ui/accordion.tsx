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
 * to allow several open at once.
 *
 * Styled with design tokens only. The open state is brand-tinted: the trigger's
 * plus icon rotates 45° into a brand fill and the question tints `text-brand`
 * on hover. The content uses a CSS grid-rows `0fr → 1fr` height animation, with
 * a `motion-reduce` fallback that drops the height/rotate transitions.
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
					'group focus-visible:ring-ring text-foreground hover:text-brand flex flex-1 items-center justify-between gap-4 py-4 text-left text-body-md font-medium transition-colors outline-hidden focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2',
					className,
				)}
				{...props}
			>
				{children}
				<Icon
					name="plus"
					size="md"
					className="text-muted-foreground group-data-[state=open]:text-brand shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-45 motion-reduce:transition-none"
				/>
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
			className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 data-[state=open]:grid-rows-[1fr] motion-reduce:transition-none"
			{...props}
		>
			<div className="overflow-hidden">
				<div className={cn('text-muted-foreground pb-4 text-body-sm', className)}>
					{children}
				</div>
			</div>
		</AccordionPrimitive.Content>
	)
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
