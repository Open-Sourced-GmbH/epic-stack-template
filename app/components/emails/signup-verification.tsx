import { Button, EmailLayout, Heading, OtpCode, Paragraph } from './_layout.tsx'

export function SignupEmail({
	onboardingUrl,
	otp,
}: {
	onboardingUrl: string
	otp: string
}) {
	return (
		<EmailLayout preview="Welcome to Epic Notes! Verify your email to get started.">
			<Heading>Welcome to Epic Notes!</Heading>
			<Paragraph>Here's your verification code:</Paragraph>
			<OtpCode code={otp} />
			<Paragraph>Or click the link to get started:</Paragraph>
			<Button href={onboardingUrl}>Verify email</Button>
		</EmailLayout>
	)
}
