/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from './accordion.tsx'

function Sample() {
	return (
		<Accordion defaultValue="a">
			<AccordionItem value="a">
				<AccordionTrigger>Question A</AccordionTrigger>
				<AccordionContent>Answer A</AccordionContent>
			</AccordionItem>
			<AccordionItem value="b">
				<AccordionTrigger>Question B</AccordionTrigger>
				<AccordionContent>Answer B</AccordionContent>
			</AccordionItem>
		</Accordion>
	)
}

test('expands the item whose trigger is clicked', async () => {
	const user = userEvent.setup()
	render(<Sample />)

	const triggerB = screen.getByRole('button', { name: 'Question B' })
	expect(triggerB).toHaveAttribute('aria-expanded', 'false')

	await user.click(triggerB)

	expect(triggerB).toHaveAttribute('aria-expanded', 'true')
})

test('opening one item collapses the other (single-open default)', async () => {
	const user = userEvent.setup()
	render(<Sample />)

	const triggerA = screen.getByRole('button', { name: 'Question A' })
	const triggerB = screen.getByRole('button', { name: 'Question B' })
	// A is open by default
	expect(triggerA).toHaveAttribute('aria-expanded', 'true')

	await user.click(triggerB)

	expect(triggerB).toHaveAttribute('aria-expanded', 'true')
	expect(triggerA).toHaveAttribute('aria-expanded', 'false')
})

test('trigger is wired to its content region via aria-controls', () => {
	render(<Sample />)

	const triggerA = screen.getByRole('button', { name: 'Question A' })
	const controlledId = triggerA.getAttribute('aria-controls')
	expect(controlledId).toBeTruthy()

	const region = document.getElementById(controlledId!)
	expect(region).toHaveTextContent('Answer A')
})

test('trigger toggles via keyboard', async () => {
	const user = userEvent.setup()
	render(<Sample />)

	const triggerB = screen.getByRole('button', { name: 'Question B' })
	triggerB.focus()
	expect(triggerB).toHaveFocus()

	await user.keyboard('{Enter}')
	expect(triggerB).toHaveAttribute('aria-expanded', 'true')

	await user.keyboard(' ')
	expect(triggerB).toHaveAttribute('aria-expanded', 'false')
})

test('type="multiple" keeps siblings open instead of collapsing them', async () => {
	const user = userEvent.setup()
	render(
		<Accordion type="multiple" defaultValue={['a']}>
			<AccordionItem value="a">
				<AccordionTrigger>Question A</AccordionTrigger>
				<AccordionContent>Answer A</AccordionContent>
			</AccordionItem>
			<AccordionItem value="b">
				<AccordionTrigger>Question B</AccordionTrigger>
				<AccordionContent>Answer B</AccordionContent>
			</AccordionItem>
		</Accordion>,
	)

	const triggerA = screen.getByRole('button', { name: 'Question A' })
	const triggerB = screen.getByRole('button', { name: 'Question B' })
	expect(triggerA).toHaveAttribute('aria-expanded', 'true')

	// Opening B leaves A open — multiple does not auto-collapse siblings.
	await user.click(triggerB)
	expect(triggerB).toHaveAttribute('aria-expanded', 'true')
	expect(triggerA).toHaveAttribute('aria-expanded', 'true')
})

test('a disabled item exposes a disabled, non-toggling trigger', async () => {
	const user = userEvent.setup()
	render(
		<Accordion defaultValue="a">
			<AccordionItem value="a">
				<AccordionTrigger>Question A</AccordionTrigger>
				<AccordionContent>Answer A</AccordionContent>
			</AccordionItem>
			<AccordionItem value="b" disabled>
				<AccordionTrigger>Question B</AccordionTrigger>
				<AccordionContent>Answer B</AccordionContent>
			</AccordionItem>
		</Accordion>,
	)

	const triggerB = screen.getByRole('button', { name: 'Question B' })
	expect(triggerB).toBeDisabled()

	// A click on the disabled trigger is a no-op — it stays collapsed.
	await user.click(triggerB)
	expect(triggerB).toHaveAttribute('aria-expanded', 'false')
})
