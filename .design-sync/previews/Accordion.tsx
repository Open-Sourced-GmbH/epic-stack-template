// Owned preview — mirrors the `accordion` + `accordion-multiple` specimens.
// `SingleOpen`: single-open (collapsible), first item open so the brand-tinted
// open state and the rotated plus icon show in the static preview; the rest
// collapsed. `Multiple`: type="multiple" with two panels open at once and a
// disabled item, so the dimmed disabled state shows statically.
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from 'epic-stack-template'

export const SingleOpen = () => (
	<Accordion defaultValue="item-1" className="w-full">
		<AccordionItem value="item-1">
			<AccordionTrigger>Is it accessible?</AccordionTrigger>
			<AccordionContent>
				Yes. It is built on Radix and follows the WAI-ARIA disclosure pattern,
				with full keyboard support.
			</AccordionContent>
		</AccordionItem>
		<AccordionItem value="item-2">
			<AccordionTrigger>Is it themeable?</AccordionTrigger>
			<AccordionContent>
				Yes. It is styled with design tokens only, so it follows the brand accent
				and light/dark theme automatically.
			</AccordionContent>
		</AccordionItem>
		<AccordionItem value="item-3">
			<AccordionTrigger>Does it animate?</AccordionTrigger>
			<AccordionContent>
				Yes — a grid-rows height transition, with a reduced-motion fallback.
			</AccordionContent>
		</AccordionItem>
	</Accordion>
)

export const Multiple = () => (
	<Accordion
		type="multiple"
		defaultValue={['shipping', 'returns']}
		className="w-full"
	>
		<AccordionItem value="shipping">
			<AccordionTrigger>How fast is shipping?</AccordionTrigger>
			<AccordionContent>
				Orders ship within two business days; tracking follows by email.
			</AccordionContent>
		</AccordionItem>
		<AccordionItem value="returns">
			<AccordionTrigger>What is the return window?</AccordionTrigger>
			<AccordionContent>
				Thirty days, no questions asked — both panels stay open at once because
				type="multiple" never auto-collapses siblings.
			</AccordionContent>
		</AccordionItem>
		<AccordionItem value="enterprise" disabled>
			<AccordionTrigger>Enterprise plans (coming soon)</AccordionTrigger>
			<AccordionContent>
				A disabled item renders dimmed and is skipped by keyboard focus.
			</AccordionContent>
		</AccordionItem>
	</Accordion>
)
