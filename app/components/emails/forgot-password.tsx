import { Button, EmailLayout, Heading, OtpCode, Paragraph } from './_layout.tsx'

export function ForgotPasswordEmail({
	onboardingUrl,
	otp,
}: {
	onboardingUrl: string
	otp: string
}) {
	return (
		<EmailLayout preview="Reset your Epic Notes password.">
			<Heading>Epic Notes Password Reset</Heading>
			<Paragraph>Here's your verification code:</Paragraph>
			<OtpCode code={otp} />
			<Paragraph>Or click the link to reset your password:</Paragraph>
			<Button href={onboardingUrl}>Reset password</Button>
		</EmailLayout>
	)
}
