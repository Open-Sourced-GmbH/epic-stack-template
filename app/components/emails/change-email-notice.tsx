import { EmailLayout, Heading, Paragraph } from './_layout.tsx'

export function EmailChangeNoticeEmail({ userId }: { userId: string }) {
	return (
		<EmailLayout preview="Your Epic Notes email address has been changed.">
			<Heading>Your Epic Notes email has been changed</Heading>
			<Paragraph>
				We're writing to let you know that your Epic Notes email has been
				changed.
			</Paragraph>
			<Paragraph>
				If you changed your email address, then you can safely ignore this. But
				if you did not change your email address, then please contact support
				immediately.
			</Paragraph>
			<Paragraph>Your Account ID: {userId}</Paragraph>
		</EmailLayout>
	)
}
