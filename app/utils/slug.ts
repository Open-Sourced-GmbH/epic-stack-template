/**
 * Turn arbitrary text (a Post title, a Tag name) into a URL-safe slug:
 * lowercased, diacritics stripped, every run of non-alphanumerics collapsed to a
 * single hyphen, and no leading/trailing hyphens. The same rules apply to Post
 * and Tag, so both share this one function rather than re-spelling the regex.
 */
export function slugify(input: string): string {
	return input
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '') // strip combining diacritical marks
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-') // any run of non-alphanumerics → one hyphen
		.replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
}

/**
 * The slug to store for a post: the author's explicit slug when they typed one,
 * otherwise derived from the title. Both paths run through `slugify`, so a
 * hand-typed slug can't smuggle in spaces or capitals.
 */
export function resolveSlug({
	desired,
	title,
}: {
	desired?: string | null
	title: string
}): string {
	return desired?.trim() ? slugify(desired) : slugify(title)
}

/**
 * A slug collides when some record *other* than the one being edited already
 * owns it. `ownerId` is the id of the existing row found by the desired slug (or
 * `null`/`undefined` when the slug is free); `editingId` is the id of the post
 * being saved (absent on create). Re-saving a post with its own unchanged slug
 * is therefore never a collision. The DB lookup lives in the caller; this is the
 * pure decision so it can be unit-tested without a database.
 */
export function isSlugTaken({
	ownerId,
	editingId,
}: {
	ownerId?: string | null
	editingId?: string | null
}): boolean {
	return ownerId != null && ownerId !== editingId
}

/**
 * A published post's slug is frozen: once `publishedAt` is set the public URL is
 * a promise we keep, so the slug can no longer change.
 */
export function isSlugLocked(post: { publishedAt: Date | null }): boolean {
	return post.publishedAt != null
}

/**
 * Whether `desiredSlug` may be applied to `existing`. Creating (no existing
 * post) is always allowed; a draft may freely re-slug; a published post may only
 * keep its current slug (the lock-after-publish rule).
 */
export function canApplySlug(
	existing: { slug: string; publishedAt: Date | null } | null,
	desiredSlug: string,
): boolean {
	if (!existing || !isSlugLocked(existing)) return true
	return desiredSlug === existing.slug
}
