// Owned preview — mirrors the `separator` specimen (plain rule dividing
// settings sections / labeled "or continue with" variant / vertical rule).
import { Separator } from 'epic-stack-template'

export const PlainRule = () => (
	<div className="flex max-w-sm flex-col gap-3">
		<span className="text-muted-foreground">Account details</span>
		<Separator />
		<span className="text-muted-foreground">Danger zone</span>
	</div>
)

export const Labeled = () => (
	<div className="max-w-sm">
		<Separator label="or continue with" />
	</div>
)

export const Vertical = () => (
	<div className="flex h-5 items-center gap-3">
		<span className="text-muted-foreground">Edit</span>
		<Separator orientation="vertical" />
		<span className="text-muted-foreground">Delete</span>
	</div>
)
