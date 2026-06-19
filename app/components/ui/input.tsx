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
				'focus-cosy border-input bg-background placeholder:text-muted-foreground aria-[invalid]:border-input-invalid flex h-10 w-full rounded-md border px-3 py-2 text-base file:border-0 file:bg-transparent file:text-base file:font-medium disabled:cursor-not-allowed disabled:opacity-50 md:text-sm md:file:text-sm',
				className,
			)}
			{...props}
		/>
	)
}

export { Input }
