// Owned preview — mirrors the `checkbox` specimen (unchecked / checked / disabled).
import { Checkbox, Label } from 'epic-stack-template'

export const States = () => (
	<div className="flex flex-col gap-3">
		<div className="flex items-center gap-2">
			<Checkbox id="cb-unchecked" />
			<Label htmlFor="cb-unchecked">Unchecked</Label>
		</div>
		<div className="flex items-center gap-2">
			<Checkbox id="cb-checked" defaultChecked />
			<Label htmlFor="cb-checked">Checked</Label>
		</div>
		<div className="flex items-center gap-2">
			<Checkbox id="cb-disabled" disabled />
			<Label htmlFor="cb-disabled">Disabled</Label>
		</div>
	</div>
)
