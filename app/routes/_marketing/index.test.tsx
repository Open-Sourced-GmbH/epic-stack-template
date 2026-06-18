/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import { MarketingFooter } from './__footer.tsx'
import { MarketingHeader, navSections } from './__header.tsx'
import { meta } from './index.tsx'

function renderInRouter(ui: React.ReactNode) {
	const Stub = createRoutesStub([{ path: '/', Component: () => ui }])
	render(<Stub initialEntries={['/']} />)
}

function metaTags() {
	// The route meta function ignores its args here; cast to satisfy the type.
	return meta({} as any)
}

test('meta sets a title and description', () => {
	const tags = metaTags()
	const title = tags.find((t) => 'title' in t) as { title: string }
	const description = tags.find(
		(t) => 'name' in t && t.name === 'description',
	) as { name: string; content: string }

	expect(title?.title).toBeTruthy()
	expect(description?.content).toBeTruthy()
})

test('meta exposes Open Graph title/description/type', () => {
	const tags = metaTags()
	const og = Object.fromEntries(
		tags
			.filter((t): t is { property: string; content: string } => 'property' in t)
			.map((t) => [t.property, t.content]),
	)

	expect(og['og:title']).toBeTruthy()
	expect(og['og:description']).toBeTruthy()
	expect(og['og:type']).toBe('website')
})

test('header renders a primary nav linking to each in-page section', () => {
	renderInRouter(<MarketingHeader themeSwitch={<button>theme</button>} />)

	const nav = screen.getByRole('navigation', { name: 'Primary' })
	for (const section of navSections) {
		const link = screen.getByRole('link', { name: section.label })
		expect(link).toHaveAttribute('href', `#${section.id}`)
		expect(nav).toContainElement(link)
	}
})

test('header renders the theme switch slot and the primary CTA', () => {
	renderInRouter(
		<MarketingHeader themeSwitch={<button>toggle theme</button>} />,
	)

	expect(screen.getByRole('button', { name: 'toggle theme' })).toBeVisible()
	expect(
		screen.getByRole('link', { name: 'Start a project' }),
	).toHaveAttribute('href', '#contact')
})

test('footer is a contentinfo landmark with legal links to real routes', () => {
	renderInRouter(<MarketingFooter />)

	expect(screen.getByRole('contentinfo')).toBeInTheDocument()
	expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute(
		'href',
		'/privacy',
	)
	expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute(
		'href',
		'/tos',
	)
})
