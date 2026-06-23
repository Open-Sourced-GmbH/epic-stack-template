// Owned preview — mirrors the `form-card` specimen (the one card surface that
// frames both an auth form and a settings section: plain / with-header /
// destructive).
import { Button, FormCard, Input, Label } from 'epic-stack-template'

// Settings section — header (title + description) over a body.
export const WithHeader = () => (
	<div className="max-w-md">
		<FormCard
			title="Profile"
			description="Update your name and username."
		>
			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="preview-name">Name</Label>
					<Input id="preview-name" defaultValue="Ada Lovelace" />
				</div>
				<div className="flex justify-end">
					<Button>Save</Button>
				</div>
			</div>
		</FormCard>
	</div>
)

// Auth form — no header (a PageHeader sits above it in the shell).
export const Plain = () => (
	<div className="max-w-[360px]">
		<FormCard>
			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="preview-email">Email</Label>
					<Input id="preview-email" type="email" placeholder="you@example.com" />
				</div>
				<Button>Continue</Button>
			</div>
		</FormCard>
	</div>
)

// Destructive zone — "delete account & data" style section.
export const Destructive = () => (
	<div className="max-w-md">
		<FormCard
			variant="destructive"
			title="Delete account & data"
			description="This permanently removes your account and all of its data."
		>
			<Button variant="destructive">Delete account</Button>
		</FormCard>
	</div>
)
