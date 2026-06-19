/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { ErrorList } from './forms.tsx'

test('renders each error with the --error-text token', () => {
	render(<ErrorList errors={['Required']} />)

	const item = screen.getByText('Required')
	// The going-forward error-message token (ADR / EPT-21), paired with the
	// --input-invalid border every control now paints.
	expect(item).toHaveClass('text-error-text')
})
