/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import { Logo } from './logo.tsx'

function renderLogo(props: React.ComponentProps<typeof Logo> = {}) {
	const Stub = createRoutesStub([
		{ path: '/', Component: () => <Logo {...props} /> },
	])
	render(<Stub initialEntries={['/']} />)
}

test('renders the open/sourced wordmark inside a link home', () => {
	renderLogo()

	const link = screen.getByRole('link', { name: /open sourced home/i })
	expect(link).toHaveAttribute('href', '/')
	expect(screen.getByText('open')).toBeInTheDocument()
	expect(screen.getByText('sourced')).toBeInTheDocument()
})

test('renders a decorative brand-tile glyph mapped to brand tokens', () => {
	renderLogo()

	const glyph = screen.getByText('▲')
	expect(glyph).toHaveAttribute('aria-hidden', 'true')
	expect(glyph).toHaveClass('bg-brand', 'text-primary-foreground')
})

test('keeps the wordmark visible at every width by default', () => {
	renderLogo()

	expect(screen.getByText('open').parentElement).not.toHaveClass('hidden')
})

test('hides the wordmark below md when hideWordmarkOnMobile is set', () => {
	renderLogo({ hideWordmarkOnMobile: true })

	const wordmark = screen.getByText('open').parentElement
	expect(wordmark).toHaveClass('hidden', 'md:grid')
})
