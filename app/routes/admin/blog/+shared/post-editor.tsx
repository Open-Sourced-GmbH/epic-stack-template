import {
	getFormProps,
	getInputProps,
	getTextareaProps,
	useForm,
	useInputControl,
	type SubmissionResult,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useEffect, useState } from 'react'
import { Form, useFetcher } from 'react-router'
import { z } from 'zod'
import {
	ErrorList,
	Field,
	TextareaField,
	type ListOfErrors,
} from '#app/components/forms.tsx'
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { cn, useDebounce, useIsPending } from '#app/utils/misc.tsx'
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
		<main className="container mx-auto max-w-5xl py-10">
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
						<BodyEditor
							textareaProps={{ ...getTextareaProps(fields.body), rows: 16 }}
							errors={fields.body.errors}
							initialBody={post?.body ?? ''}
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

const PANES = [
	{ value: 'write', label: 'Write' },
	{ value: 'preview', label: 'Preview' },
] as const

/**
 * The body-editing experience: a Markdown `Textarea` beside a live preview that
 * renders through the **exact public pipeline** (`renderPostBody` via the
 * `/resources/preview-markdown` resource route), so an author's preview can
 * never diverge from what ships. Side-by-side `1fr 1fr` at ≥1024px; below that a
 * Write/Preview segmented control swaps the panes (both stay in the DOM). The
 * preview render is debounced and sanitised server-side — drafts never get a
 * public/gated `/blog` route, so this pane *is* the draft preview.
 */
function BodyEditor({
	textareaProps,
	errors,
	initialBody,
}: {
	textareaProps: React.TextareaHTMLAttributes<HTMLTextAreaElement>
	errors?: ListOfErrors
	initialBody: string
}) {
	const [pane, setPane] = useState<'write' | 'preview'>('write')
	const previewFetcher = useFetcher<{ html: string }>()

	const requestPreview = useDebounce((body: string) => {
		void previewFetcher.submit(
			{ body },
			{ method: 'POST', action: '/resources/preview-markdown' },
		)
	}, 300)

	// Seed the preview from an existing draft's body on first render, so opening
	// the editor shows the rendered post before the first keystroke.
	useEffect(() => {
		if (initialBody) requestPreview(initialBody)
	}, [initialBody, requestPreview])

	const previewHtml = previewFetcher.data?.html ?? ''

	// Both panes stay mounted (side-by-side ≥1024px); below that only the active
	// one shows so the segmented control can swap them.
	const paneClass = (value: typeof pane) =>
		cn(pane === value ? 'block' : 'hidden', 'lg:block')

	return (
		<div>
			{/* Mobile-only pane switch; ≥1024px both panes show side-by-side. */}
			<div
				role="tablist"
				aria-label="Editor view"
				className="bg-muted mb-3 inline-flex rounded-md p-1 lg:hidden"
			>
				{PANES.map(({ value, label }) => (
					<button
						key={value}
						type="button"
						role="tab"
						aria-selected={pane === value}
						onClick={() => setPane(value)}
						className={cn(
							'focus-visible:ring-ring text-body-sm rounded-sm px-3 py-1 font-medium outline-hidden focus-visible:ring-2',
							pane === value
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground',
						)}
					>
						{label}
					</button>
				))}
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<div className={paneClass('write')}>
					<TextareaField
						labelProps={{ children: 'Body (Markdown)' }}
						textareaProps={{
							...textareaProps,
							className: cn('min-h-(--editor-min-h)', textareaProps.className),
							onChange: (event) => {
								textareaProps.onChange?.(event)
								requestPreview(event.currentTarget.value)
							},
						}}
						errors={errors}
					/>
				</div>
				<div className={paneClass('preview')}>
					<p className="text-muted-foreground text-body-xs mb-2 font-medium">
						Preview
					</p>
					<div
						aria-label="Live preview"
						aria-live="polite"
						className="border-input bg-background min-h-(--editor-min-h) overflow-auto rounded-md border p-4"
					>
						{previewHtml ? (
							<div
								className="prose"
								dangerouslySetInnerHTML={{ __html: previewHtml }}
							/>
						) : (
							<p className="text-muted-foreground text-body-sm">
								Nothing to preview yet — start writing.
							</p>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
