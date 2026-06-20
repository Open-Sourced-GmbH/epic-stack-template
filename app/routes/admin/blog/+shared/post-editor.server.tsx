import { parseWithZod } from '@conform-to/zod'
import { data, redirect, type ActionFunctionArgs } from 'react-router'
import { z } from 'zod'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { canApplySlug, isSlugTaken, resolveSlug } from '#app/utils/slug.ts'
import { resolveTags } from '#app/utils/tag.server.ts'
import { PostEditorSchema } from './post-editor.tsx'

/**
 * The Post editor write-path, shared by `/admin/blog/new` and
 * `/admin/blog/$id/edit`. Creates and updates **Drafts** (publication is a
 * sibling slice). The action is the security boundary: it re-checks the `post`
 * permission server-side, owns slug resolution, and enforces both slug
 * invariants — global uniqueness (an explicit field error, never a silent
 * suffix) and lock-after-publish (a published post's slug is frozen).
 */
export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()

	// Admin-only (RBAC `post`): creating vs updating maps to the matching post
	// permission — both of which only the admin role holds.
	const isUpdate = Boolean(formData.get('id'))
	const userId = await requireUserWithPermission(
		request,
		isUpdate ? 'update:post:any' : 'create:post:any',
	)

	const submission = await parseWithZod(formData, {
		schema: PostEditorSchema.superRefine(async (post, ctx) => {
			const desiredSlug = resolveSlug({ desired: post.slug, title: post.title })

			// The post being edited (for the lock rule) and whoever already owns the
			// desired slug (for uniqueness) are independent lookups — fetch together.
			const [existing, owner] = await Promise.all([
				post.id
					? prisma.post.findUnique({
							where: { id: post.id },
							select: { id: true, slug: true, publishedAt: true },
						})
					: null,
				prisma.post.findUnique({
					where: { slug: desiredSlug },
					select: { id: true },
				}),
			])

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

	const post = id
		? await prisma.post.update({
				where: { id },
				select: { id: true },
				data: { title, slug, excerpt: excerpt || null, body, tags: { set: tagIds } },
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
				},
			})

	return redirect(`/admin/blog/${post.id}/edit`)
}
