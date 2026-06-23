import { expect, test } from 'vitest'
import { renderPostBody } from './markdown.server.ts'

// The renderer is a pure, async, DB-free module (ADR 063): these tests import it
// directly and never touch Prisma.

test('renders GFM headings, lists, and tables to HTML', async () => {
	const html = await renderPostBody(
		['# Title', '', '- one', '- two', '', '| a | b |', '| - | - |', '| 1 | 2 |'].join(
			'\n',
		),
	)

	expect(html).toContain('<h1>Title</h1>')
	expect(html).toContain('<li>one</li>')
	// GFM tables are the headline reason remark-gfm is in the pipeline.
	expect(html).toContain('<table>')
	expect(html).toContain('<td>1</td>')
})

test('strips dangerous HTML embedded in the Markdown', async () => {
	const html = await renderPostBody(
		['<script>alert(1)</script>', '', '<img src="x" onerror="alert(1)">', '', 'safe'].join(
			'\n',
		),
	)

	expect(html).not.toContain('<script>')
	expect(html).not.toContain('onerror')
	// The benign prose around the dangerous nodes still renders.
	expect(html).toContain('safe')
})

test('highlights fenced code with Shiki spans carrying --code-* token colors', async () => {
	const html = await renderPostBody(['```ts', 'const x = 42 // note', '```'].join('\n'))

	// Shiki paints onto the always-dark code palette (ADR 063): every colour is a
	// design token, never a baked-in hex, so the surface re-themes from one place.
	expect(html).toContain('var(--code-bg)')
	expect(html).toContain('var(--code-kw)') // `const`
	expect(html).toContain('var(--code-number)') // `42`
	expect(html).toContain('var(--code-comment)') // `// note`
	// The keyword token actually wraps the keyword text, not just appears somewhere.
	expect(html).toMatch(/var\(--code-kw\)[^>]*>const</)
})

test('falls back to a plain code block for an unknown language', async () => {
	const html = await renderPostBody(['```nonsense-lang', 'plain text', '```'].join('\n'))

	// Unknown grammar must not throw — it degrades to the dark surface as plain text.
	expect(html).toContain('var(--code-bg)')
	expect(html).toContain('plain text')
})
