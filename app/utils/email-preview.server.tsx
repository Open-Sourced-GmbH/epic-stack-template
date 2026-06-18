import { render } from '@react-email/components'
import { type ReactElement } from 'react'
import { EmailChangeNoticeEmail } from '#app/components/emails/change-email-notice.tsx'
import { EmailChangeEmail } from '#app/components/emails/change-email-verification.tsx'
import { ForgotPasswordEmail } from '#app/components/emails/forgot-password.tsx'
import { SignupEmail } from '#app/components/emails/signup-verification.tsx'

/**
 * Dev-only email preview registry. Renders every transactional template with
 * representative sample props so the layout, links, and subject lines can be
 * eyeballed without triggering the real auth flows. Never reachable in
 * production - both consuming routes call `assertEmailPreviewDev()`.
 *
 * Add a template by importing its component and registering an entry below.
 */

export class EmailPreviewNotAvailable extends Response {
	constructor() {
		super('Not found', { status: 404 })
	}
}

/** Throw a 404 when not running in dev - keeps the preview off prod. */
export function assertEmailPreviewDev() {
	if (process.env.NODE_ENV === 'production') {
		throw new EmailPreviewNotAvailable()
	}
}

type TemplateEntry = {
	label: string
	group: string
	subject?: string
	element: ReactElement
}

const SAMPLE_URL = 'https://example.com/verify?token=sample-token-1234567890'
const SAMPLE_OTP = 'ABC123'

const TEMPLATES: Record<string, TemplateEntry> = {
	'signup-verification': {
		label: 'Signup verification (welcome)',
		group: 'Authentication',
		subject: 'Welcome to Epic Notes!',
		element: <SignupEmail onboardingUrl={SAMPLE_URL} otp={SAMPLE_OTP} />,
	},
	'forgot-password': {
		label: 'Forgot password',
		group: 'Authentication',
		subject: 'Epic Notes Password Reset',
		element: <ForgotPasswordEmail onboardingUrl={SAMPLE_URL} otp={SAMPLE_OTP} />,
	},
	'change-email-verification': {
		label: 'Change email verification',
		group: 'Account',
		subject: 'Epic Notes Email Change Verification',
		element: <EmailChangeEmail verifyUrl={SAMPLE_URL} otp={SAMPLE_OTP} />,
	},
	'change-email-notice': {
		label: 'Change email notice',
		group: 'Account',
		subject: 'Epic Stack email changed',
		element: <EmailChangeNoticeEmail userId="cuid_sample_account_id" />,
	},
}

export function listEmailTemplates() {
	return Object.entries(TEMPLATES).map(([name, t]) => ({
		name,
		label: t.label,
		group: t.group,
		subject: t.subject ?? null,
	}))
}

export async function renderEmailTemplate(name: string): Promise<string | null> {
	const entry = TEMPLATES[name]
	if (!entry) return null
	return render(entry.element)
}
