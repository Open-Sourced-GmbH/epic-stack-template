// Owned preview — mirrors the `input` specimen (default / disabled / invalid).
import { Input } from 'epic-stack-template'

export const States = () => (
	<div className="flex max-w-sm flex-col gap-3">
		<Input placeholder="Default input" />
		<Input placeholder="Disabled" disabled />
		<Input aria-invalid defaultValue="bad value" />
	</div>
)
