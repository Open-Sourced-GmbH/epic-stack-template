import * as React from 'react'

import { cn } from '#app/utils/misc.tsx'

/**
 * Card family — a surface that promotes the README idiom (`bg-card
 * text-card-foreground rounded-lg border`) so consumers stop hand-rolling
 * card markup. Tokens only (`--card`/`--card-foreground`). Compose the root
 * with the sub-parts: `CardHeader` (holding `CardTitle` + `CardDescription`),
 * `CardContent`, and `CardFooter`.
 */
function Card({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card"
			className={cn(
				'bg-card text-card-foreground flex flex-col gap-6 rounded-lg border py-6',
				className,
			)}
			{...props}
		/>
	)
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-header"
			className={cn('flex flex-col gap-1.5 px-6', className)}
			{...props}
		/>
	)
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-title"
			className={cn('text-h6 leading-none font-semibold', className)}
			{...props}
		/>
	)
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-description"
			className={cn('text-muted-foreground text-body-sm', className)}
			{...props}
		/>
	)
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-content"
			className={cn('px-6', className)}
			{...props}
		/>
	)
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-footer"
			className={cn('flex items-center px-6', className)}
			{...props}
		/>
	)
}

export {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
}
