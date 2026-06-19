// Owned preview — mirrors the `skeleton` specimen.
import { Skeleton } from 'epic-stack-template'

export const Default = () => (
	<div className="flex items-center gap-4">
		<Skeleton className="size-12 rounded-full" />
		<div className="flex flex-col gap-2">
			<Skeleton className="h-4 w-48" />
			<Skeleton className="h-4 w-32" />
		</div>
	</div>
)
