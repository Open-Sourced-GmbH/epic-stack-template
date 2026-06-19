// Owned preview — mirrors the `spinner` specimen.
import { Spinner } from 'epic-stack-template'

export const Default = () => (
	<div className="flex items-center gap-6">
		<Spinner />
		<div className="flex items-center gap-2">
			<Spinner className="size-4" title="Saving" />
			<span className="text-muted-foreground text-body-sm">Saving…</span>
		</div>
	</div>
)
