/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import BlogLayout from './_layout.tsx'
import BlogIndex, { meta } from './index.tsx'

beforeEach(() => {
	// The shared chrome mounts the theme customizer, which reads matchMedia.
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: query.includes('reduce'),
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}))
})

afterEach(() => {
	vi.unstubAllGlobals()
})

function renderBlog() {
	const Stub = createRoutesStub([
		{
			path: '/blog',
			Component: BlogLayout,
			children: [{ index: true, Component: BlogIndex }],
		},
	])
	render(<Stub initialEntries={['/blog']} />)
}

test('the blog index renders inside the shared marketing chrome', () => {
	renderBlog()

	// Inherited chrome: the marketing header and footer wrap the route.
	expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
	expect(screen.getByRole('contentinfo')).toBeInTheDocument()
})

test('the blog index renders a placeholder heading', () => {
	renderBlog()

	expect(screen.getByRole('heading', { name: /blog/i })).toBeInTheDocument()
})

test('meta sets a title for the blog index', () => {
	const tags = meta({} as any)
	const title = tags.find((t) => 'title' in t) as { title: string }
	expect(title?.title).toMatch(/blog/i)
})
