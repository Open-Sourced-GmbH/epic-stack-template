/**
 * The seed's sample blog content (EPT-44). Three real posts that, between them,
 * exercise the whole ②a public pipeline on a fresh clone — fenced code (Shiki
 * highlighting), a cover image, rich GFM Markdown, and a tag shared across posts
 * so the tag archive lists more than one. Kept as pure data (no Prisma import)
 * so both the seed and its tests can read it without a database.
 *
 * Invariants the fixtures uphold (pinned by `app/utils/sample-posts.test.ts`):
 *  • exactly 3 posts — ≥1 Draft (`publishedAt: null`) and ≥2 Published,
 *  • Published posts carry *distinct* `publishedAt` dates so feed ordering shows,
 *  • ≥1 cover image, ≥1 fenced code block, and ≥2 posts under one shared tag,
 *  • every body renders through `renderPostBody` without the sanitiser dropping
 *    author content.
 */

export type SampleTag = { name: string; slug: string }

export type SamplePost = {
	title: string
	slug: string
	/** Raw Markdown — the single source of truth the public pipeline renders. */
	body: string
	excerpt?: string
	/** `null` = Draft (never on the public feed); a date = the publication instant. */
	publishedAt: Date | null
	tags: SampleTag[]
	/**
	 * Optional cover image, by storage `objectKey`. The keys point at bundled
	 * dev fixtures (`tests/fixtures/images/…`) the storage mock serves, so a fresh
	 * clone shows a real cover with no upload step.
	 */
	cover?: { objectKey: string; altText: string }
}

const announcements: SampleTag = { name: 'Announcements', slug: 'announcements' }
const engineering: SampleTag = { name: 'Engineering', slug: 'engineering' }
const design: SampleTag = { name: 'Design', slug: 'design' }

export const samplePosts: SamplePost[] = [
	{
		title: 'Welcome to the Epic Stack blog',
		slug: 'welcome-to-the-epic-stack-blog',
		excerpt:
			'A tour of the blog you get out of the box — Markdown rendering, cover images, tags, and a public feed that never leaks a draft.',
		publishedAt: new Date('2026-06-01T09:00:00.000Z'),
		tags: [announcements, engineering],
		cover: {
			objectKey: 'kody-notes/mountain.png',
			altText: 'A mountain range at golden hour',
		},
		body: [
			'# Welcome to the Epic Stack blog',
			'',
			'This post is **seeded content** that ships with the template, so a fresh',
			'clone has a populated, rendering blog from the first `pnpm dev`. It also',
			'doubles as a smoke test for the whole publishing pipeline.',
			'',
			'## What this post exercises',
			'',
			'- A **cover image**, reusing the same storage machinery as profile photos',
			'- Rich Markdown: headings, lists, a blockquote, and a table',
			'- A fenced **code block** with [Shiki](https://shiki.style) highlighting',
			'- A tag it shares with another post, so the archive lists more than one',
			'',
			'> Raw Markdown stays the single source of truth — the rendered HTML is',
			'> never persisted, so editing a post can never drift from what ships.',
			'',
			'## Rendering, end to end',
			'',
			'Every body flows through one pipeline before it reaches a reader:',
			'',
			'```ts',
			'import { renderPostBody } from "#app/utils/markdown.server.ts"',
			'',
			'// Markdown in, sanitised + highlighted HTML out — pure and cache-friendly.',
			'const html = await renderPostBody(post.body)',
			'```',
			'',
			'The pipeline sanitises untrusted author HTML *before* it highlights, so',
			'highlighting is a trusted pass over already-clean markup.',
			'',
			'## The pieces at a glance',
			'',
			'| Surface            | What it proves                          |',
			'| ------------------ | --------------------------------------- |',
			'| `/blog`            | Hero lead + grid of published posts     |',
			'| `/blog/$slug`      | A single article with highlighted code  |',
			'| `/blog/tags/$slug` | A tag archive scoped to one tag         |',
			'',
			'Read the next post for more on the design system behind these surfaces.',
		].join('\n'),
	},
	{
		title: 'Designing with tokens, not hex codes',
		slug: 'designing-with-tokens-not-hex-codes',
		excerpt:
			'Why every colour, radius, and code-highlight scope in this template paints onto a design token — and re-themes from one place.',
		publishedAt: new Date('2026-05-15T09:00:00.000Z'),
		tags: [engineering, design],
		body: [
			'# Designing with tokens, not hex codes',
			'',
			'The styleguide is the living source of truth for this design system. Every',
			'component reads from `@theme` tokens rather than baked-in values, so the',
			'whole surface re-themes from one place.',
			'',
			'## Why it matters',
			'',
			'1. A single accent change ripples everywhere consistently.',
			'2. The always-dark code palette survives both light and dark mode.',
			'3. New components inherit the system instead of reinventing it.',
			'',
			'Even inline code like `oklch(0.6 0.135 172)` reads from a token. See the',
			'[Epic Stack docs](https://www.epicweb.dev/epic-stack) for the full story.',
			'',
			'> Good defaults beat configuration: the template ships a coherent theme so',
			'> you can ship features, not fight CSS.',
		].join('\n'),
	},
	{
		title: 'A work in progress',
		slug: 'a-work-in-progress',
		excerpt: 'A draft that should never surface on the public feed.',
		publishedAt: null,
		tags: [engineering],
		body: [
			'# A work in progress',
			'',
			'This post is still a **Draft** (`publishedAt` is unset), so it never appears',
			'on the public feed, in a tag archive, or at its own URL — only the admin',
			'list shows it. It exists to demonstrate the draft-safety invariant on a',
			'fresh seed.',
		].join('\n'),
	},
]
