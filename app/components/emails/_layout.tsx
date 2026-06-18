import * as E from '@react-email/components'
import { type ReactNode } from 'react'
import {
	emailColors,
	emailFont,
	emailRadius,
	emailText,
} from './email-theme.generated.ts'

/**
 * Shared chrome + primitives for every transactional email, styled from
 * `email-theme.generated.ts` - the email-safe projection of the design tokens
 * (see that file's header for why emails can't use the CSS tokens directly).
 *
 * Everything here is inline-styled on `@react-email/components` primitives so it
 * survives Outlook/Gmail. Templates compose `EmailLayout` + the `Heading`,
 * `Paragraph`, `Button`, and `OtpCode` exports rather than hand-rolling tags, so
 * a token change flows to all emails from one place.
 */

const BRAND = 'Epic Notes'

export function EmailLayout({
	preview,
	children,
}: {
	preview?: string
	children: ReactNode
}) {
	return (
		<E.Html lang="en" dir="ltr">
			<E.Head />
			{preview ? <E.Preview>{preview}</E.Preview> : null}
			<E.Body
				style={{
					margin: 0,
					backgroundColor: emailColors.background,
					fontFamily: emailFont,
					color: emailColors.foreground,
				}}
			>
				<E.Container
					style={{
						maxWidth: '600px',
						margin: '0 auto',
						padding: '32px 24px',
					}}
				>
					<E.Section
						style={{
							backgroundColor: emailColors.card,
							border: `1px solid ${emailColors.border}`,
							borderRadius: emailRadius,
							padding: '32px',
						}}
					>
						<E.Text
							style={{
								margin: '0 0 24px',
								fontSize: emailText.bodySm.fontSize,
								fontWeight: 700,
								letterSpacing: '0.02em',
								color: emailColors.foreground,
							}}
						>
							{BRAND}
						</E.Text>
						{children}
					</E.Section>
					<E.Text
						style={{
							margin: '16px 8px 0',
							fontSize: emailText.body2xs.fontSize,
							lineHeight: emailText.body2xs.lineHeight,
							color: emailColors.mutedForeground,
						}}
					>
						{BRAND} · This is an automated message, please don't reply.
					</E.Text>
				</E.Container>
			</E.Body>
		</E.Html>
	)
}

export function Heading({ children }: { children: ReactNode }) {
	return (
		<E.Heading
			as="h1"
			style={{
				margin: '0 0 16px',
				fontSize: emailText.h5.fontSize,
				lineHeight: emailText.h5.lineHeight,
				fontWeight: 700,
				color: emailColors.foreground,
			}}
		>
			{children}
		</E.Heading>
	)
}

export function Paragraph({ children }: { children: ReactNode }) {
	return (
		<E.Text
			style={{
				margin: '0 0 16px',
				fontSize: emailText.bodySm.fontSize,
				lineHeight: emailText.bodySm.lineHeight,
				color: emailColors.foreground,
			}}
		>
			{children}
		</E.Text>
	)
}

export function Button({ href, children }: { href: string; children: ReactNode }) {
	return (
		<E.Button
			href={href}
			style={{
				display: 'inline-block',
				margin: '8px 0 16px',
				padding: '12px 20px',
				backgroundColor: emailColors.primary,
				color: emailColors.primaryForeground,
				borderRadius: emailRadius,
				fontSize: emailText.bodySm.fontSize,
				fontWeight: 700,
				textDecoration: 'none',
			}}
		>
			{children}
		</E.Button>
	)
}

export function OtpCode({ code }: { code: string }) {
	return (
		<E.Text
			style={{
				margin: '0 0 16px',
				padding: '16px',
				backgroundColor: emailColors.muted,
				borderRadius: emailRadius,
				fontFamily: 'monospace',
				fontSize: emailText.h5.fontSize,
				fontWeight: 700,
				letterSpacing: '0.2em',
				textAlign: 'center',
				color: emailColors.foreground,
			}}
		>
			{code}
		</E.Text>
	)
}
