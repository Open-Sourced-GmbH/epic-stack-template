import * as React from 'react'

import { cn } from '#app/utils/misc.tsx'
import { Label } from './label.tsx'

/** The aria-wiring props Field clones onto its control child. */
type ControlProps = {
	id?: string
	'aria-invalid'?: React.AriaAttributes['aria-invalid']
	'aria-describedby'?: string
	'aria-required'?: React.AriaAttributes['aria-required']
}

interface FieldProps {
	/** Visible label content. */
	label: React.ReactNode
	/** Id wired to both the Label's `htmlFor` and the control's `id`. */
	htmlFor: string
	/** Optional helper text, linked to the control via `aria-describedby`. */
	description?: React.ReactNode
	/** When set, the message is shown and the control becomes `aria-invalid`
	 *  + linked to it via `aria-describedby`. */
	error?: React.ReactNode
	/** Conveys a required field (asterisk + `aria-required` on the control). */
	required?: boolean
	/** The control element (Input, Textarea, Select, Slider, …). */
	children: React.ReactElement<ControlProps>
	className?: string
}

/**
 * Field composite — Label + control + optional description + error — that wires
 * `htmlFor`/`id`/`aria-invalid`/`aria-describedby` automatically so consumers
 * stop reinventing error markup. The single child control is cloned to receive
 * the wiring: its `id` is set to `htmlFor`, and when `error` is set it gains
 * `aria-invalid` and an `aria-describedby` pointing at the error (and the
 * description, when present). Error text uses `--error-text`; the invalid
 * border comes from each control's own `aria-[invalid]` treatment
 * (`--input-invalid`, the invalid-state contract).
 */
const Field = ({
	label,
	htmlFor,
	description,
	error,
	required,
	children,
	className,
}: FieldProps) => {
	const descriptionId = description ? `${htmlFor}-description` : undefined
	const errorId = error ? `${htmlFor}-error` : undefined
	const describedBy =
		[children.props['aria-describedby'], descriptionId, errorId]
			.filter(Boolean)
			.join(' ') || undefined

	const control = React.cloneElement(children, {
		id: htmlFor,
		'aria-invalid': error ? true : children.props['aria-invalid'],
		'aria-describedby': describedBy,
		'aria-required': required || undefined,
	})

	return (
		<div data-slot="field" className={cn('flex flex-col gap-1', className)}>
			<Label htmlFor={htmlFor}>
				{label}
				{required ? (
					<span aria-hidden className="text-error-text">
						{' '}
						*
					</span>
				) : null}
			</Label>
			{control}
			{description ? (
				<p id={descriptionId} className="text-muted-foreground text-body-2xs">
					{description}
				</p>
			) : null}
			{error ? (
				<p id={errorId} className="text-error-text text-body-2xs">
					{error}
				</p>
			) : null}
		</div>
	)
}

export { Field, Field as FormField }
export type { FieldProps }
