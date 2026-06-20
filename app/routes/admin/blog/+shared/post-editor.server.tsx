import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { parseFormData } from '@mjackson/form-data-parser'
import { data, redirect, type ActionFunctionArgs } from 'react-router'
import { z } from 'zod'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { canApplySlug, isSlugTaken, resolveSlug } from '#app/utils/slug.ts'
import { uploadPostImage } from '#app/utils/storage.server.ts'
import { resolveTags } from '#app/utils/tag.server.ts'
import { PostEditorSchema } from './post-editor.tsx'

/** A cover image is capped at 3MB, matching the profile-photo upload. */
const MAX_COVER_SIZE = 1024 * 1024 * 3

/**
 * The Post editor write-path, shared by `/admin/blog/new` and
 * `/admin/blog/$id/edit`. It saves Drafts and drives the publication lifecycle:
 * an `intent` of `save` (default) persists the fields, `publish` additionally
 * stamps `publishedAt` (requiring an excerpt), and `unpublish` clears it. The
 * action is the security boundary: it re-checks the `post` permission
 * server-side, owns slug resolution, and enforces both slug invariants — global
 * uniqueness (an explicit field error, never a silent suffix) and
 * lock-after-publish (a published post's slug is frozen).
 */
export async function action({ request }: ActionFunctionArgs) {
	// `parseFormData` reads the editor's multipart submit (so a cover `File` can
	// ride along) and transparently falls back to `request.formData()` for a
	// plain urlencoded post.
	const formData = await parseFormData(request, { maxFileSize: MAX_COVER_SIZE })

	const intent = String(formData.get('intent') ?? 'save')

	// Admin-only (RBAC `post`): creating vs updating maps to the matching post
	// permission — both of which only the admin role holds. Publish/unpublish are
	// updates to an existing post.
	const isUpdate = Boolean(formData.get('id'))
	const userId = await requireUserWithPermission(
		request,
		isUpdate ? 'update:post:any' : 'create:post:any',
	)

	// Unpublish is a pure Published→Draft transition: the confirm Dialog submits
	// only id + intent, so it skips field validation and just clears the
	// publication instant.
	if (intent === 'unpublish') {
		const id = String(formData.get('id') ?? '')
		const existing = id
			? await prisma.post.findUnique({ where: { id }, select: { id: true } })
			: null
		invariantResponse(existing, 'Not found', { status: 404 })
		await prisma.post.update({
			where: { id },
			data: { publishedAt: null },
			select: { id: true },
		})
		return redirect(`/admin/blog/${id}/edit`)
	}

	const wantsPublish = intent === 'publish'

	// The post being edited, fetched once: the slug-lock rule (in the schema) and
	// the publish path below (which keeps an already-live post's original
	// publication instant) both read it, so a single lookup serves both.
	const editingId = String(formData.get('id') ?? '')
	const existing = editingId
		? await prisma.post.findUnique({
				where: { id: editingId },
				select: { id: true, slug: true, publishedAt: true },
			})
		: null

	const submission = await parseWithZod(formData, {
		schema: PostEditorSchema.superRefine(async (post, ctx) => {
			// A public post needs a summary: the excerpt is required to publish (it
			// feeds the feed card and the meta description).
			if (wantsPublish && !post.excerpt?.trim()) {
				ctx.addIssue({
					path: ['excerpt'],
					code: z.ZodIssueCode.custom,
					message: 'An excerpt is required to publish.',
				})
			}

			const desiredSlug = resolveSlug({ desired: post.slug, title: post.title })

			// Who already owns the desired slug (for the uniqueness check) — the only
			// lookup that depends on the parsed values, so it stays in the refine.
			const owner = await prisma.post.findUnique({
				where: { slug: desiredSlug },
				select: { id: true },
			})

			if (post.id && !existing) {
				ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Post not found' })
				return
			}

			if (!canApplySlug(existing, desiredSlug)) {
				ctx.addIssue({
					path: ['slug'],
					code: z.ZodIssueCode.custom,
					message:
						'This post is published — its slug is locked and cannot change.',
				})
			}

			if (isSlugTaken({ ownerId: owner?.id, editingId: post.id })) {
				ctx.addIssue({
					path: ['slug'],
					code: z.ZodIssueCode.custom,
					message: 'That slug is already taken — choose another.',
				})
			}
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { id, title, excerpt, body } = submission.value
	const slug = resolveSlug({ desired: submission.value.slug, title })

	// Resolve the typed tag names to canonical rows (reuse-or-create) before the
	// write, so the post connects to ids. `set` replaces the post's whole tag set
	// on update, mirroring what the editor submitted.
	const tags = await resolveTags(submission.value.tags ?? [])
	const tagIds = tags.map((tag) => ({ id: tag.id }))

	// Publishing stamps the publication instant once: re-publishing a live post
	// keeps its original date (reusing the `existing` lookup), and a plain save
	// never touches it.
	const publishData = wantsPublish
		? { publishedAt: existing?.publishedAt ?? new Date() }
		: {}

	const post = id
		? await prisma.post.update({
				where: { id },
				select: { id: true },
				data: {
					title,
					slug,
					excerpt: excerpt || null,
					body,
					tags: { set: tagIds },
					...publishData,
				},
			})
		: await prisma.post.create({
				select: { id: true },
				data: {
					title,
					slug,
					excerpt: excerpt || null,
					body,
					authorId: userId,
					tags: { connect: tagIds },
					...publishData,
				},
			})

	// A new cover replaces any prior one: upload through the post-image storage
	// machinery, attach it as a `PostImage`, then point the post's cover at it.
	const coverFile = formData.get('coverFile')
	if (coverFile instanceof File && coverFile.size > 0) {
		const objectKey = await uploadPostImage(userId, post.id, coverFile)
		await prisma.$transaction(async ($prisma) => {
			await $prisma.postImage.deleteMany({ where: { coverOf: { id: post.id } } })
			const image = await $prisma.postImage.create({
				select: { id: true },
				data: { postId: post.id, objectKey, altText: title },
			})
			await $prisma.post.update({
				where: { id: post.id },
				data: { coverImageId: image.id },
				select: { id: true },
			})
		})
	}

	return redirect(`/admin/blog/${post.id}/edit`)
}
