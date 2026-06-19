import * as React from 'react'

import { cn } from '#app/utils/misc.tsx'

const Textarea = ({
	className,
	...props
}: React.ComponentProps<'textarea'>) => {
	return (
		<textarea
			className={cn(
				'focus-cosy border-input bg-background placeholder:text-muted-foreground aria-[invalid]:border-input-invalid flex min-h-[80px] w-full rounded-md border px-3 py-2 text-base disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
				className,
			)}
			{...props}
		/>
	)
}

export { Textarea }
