import { Button, EmailLayout, Heading, OtpCode, Paragraph } from './_layout.tsx'

export function EmailChangeEmail({
	verifyUrl,
	otp,
}: {
	verifyUrl: string
	otp: string
}) {
	return (
		<EmailLayout preview="Confirm your Epic Notes email change.">
			<Heading>Epic Notes Email Change</Heading>
			<Paragraph>Here's your verification code:</Paragraph>
			<OtpCode code={otp} />
			<Paragraph>Or click the link to confirm the change:</Paragraph>
			<Button href={verifyUrl}>Confirm email change</Button>
		</EmailLayout>
	)
}
