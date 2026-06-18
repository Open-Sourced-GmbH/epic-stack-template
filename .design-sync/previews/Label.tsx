// Owned preview — mirrors the `label-field` specimen (Label + Input).
import { Input, Label } from 'epic-stack-template'

export const Field = () => (
	<div className="grid max-w-sm gap-1.5">
		<Label htmlFor="email">Email</Label>
		<Input id="email" type="email" placeholder="you@example.com" />
	</div>
)
