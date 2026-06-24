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
import { Form, Link, useFetcher, useNavigation } from 'react-router'
import { z } from 'zod'
import {
	ErrorList,
	Field,
	TextareaField,
	type ListOfErrors,
} from '#app/components/forms.tsx'
import { Alert, AlertDescription, AlertTitle } from '#app/components/ui/alert.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogOverlay,
	DialogTitle,
	DialogTrigger,
} from '#app/components/ui/dialog.tsx'
import { FormCard } from '#app/components/ui/form-card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { PageHeader } from '#app/components/ui/page-header.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { TagInput } from '#app/components/ui/tag-input.tsx'
import { cn, getPostImgSrc, useDebounce, useIsPending } from '#app/utils/misc.tsx'
import { slugify } from '#app/utils/slug.ts'

/** The intents the editor submits; the action branches on these. */
type Intent = 'save' | 'publish' | 'unpublish'

const titleMaxLength = 150
const slugMaxLength = 100
const excerptMaxLength = 300
const bodyMaxLength = 50_000
const tagMaxLength = 50

/**
 * The shape the editor writes. `slug` is optional on the wire — when blank the
 * server derives it from the title (the action owns slug resolution + collision
 * + lock-after-publish; see `post-editor.server.tsx`). The cover image (a `File`)
 * and the `intent` ride outside this schema: the action reads them straight from
 * the multipart form. Excerpt is optional here but the action *requires* it to
 * publish.
 */
export const PostEditorSchema = z.object({
	id: z.string().optional(),
	title: z.string().min(1, 'A title is required').max(titleMaxLength),
	slug: z.string().max(slugMaxLength).optional(),
	excerpt: z.string().max(excerptMaxLength).optional(),
	body: z.string().min(1, 'A body is required').max(bodyMaxLength),
	// Tag *names* as typed — the action resolves them to canonical Tag rows
	// (reuse-or-create) server-side. Optional: a post can have no tags.
	tags: z.array(z.string().max(tagMaxLength)).optional(),
})

export type PostEditorPost = {
	id: string
	title: string
	slug: string
	excerpt: string | null
	body: string
	/** Set once the post is live — drives the slug lock and the publish controls. */
	publishedAt: Date | string | null
	/** The current cover, shown as a thumbnail beside the upload control. */
	coverImage: { objectKey: string; altText: string | null } | null
	/** The post's current tag names — the editor's `TagInput` starts here. */
	tags: string[]
}

export function PostEditor({
	post,
	suggestions = [],
	actionData,
}: {
	post?: PostEditorPost
	/** Every existing tag name, offered as menu suggestions in the `TagInput`. */
	suggestions?: string[]
	actionData?: { result?: SubmissionResult } | null
}) {
	const isPending = useIsPending()
	const isPublished = Boolean(post?.publishedAt)

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

	// Which intent is mid-flight (drives the pending spinner) and which one last
	// ran (drives the success/error flash on the right button after the response).
	const navigation = useNavigation()
	const pendingIntent =
		navigation.state !== 'idle'
			? (navigation.formData?.get('intent') as Intent | null)
			: null
	const [lastIntent, setLastIntent] = useState<Intent | null>(null)
	const statusFor = (intent: Intent) => {
		if (pendingIntent === intent) return 'pending' as const
		if (lastIntent === intent) return form.status ?? ('idle' as const)
		return 'idle' as const
	}

	return (
		<main className="container max-w-(--shell-max) py-8">
			{/* Breadcrumb back to the managed list (the shell owns the nav rail). It's
			    page-level navigation, so it sits outside the form. */}
			<Link
				to="/admin/blog"
				className="text-muted-foreground hover:text-foreground focus-cosy mb-4 inline-flex items-center gap-1 rounded-sm text-body-sm font-medium"
			>
				<Icon name="arrow-left" className="size-4" />
				Posts
			</Link>

			<Form method="POST" encType="multipart/form-data" {...getFormProps(form)}>
				{/* The shell's PageHeader idiom, carrying the editor's action row. The
				    Save / Publish controls live here but submit this form by id, so an
				    "enter" in any field still saves. */}
				<PageHeader
					eyebrow="Admin"
					title={post ? 'Edit post' : 'New post'}
					headingLevel={1}
					className="mb-6"
					actions={
						<>
							<StatusButton
								form={form.id}
								type="submit"
								name="intent"
								value="save"
								variant={post ? 'outline' : 'default'}
								disabled={isPending}
								status={statusFor('save')}
								onClick={() => setLastIntent('save')}
							>
								{post ? 'Save changes' : 'Create draft'}
							</StatusButton>

							{post && !isPublished ? (
								<StatusButton
									form={form.id}
									type="submit"
									name="intent"
									value="publish"
									disabled={isPending}
									status={statusFor('publish')}
									onClick={() => setLastIntent('publish')}
								>
									<Icon name="arrow-right">Publish</Icon>
								</StatusButton>
							) : null}

							{post && isPublished ? (
								<UnpublishButton
									formId={form.id}
									disabled={isPending}
									status={statusFor('unpublish')}
									onConfirm={() => setLastIntent('unpublish')}
								/>
							) : null}
						</>
					}
				/>

				{form.status === 'error' ? (
					<Alert tone="error" className="mb-6">
						<AlertTitle>This post can’t be saved yet</AlertTitle>
						<AlertDescription>
							Fix the highlighted fields below and try again.
						</AlertDescription>
					</Alert>
				) : null}

				{/* Lets "enter" submit the form rather than a stray button. */}
				<button type="submit" name="intent" value="save" className="hidden" />
				{post ? <input type="hidden" name="id" value={post.id} /> : null}

				<FormCard title="Details">
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
					{isPublished ? (
						// A live URL is a promise we keep: the slug is frozen once
						// published. Shown disabled, but a hidden field still submits it so
						// a Save round-trips the unchanged slug (the action also enforces
						// the lock server-side).
						<div className="mb-4">
							<Label htmlFor="post-slug-locked">Slug</Label>
							<div className="relative">
								<Input
									id="post-slug-locked"
									value={post?.slug ?? ''}
									disabled
									readOnly
									className="pr-9"
								/>
								<Icon
									name="lock-closed"
									aria-hidden
									className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
								/>
							</div>
							<input
								type="hidden"
								name={fields.slug.name}
								value={post?.slug ?? ''}
							/>
							<p className="text-muted-foreground px-4 pt-1 text-body-xs">
								Locked — changing a live URL breaks inbound links.
							</p>
						</div>
					) : (
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
					)}
					<Field
						labelProps={{ children: 'Excerpt' }}
						inputProps={{
							...getInputProps(fields.excerpt, { type: 'text' }),
						}}
						errors={fields.excerpt.errors}
					/>
					<CoverField cover={post?.coverImage} />
					<div className="flex flex-col gap-1.5">
						<Label htmlFor={fields.tags.id}>Tags</Label>
						<TagInput
							id={fields.tags.id}
							name={fields.tags.name}
							aria-label="Tags"
							defaultValue={post?.tags ?? []}
							suggestions={suggestions}
						/>
						<ErrorList id={fields.tags.errorId} errors={fields.tags.errors} />
					</div>
				</FormCard>

				<FormCard title="Content" className="mt-6">
					<BodyEditor
						textareaProps={{ ...getTextareaProps(fields.body), rows: 16 }}
						errors={fields.body.errors}
						initialBody={post?.body ?? ''}
					/>
				</FormCard>

				<ErrorList id={form.errorId} errors={form.errors} />
			</Form>
		</main>
	)
}

