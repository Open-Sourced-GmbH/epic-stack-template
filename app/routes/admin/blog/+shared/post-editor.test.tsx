/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRoutesStub } from 'react-router'
import { expect, test } from 'vitest'
import { PostEditor, type PostEditorPost } from './post-editor.tsx'

function renderEditor(post?: PostEditorPost) {
	const Stub = createRoutesStub([
		{
			path: '/admin/blog/new',
			Component: () => <PostEditor post={post} />,
			action: () => ({ result: undefined }),
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

test('an existing post treats its slug as already author-approved', async () => {
	const user = userEvent.setup()
	renderEditor({
		id: 'p1',
		title: 'Original',
		slug: 'original-slug',
		excerpt: null,
		body: 'body',
	})

	const title = screen.getByLabelText('Title')
	const slug = screen.getByLabelText('Slug')
	expect(slug).toHaveValue('original-slug')

	await user.type(title, ' Extended')
	expect(slug).toHaveValue('original-slug')
})
