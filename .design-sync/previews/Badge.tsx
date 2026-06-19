// Owned preview — mirrors the `badge` specimen.
import { Badge } from 'epic-stack-template'

const variants = ['default', 'secondary', 'destructive', 'outline'] as const

export const Variants = () => (
	<div className="flex flex-wrap items-center gap-2">
		{variants.map((variant) => (
			<Badge key={variant} variant={variant}>
				{variant}
			</Badge>
		))}
	</div>
)
