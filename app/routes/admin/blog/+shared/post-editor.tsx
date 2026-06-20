import {
	getFormProps,
	getInputProps,
	getTextareaProps,
	useForm,
	useInputControl,
	type SubmissionResult,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useState } from 'react'
import { Form } from 'react-router'
import { z } from 'zod'
import { ErrorList, Field, TextareaField } from '#app/components/forms.tsx'
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { useIsPending } from '#app/utils/misc.tsx'
import { slugify } from '#app/utils/slug.ts'

const titleMaxLength = 150
const slugMaxLength = 100
const excerptMaxLength = 300
const bodyMaxLength = 50_000

/**
 * The shape the editor writes. `slug` is optional on the wire — when blank the
 * server derives it from the title (the action owns slug resolution + collision
 * + lock-after-publish; see `post-editor.server.tsx`). Tags, cover image, and
 * publication land in sibling slices, so they are intentionally absent here.
 */
export const PostEditorSchema = z.object({
	id: z.string().optional(),
	title: z.string().min(1, 'A title is required').max(titleMaxLength),
	slug: z.string().max(slugMaxLength).optional(),
	excerpt: z.string().max(excerptMaxLength).optional(),
	body: z.string().min(1, 'A body is required').max(bodyMaxLength),
})

export type PostEditorPost = {
	id: string
	title: string
	slug: string
	excerpt: string | null
	body: string
}

export function PostEditor({
	post,
	actionData,
}: {
	post?: PostEditorPost
	actionData?: { result?: SubmissionResult } | null
}) {
	const isPending = useIsPending()

	const [form, fields] = useForm({
		id: 'post-editor',
		constraint: getZodConstraint(PostEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: PostEditorSchema })
		},
		defaultValue: {
			title: post?.title ?? '',
			slug: post?.slug ?? '',
			excerpt: post?.excerpt ?? '',
			body: post?.body ?? '',
		},
		shouldRevalidate: 'onBlur',
	})

	const slug = useInputControl(fields.slug)
	// Auto-suggest the slug from the title until the author takes the wheel. An
	// existing post already has an author-approved slug, so treat it as touched.
	const [slugEdited, setSlugEdited] = useState(Boolean(post?.slug))

	return (
		<main className="container mx-auto max-w-3xl py-10">
			<Card>
				<CardHeader>
					<CardTitle>{post ? 'Edit post' : 'New post'}</CardTitle>
				</CardHeader>
				<CardContent>
					<Form method="POST" {...getFormProps(form)}>
						{/* Lets "enter" submit the form rather than a stray button. */}
						<button type="submit" className="hidden" />
						{post ? (
							<input type="hidden" name="id" value={post.id} />
						) : null}

						<Field
							labelProps={{ children: 'Title' }}
							inputProps={{
								autoFocus: true,
								...getInputProps(fields.title, { type: 'text' }),
								onChange: (event) => {
									if (!slugEdited) {
										slug.change(slugify(event.currentTarget.value))
									}
								},
							}}
							errors={fields.title.errors}
						/>
						<Field
							labelProps={{ children: 'Slug' }}
							inputProps={{
								name: fields.slug.name,
								id: fields.slug.id,
								value: slug.value ?? '',
								onChange: (event) => {
									setSlugEdited(true)
									slug.change(event.currentTarget.value)
								},
								onFocus: () => slug.focus(),
								onBlur: () => slug.blur(),
							}}
							errors={fields.slug.errors}
						/>
						<Field
							labelProps={{ children: 'Excerpt' }}
							inputProps={{
								...getInputProps(fields.excerpt, { type: 'text' }),
							}}
							errors={fields.excerpt.errors}
						/>
						<TextareaField
							labelProps={{ children: 'Body (Markdown)' }}
							textareaProps={{
								...getTextareaProps(fields.body),
								rows: 16,
							}}
							errors={fields.body.errors}
						/>
						<ErrorList id={form.errorId} errors={form.errors} />
					</Form>
				</CardContent>
				<CardFooter>
					<StatusButton
						form={form.id}
						type="submit"
						disabled={isPending}
						status={isPending ? 'pending' : 'idle'}
					>
						{post ? 'Save changes' : 'Create draft'}
					</StatusButton>
				</CardFooter>
			</Card>
		</main>
	)
}
