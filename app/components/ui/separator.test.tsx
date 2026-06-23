/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Separator } from './separator.tsx'

test('plain rule is a bg-border separator', () => {
	render(<Separator />)

	const rule = screen.getByRole('separator')
	expect(rule).toHaveClass('bg-border')
})

test('vertical orientation is conveyed to assistive tech', () => {
	render(<Separator orientation="vertical" />)

	const rule = screen.getByRole('separator')
	expect(rule).toHaveAttribute('aria-orientation', 'vertical')
	expect(rule).toHaveAttribute('data-orientation', 'vertical')
})

test('labeled variant shows an uppercase muted label flanked by two hairlines', () => {
	const { container } = render(<Separator label="or continue with" />)

	const label = screen.getByText('or continue with')
	expect(label).toHaveClass('uppercase')
	expect(label).toHaveClass('text-muted-foreground')

	// Two flanking rules, both decorative so the label is the only thing
	// announced (no role="separator" noise around the labelled divider).
	const wrapper = container.querySelector('[data-slot="separator-labeled"]')!
	expect(within(wrapper as HTMLElement).queryAllByRole('separator')).toHaveLength(
		0,
	)
	expect(wrapper.querySelectorAll('.bg-border')).toHaveLength(2)
})
