import { prisma } from './db.server.ts'
import { dedupeBySlug, slugify } from './slug.ts'

/** A resolved tag row — enough to connect it to a post and re-render its chip. */
export type ResolvedTag = { id: string; name: string; slug: string }

/**
 * Map typed tag names → canonical {@link Tag} rows, **reusing** an existing tag
 * when one already owns the slug and **creating** a slugified new one otherwise —
 * never duplicating. The slug is the canonical identity: two names that slugify
 * to the same value (e.g. "React" / "react") resolve to one row, and the first
 * spelling seen wins as the display name for a row that has to be created.
 *
 * Blank/punctuation-only names (which slugify to the empty string) are dropped,
 * so a stray comma or trailing space in the editor never mints an empty tag.
 * The DB upsert is what makes "resolve-or-create" atomic: a concurrent save that
 * just created the same tag is reused rather than colliding on the unique slug.
 */
export async function resolveTags(names: string[]): Promise<ResolvedTag[]> {
	// Dedupe by slug first (the canonical identity) — collapsing "React"/"react"
	// and dropping empties — so each slug is upserted exactly once. The upsert is
	// what makes "resolve-or-create" atomic: a concurrent save that just created
	// the same tag is reused rather than colliding on the unique slug.
	return Promise.all(
		dedupeBySlug(names).map((name) => {
			const slug = slugify(name)
			return prisma.tag.upsert({
				where: { slug },
				create: { name, slug },
				update: {},
				select: { id: true, name: true, slug: true },
			})
		}),
	)
}

/**
 * Every existing tag name, alphabetically — the suggestion list the editor's
 * `TagInput` offers in its menu so authors reuse the canonical spelling instead
 * of minting a near-duplicate.
 */
export async function getAllTagNames(): Promise<string[]> {
	const tags = await prisma.tag.findMany({
		select: { name: true },
		orderBy: { name: 'asc' },
	})
	return tags.map((tag) => tag.name)
}
