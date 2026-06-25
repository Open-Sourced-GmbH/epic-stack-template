/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { TagInput } from './tag-input.tsx'

test('typing a name and pressing Enter creates a chip', async () => {
	const user = userEvent.setup()
	render(<TagInput aria-label="Tags" />)

	const input = screen.getByRole('combobox', { name: 'Tags' })
	await user.type(input, 'React Router{Enter}')

	// The committed tag shows as a chip and the input clears for the next one.
	expect(screen.getByText('React Router')).toBeInTheDocument()
	expect(input).toHaveValue('')
})

test('submits one hidden input per selected tag under the given name', async () => {
	const user = userEvent.setup()
	const { container } = render(<TagInput name="tags" aria-label="Tags" />)

	const input = screen.getByRole('combobox', { name: 'Tags' })
	await user.type(input, 'React{Enter}TypeScript{Enter}')

	const hidden = [...container.querySelectorAll('input[type="hidden"][name="tags"]')]
	expect(hidden.map((el) => (el as HTMLInputElement).value)).toEqual([
		'React',
		'TypeScript',
	])
})

test('opening the menu lists existing suggestions and a Create row', async () => {
	const user = userEvent.setup()
	render(<TagInput aria-label="Tags" suggestions={['React', 'Remix']} />)

	const input = screen.getByRole('combobox', { name: 'Tags' })
	await user.type(input, 'Re')

	expect(input).toHaveAttribute('aria-expanded', 'true')
	const listbox = screen.getByRole('listbox')
	const options = within(listbox).getAllByRole('option')
	// Both suggestions match "Re", plus a "Create «Re»" row.
	expect(options.map((o) => o.textContent)).toEqual([
		'React',
		'Remix',
		expect.stringContaining('Create'),
	])
})

test('clicking an existing suggestion selects it (no duplicate create)', async () => {
	const user = userEvent.setup()
	render(<TagInput aria-label="Tags" suggestions={['React']} />)

	const input = screen.getByRole('combobox', { name: 'Tags' })
	await user.type(input, 'React')
	// Exact match → no Create row, just the suggestion.
	const option = within(screen.getByRole('listbox')).getByRole('option', {
		name: 'React',
	})
	await user.click(option)

	expect(screen.getByText('React')).toBeInTheDocument()
	expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})

test('allowCreate=false suppresses the Create row (resolve-to-existing only)', async () => {
	const user = userEvent.setup()
	render(
		<TagInput
			aria-label="Roles"
			suggestions={['admin', 'user']}
			allowCreate={false}
		/>,
	)

	const input = screen.getByRole('combobox', { name: 'Roles' })
	// A name that matches an existing suggestion still opens the menu…
	await user.type(input, 'adm')
	expect(
		within(screen.getByRole('listbox')).getByRole('option', { name: 'admin' }),
	).toBeInTheDocument()

	// …but a brand-new name offers nothing — no Create row, so the menu closes.
	await user.clear(input)
	await user.type(input, 'brand-new-role')
	expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})

test('a slug already selected is never added twice', async () => {
	const user = userEvent.setup()
	const { container } = render(<TagInput name="tags" aria-label="Tags" />)

	const input = screen.getByRole('combobox', { name: 'Tags' })
	// "React" then "react" slugify to the same canonical tag.
	await user.type(input, 'React{Enter}react{Enter}')

	const hidden = container.querySelectorAll('input[type="hidden"][name="tags"]')
	expect(hidden).toHaveLength(1)
})

test('Backspace on an empty query removes the last chip', async () => {
	const user = userEvent.setup()
	render(<TagInput aria-label="Tags" defaultValue={['React', 'Remix']} />)

	const input = screen.getByRole('combobox', { name: 'Tags' })
	input.focus()
	await user.keyboard('{Backspace}')

	expect(screen.queryByText('Remix')).not.toBeInTheDocument()
	expect(screen.getByText('React')).toBeInTheDocument()
})

test('the remove button on a chip removes that tag', async () => {
	const user = userEvent.setup()
	render(<TagInput aria-label="Tags" defaultValue={['React', 'Remix']} />)

	await user.click(screen.getByRole('button', { name: /remove react/i }))

	expect(screen.queryByText('React')).not.toBeInTheDocument()
	expect(screen.getByText('Remix')).toBeInTheDocument()
})

test('arrow keys move the active option and Enter selects it', async () => {
	const user = userEvent.setup()
	render(<TagInput aria-label="Tags" suggestions={['React', 'Remix']} />)

	const input = screen.getByRole('combobox', { name: 'Tags' })
	await user.type(input, 'Re')
	// First option is active by default; ArrowDown moves to the second (Remix).
	await user.keyboard('{ArrowDown}{Enter}')

	// Remix became a chip (it has a remove button); React did not.
	expect(
		screen.getByRole('button', { name: /remove remix/i }),
	).toBeInTheDocument()
	expect(
		screen.queryByRole('button', { name: /remove react/i }),
	).not.toBeInTheDocument()
})
