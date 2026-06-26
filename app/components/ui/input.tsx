import * as React from 'react'

import { cn } from '#app/utils/misc.tsx'

const Input = ({
	className,
	type,
	...props
}: React.ComponentProps<'input'>) => {
	return (
		<input
			data-slot="input"
			type={type}
			className={cn(
				'focus-cosy border-input bg-background placeholder:text-muted-foreground aria-[invalid]:border-input-invalid flex h-8 w-full rounded-md border px-3 py-1.5 text-body-sm file:border-0 file:bg-transparent file:text-body-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50 md:text-body-xs md:file:text-body-xs',
				className,
			)}
			{...props}
		/>
	)
}

export { Input }
