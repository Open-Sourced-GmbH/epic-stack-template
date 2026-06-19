// Owned preview — mirrors the `alert` specimen: one callout per tone, each
// composing AlertTitle + AlertDescription. Tokens only, so the tones follow
// the brand accent and light/dark theme.
import { Alert, AlertDescription, AlertTitle } from 'epic-stack-template'

const tones = [
	{ tone: 'info', title: 'Heads up', body: 'A neutral, informational note.' },
	{ tone: 'success', title: 'Saved', body: 'Your changes were saved.' },
	{ tone: 'warning', title: 'Careful', body: 'This action needs attention.' },
	{ tone: 'error', title: 'Something went wrong', body: 'We could not save.' },
] as const

export const Tones = () => (
	<div className="flex w-full max-w-md flex-col gap-3">
		{tones.map(({ tone, title, body }) => (
			<Alert key={tone} tone={tone}>
				<AlertTitle>{title}</AlertTitle>
				<AlertDescription>{body}</AlertDescription>
			</Alert>
		))}
	</div>
)
