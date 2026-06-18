/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { CodeBlock, type CodeLine } from './__code-block.tsx'

const LINES: CodeLine[] = [
	[
		{ text: 'const', kind: 'keyword' },
		{ text: ' greeting ' },
		{ text: '=', kind: 'punc' },
		{ text: ' ' },
		{ text: "'hello'", kind: 'string' },
	],
]

/** Installs a fake clipboard, leaving the rest of `navigator` intact. */
function stubClipboard() {
	const writeText = vi.fn().mockResolvedValue(undefined)
	Object.defineProperty(navigator, 'clipboard', {
		value: { writeText },
		configurable: true,
	})
	return writeText
}

test('renders every source token as readable text', () => {
	render(<CodeBlock lines={LINES} />)

	expect(screen.getByText('const')).toBeInTheDocument()
	expect(screen.getByText("'hello'")).toBeInTheDocument()
})

test('tags each token with its syntax kind for the scoped palette', () => {
	render(<CodeBlock lines={LINES} />)

	expect(screen.getByText('const')).toHaveAttribute('data-token', 'keyword')
	expect(screen.getByText("'hello'")).toHaveAttribute('data-token', 'string')
})

test('copies the joined source text and confirms with "Copied"', async () => {
	const writeText = stubClipboard()
	render(<CodeBlock lines={LINES} />)

	fireEvent.click(screen.getByRole('button', { name: /copy/i }))

	expect(
		await screen.findByRole('button', { name: /copied/i }),
	).toBeInTheDocument()
	expect(writeText).toHaveBeenCalledWith("const greeting = 'hello'")
})

test('reverts the copy button to idle after the confirmation window', async () => {
	stubClipboard()
	render(<CodeBlock lines={LINES} />)

	fireEvent.click(screen.getByRole('button', { name: /copy/i }))
	await screen.findByRole('button', { name: /copied/i })

	// The button returns to its idle "Copy" label once the window elapses.
	expect(
		await screen.findByRole('button', { name: /^copy$/i }, { timeout: 2500 }),
	).toBeInTheDocument()
})
