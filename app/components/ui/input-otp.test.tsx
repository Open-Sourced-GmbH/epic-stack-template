/**
 * @vitest-environment jsdom
 */
import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from './input-otp.tsx'

test('slots paint the invalid border token when the field is aria-invalid', () => {
	const { container } = render(
		<InputOTP maxLength={2} value="12" onChange={() => {}} aria-invalid>
			<InputOTPGroup>
				<InputOTPSlot index={0} />
				<InputOTPSlot index={1} />
			</InputOTPGroup>
		</InputOTP>,
	)

	// aria-invalid is forwarded to the hidden input by the input-otp package.
	expect(container.querySelector('input')).toHaveAttribute(
		'aria-invalid',
		'true',
	)

	const slots = container.querySelectorAll('[data-slot="input-otp-slot"]')
	expect(slots).toHaveLength(2)
	for (const slot of slots) {
		expect(slot).toHaveClass('group-has-[[aria-invalid]]/otp:border-input-invalid')
	}
})
