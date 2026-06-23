import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { codeToHast, type ThemeRegistrationRaw } from 'shiki'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'

/**
 * The always-dark code palette (ADR 063). Every Shiki scope paints onto a
 * `--code-*` design token rather than a baked-in colour, so the code surface
 * stays dark in both light and dark mode — and re-themes from `@theme` alone.
 * Shiki happily emits `style="color:var(--code-kw)"`, so the tokens flow
 * straight through to the rendered HTML.
 */
const CODE_THEME: ThemeRegistrationRaw = {
	name: 'epic-code',
	type: 'dark',
	colors: {
		'editor.background': 'var(--code-bg)',
		'editor.foreground': 'var(--code-fg)',
	},
	settings: [
		// Default token colour + the `<pre>` surface background. Shiki resolves the
		// block background from this scopeless entry (not `colors` above), so the
		// `--code-bg` token must stay here or the surface falls back to a default.
		{ settings: { foreground: 'var(--code-fg)', background: 'var(--code-bg)' } },
		{
			scope: ['comment', 'punctuation.definition.comment'],
			settings: { foreground: 'var(--code-comment)', fontStyle: 'italic' },
		},
		{
			scope: ['keyword', 'keyword.operator', 'keyword.control', 'storage', 'storage.type'],
			settings: { foreground: 'var(--code-kw)' },
		},
		{
			scope: ['string', 'string.quoted', 'punctuation.definition.string'],
			settings: { foreground: 'var(--code-string)' },
		},
		{
			scope: ['constant.numeric', 'constant.language'],
			settings: { foreground: 'var(--code-number)' },
		},
		{
			scope: ['entity.name.function', 'support.function', 'meta.function-call'],
			settings: { foreground: 'var(--code-fn)' },
		},
	],
}

type HastRoot = Awaited<ReturnType<typeof codeToHast>>
type HastNode = { type: string; tagName?: string; value?: string; children?: HastNode[]; properties?: Record<string, unknown> }

/** Flatten a code element's text content (Shiki re-tokenises from raw source). */
function textOf(node: HastNode): string {
	let out = ''
	visit(node as never, 'text', (t: { value: string }) => {
		out += t.value
	})
	return out
}

/**
 * The fenced language from a `<code class="language-xxx">`, or `text`. Safe to
 * read post-sanitize: `rehype-sanitize`'s default schema keeps `language-*` on
 * `<code>`, so the class survives the cleaning pass before we highlight.
 */
function langOf(code: HastNode): string {
	const className = code.properties?.className
	const list = Array.isArray(className) ? className.map(String) : []
	const match = list.find((c) => c.startsWith('language-'))
	return match ? match.slice('language-'.length) : 'text'
}

/**
 * Highlight one code block to its `<pre>` element, degrading an unknown grammar
 * to plain `text` rather than throwing. Returns the `<pre>` itself (found by tag,
 * not position) so the caller can swap it in for the original.
 */
async function highlightToPre(source: string, lang: string): Promise<HastNode | undefined> {
	let root: HastRoot
	try {
		root = await codeToHast(source, { lang, theme: CODE_THEME })
	} catch {
		root = await codeToHast(source, { lang: 'text', theme: CODE_THEME })
	}
	return (root.children as HastNode[]).find((n) => n.tagName === 'pre')
}

/**
 * Replace every sanitised `<pre><code>` with its Shiki-highlighted equivalent.
 * Runs **after** `rehype-sanitize`, so the untrusted author HTML is already
 * clean and this trusted transform may add the token-coloured spans Shiki emits.
 */
function rehypeShikiTokens() {
	return async (tree: HastRoot) => {
		const jobs: Array<{
			parent: HastNode
			index: number
			source: string
			lang: string
		}> = []

		visit(tree as never, 'element', (node: HastNode, index, parent: HastNode | undefined) => {
			if (node.tagName !== 'pre' || !parent || index == null) return
			const code = node.children?.find(
				(c) => c.type === 'element' && c.tagName === 'code',
			)
			if (!code) return
			// Strip the single trailing newline rehype leaves on the code text so
			// Shiki doesn't render a dangling empty line.
			jobs.push({ parent, index, source: textOf(code).replace(/\n$/, ''), lang: langOf(code) })
		})

		// Each job replaces its `<pre>` 1-for-1, so the captured `index` stays
		// valid — the pass never inserts or removes siblings.
		await Promise.all(
			jobs.map(async ({ parent, index, source, lang }) => {
				const pre = await highlightToPre(source, lang)
				if (pre && parent.children) parent.children[index] = pre
			}),
		)
	}
}

/**
 * Render a Post's Markdown `body` to **safe** HTML (ADR 063).
 *
 * Pure and async: no React, no Prisma — raw Markdown in, sanitised HTML out, so
 * the loader can cache the result (`cachified` on `postId + updatedAt`) without
 * this module knowing about the cache. Raw Markdown stays the single source of
 * truth; rendered HTML is never persisted.
 *
 * Pipeline: `remark-parse` → `remark-gfm` → `remark-rehype` → `rehype-sanitize`
 * → Shiki highlighting → `rehype-stringify`. Author HTML is sanitised before the
 * highlighter runs, so highlighting is a trusted pass over already-clean markup.
 */
export async function renderPostBody(markdown: string): Promise<string> {
	const file = await unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkRehype)
		.use(rehypeSanitize)
		.use(rehypeShikiTokens)
		.use(rehypeStringify)
		.process(markdown)

	return String(file)
}
