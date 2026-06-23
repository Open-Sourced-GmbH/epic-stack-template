// Owned preview — mirrors the `badge` specimen.
import { Badge } from 'epic-stack-template'

const variants = [
	'default',
	'secondary',
	'destructive',
	'outline',
	'brand',
] as const

export const Variants = () => (
	<div className="flex flex-col gap-3">
		<div className="flex flex-wrap items-center gap-2">
			{variants.map((variant) => (
				<Badge key={variant} variant={variant}>
					{variant}
				</Badge>
			))}
		</div>
		<div className="flex flex-wrap items-center gap-2">
			<Badge variant="brand" dot>
				Published
			</Badge>
			<Badge variant="secondary" dot>
				Draft
			</Badge>
		</div>
	</div>
)