/**
 * The cover-image control: a file input that uploads through the post-image
 * storage machinery (the action sets `coverImageId`), with a thumbnail of the
 * picked file — or the current cover — so the author sees what will ship to the
 * feed card and the OG image. Optional: a coverless post falls back to its
 * deterministic gradient art.
 */
function CoverField({
	cover,
}: {
	cover?: { objectKey: string; altText: string | null } | null
}) {
	const [preview, setPreview] = useState<string | null>(null)
	const src = preview ?? (cover ? getPostImgSrc(cover.objectKey) : null)
	return (
		<div className="mb-4 flex flex-col gap-1.5">
			<Label htmlFor="post-cover-file">Cover image</Label>
			<div className="flex items-center gap-4">
				{src ? (
					<img
						src={src}
						alt={cover?.altText ?? ''}
						className="h-16 w-24 rounded-md object-cover"
					/>
				) : (
					<div
						aria-hidden="true"
						className="bg-muted text-muted-foreground flex h-16 w-24 items-center justify-center rounded-md"
					>
						<Icon name="file-text" className="size-5" />
					</div>
				)}
				<Input
					id="post-cover-file"
					type="file"
					name="coverFile"
					accept="image/*"
					className="max-w-xs"
					onChange={(event) => {
						const file = event.currentTarget.files?.[0]
						if (!file) return
						const reader = new FileReader()
						reader.onload = (e) =>
							setPreview(e.target?.result?.toString() ?? null)
						reader.readAsDataURL(file)
					}}
				/>
			</div>
			<p className="text-muted-foreground text-body-xs">
				Shown on the feed card and as the social share image. Optional.
			</p>
		</div>
	)
}

/**
 * The Unpublish control: a destructive transition behind a confirm `Dialog`
 * (a transient client overlay, per ADR 023 — not a route). Confirming submits
 * the editor form with `intent=unpublish`, which clears `publishedAt` and
 * returns the post to Draft.
 */
function UnpublishButton({
	formId,
	disabled,
	status,
	onConfirm,
}: {
	formId: string
	disabled: boolean
	status: 'pending' | 'success' | 'error' | 'idle'
	onConfirm: () => void
}) {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button type="button" variant="destructive" disabled={disabled}>
					<Icon name="cross-1">Unpublish</Icon>
				</Button>
			</DialogTrigger>
			<DialogOverlay />
			<DialogContent aria-describedby="unpublish-desc">
				<DialogTitle>Unpublish this post?</DialogTitle>
				<DialogDescription id="unpublish-desc">
					It will be removed from the public blog and returned to Draft. You can
					publish it again at any time.
				</DialogDescription>
				<div className="mt-6 flex justify-end gap-3">
					<DialogClose asChild>
						<Button type="button" variant="secondary">
							Cancel
						</Button>
					</DialogClose>
					<StatusButton
						form={formId}
						type="submit"
						name="intent"
						value="unpublish"
						variant="destructive"
						status={status}
						onClick={onConfirm}
					>
						Unpublish
					</StatusButton>
				</div>
			</DialogContent>
		</Dialog>
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
