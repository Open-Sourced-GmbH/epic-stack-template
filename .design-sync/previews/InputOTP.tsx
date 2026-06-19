// Owned preview — mirrors the `input-otp` specimen and the real OTPField usage
// in app/components/forms.tsx (two 3-slot groups split by a separator).
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from 'epic-stack-template'

export const SixDigit = () => (
	<InputOTP maxLength={6} value="123456" onChange={() => {}}>
		<InputOTPGroup>
			<InputOTPSlot index={0} />
			<InputOTPSlot index={1} />
			<InputOTPSlot index={2} />
		</InputOTPGroup>
		<InputOTPSeparator />
		<InputOTPGroup>
			<InputOTPSlot index={3} />
			<InputOTPSlot index={4} />
			<InputOTPSlot index={5} />
		</InputOTPGroup>
	</InputOTP>
)
