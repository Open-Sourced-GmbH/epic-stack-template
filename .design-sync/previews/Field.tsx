// Owned preview — mirrors the `field` specimen: a valid required field with a
// description, and an invalid field whose error wires aria-invalid +
// aria-describedby onto the control.
import { Field, Input } from 'epic-stack-template'

export const States = () => (
	<div className="flex max-w-sm flex-col gap-5">
		<Field
			label="Email"
			htmlFor="field-email"
			description="We'll only use it to send receipts."
			required
		>
			<Input id="field-email" type="email" placeholder="you@example.com" />
		</Field>
		<Field
			label="Username"
			htmlFor="field-username"
			error="That username is already taken."
		>
			<Input id="field-username" defaultValue="taken" />
		</Field>
	</div>
)
