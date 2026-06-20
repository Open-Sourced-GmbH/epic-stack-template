/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import { PostEditor, type PostEditorPost } from './post-editor.tsx'

function renderEditor(
	post?: PostEditorPost,
	previewHtml = '<p>rendered preview</p>',
) {
	const Stub = createRoutesStub([
		{
			path: '/admin/blog/new',
			Component: () => <PostEditor post={post} />,
			action: () => ({ result: undefined }),
		},
		{
			// The live preview posts the body here and renders the returned HTML —
			// stubbed so the component test never touches the real Markdown pipeline.
			path: '/resources/preview-markdown',
			action: () => ({ html: previewHtml }),
		},
	])
	render(<Stub initialEntries={['/admin/blog/new']} />)
}

test('the slug auto-derives from the title until the author edits it', async () => {
	const user = userEvent.setup()
	renderEditor()

	const title = screen.getByLabelText('Title')
	const slug = screen.getByLabelText('Slug')

	await user.type(title, 'Hello World')
	expect(slug).toHaveValue('hello-world')

	// The author takes the wheel…
	await user.clear(slug)
	await user.type(slug, 'custom-slug')
	expect(slug).toHaveValue('custom-slug')

	// …and further title edits no longer overwrite it.
	await user.type(title, '!')
	expect(slug).toHaveValue('custom-slug')
})

test('editing the body renders a live preview through the shared pipeline', async () => {
	const user = userEvent.setup()
	renderEditor(undefined, '<p>rendered preview</p>')

	const preview = screen.getByLabelText('Live preview')
	const body = screen.getByLabelText('Body (Markdown)')
	await user.type(body, '# hi')

	// The debounced fetch resolves to the stubbed HTML, dropped into the .prose pane.
	await waitFor(() =>
		expect(within(preview).getByText('rendered preview')).toBeInTheDocument(),
	)
})

test('the Write/Preview segmented control swaps panes on small screens', async () => {
	const user = userEvent.setup()
	renderEditor()

	const write = screen.getByRole('tab', { name: 'Write' })
	const preview = screen.getByRole('tab', { name: 'Preview' })

	// Both panes are always in the DOM (side-by-side at ≥1024px); the control just
	// toggles which one shows below that.
	expect(write).toHaveAttribute('aria-selected', 'true')
	expect(preview).toHaveAttribute('aria-selected', 'false')
	expect(screen.getByLabelText('Body (Markdown)')).toBeInTheDocument()
	expect(screen.getByLabelText('Live preview')).toBeInTheDocument()

	await user.click(preview)
	expect(write).toHaveAttribute('aria-selected', 'false')
	expect(preview).toHaveAttribute('aria-selected', 'true')
})

test('an existing post treats its slug as already author-approved', async () => {
	const user = userEvent.setup()
	renderEditor({
		id: 'p1',
		title: 'Original',
		slug: 'original-slug',
		excerpt: null,
		body: 'body',
		tags: [],
	})

	const title = screen.getByLabelText('Title')
	const slug = screen.getByLabelText('Slug')
	expect(slug).toHaveValue('original-slug')

	await user.type(title, ' Extended')
	expect(slug).toHaveValue('original-slug')
})

test('the editor seeds the Tags field with the post’s existing tags', async () => {
	renderEditor({
		id: 'p1',
		title: 'Original',
		slug: 'original-slug',
		excerpt: null,
		body: 'body',
		tags: ['React', 'Remix'],
	})

	// Each existing tag renders as a removable chip in the TagInput.
	expect(
		screen.getByRole('button', { name: /remove react/i }),
	).toBeInTheDocument()
	expect(
		screen.getByRole('button', { name: /remove remix/i }),
	).toBeInTheDocument()
})
