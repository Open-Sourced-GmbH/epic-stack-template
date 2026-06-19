// Owned preview — mirrors the `accordion` specimen. Single-open (collapsible),
// first item open so the brand-tinted open state and the rotated plus icon show
// in the static preview; the rest collapsed.
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
