/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { AppFrame } from './__app-frame.tsx'

test('renders the address-bar url and the framed content', () => {
	render(
		<AppFrame url="atlas.app/dashboard">
			<p>Framed content</p>
		</AppFrame>,
	)

	expect(screen.getByText('atlas.app/dashboard')).toBeVisible()
	expect(screen.getByText('Framed content')).toBeVisible()
})
