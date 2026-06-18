// Owned preview (no @ds-preview marker) — mirrors the `button` + `button-sizes`
// specimens in app/components/styleguide/specimens.tsx.
import { Button } from 'epic-stack-template'

const variants = [
	'default',
	'destructive',
	'outline',
	'secondary',
	'ghost',
	'link',
] as const
const sizes = ['sm', 'default', 'lg', 'pill'] as const

export const Variants = () => (
	<div className="flex flex-wrap gap-3">
		{variants.map((v) => (
			<Button key={v} variant={v}>
				{v}
			</Button>
		))}
	</div>
)

export const Sizes = () => (
	<div className="flex flex-wrap items-center gap-3">
		{sizes.map((s) => (
			<Button key={s} size={s}>
				{s}
			</Button>
		))}
	</div>
)
