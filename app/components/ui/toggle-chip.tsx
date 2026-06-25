import * as React from 'react'

import { cn } from '#app/utils/misc.tsx'
import { Icon } from './icon.tsx'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip.tsx'

/**
 * ToggleChip — a controlled, two-state toggle *button* (`aria-pressed`) styled
 * as a compact chip. No existing primitive fits: `Switch` slides, `Checkbox` is
 * a box, `Button` has no pressed state. It backs the per-grant cells of the
 * permission grant matrix (one chip per `own` / `any` scope), and is reusable
 * anywhere a small on/off toggle is wanted.
 *
 * Three token-only states:
 * - **off** (`aria-pressed="false"`) — `border-border bg-background text-muted-foreground`
 * - **on** (`aria-pressed="true"`) — `bg-brand border-brand text-primary-foreground`
 * - **locked** — `bg-brand-soft text-brand` with a leading lock glyph; for
 *   admin-floor-protected / system-role partial-lock cells. A locked chip is
 *   non-toggleable but stays focusable (`aria-disabled`, not `disabled`, so it
 *   keeps its place in the tab order) and, with `lockedReason`, wraps in a
 *   `Tooltip` that explains why.
 *
 * Controlled only: pass `pressed` + `onPressedChange`. Being a native `<button>`,
 * Space/Enter toggle it for free; focus-visible takes the shared cosy-focus halo.
 */
export type ToggleChipProps = {
	/** Controlled pressed (on) state. */
	pressed: boolean
	/** Fires with the next pressed state on toggle (never while locked). */
	onPressedChange?: (pressed: boolean) => void
	/** Render the non-toggleable locked state (brand-soft tonal + lock glyph). */
	locked?: boolean
	/** Explanation shown in a tooltip on the locked chip. */
	lockedReason?: React.ReactNode
} & Omit<React.ComponentProps<'button'>, 'onChange' | 'value'>

const ToggleChip = ({
	pressed,
	onPressedChange,
	locked = false,
	lockedReason,
	className,
	children,
	...props
}: ToggleChipProps) => {
	const state = locked ? 'locked' : pressed ? 'on' : 'off'
	const chip = (
		<button
			type="button"
			data-slot="toggle-chip"
			data-state={state}
			aria-pressed={pressed}
			aria-disabled={locked || undefined}
			onClick={() => {
				if (!locked) onPressedChange?.(!pressed)
			}}
			className={cn(
				'focus-cosy inline-flex h-7 min-w-12 items-center justify-center gap-1 rounded-md border px-2.5 text-body-2xs font-medium transition-colors motion-reduce:transition-none',
				state === 'locked' &&
					'bg-brand-soft text-brand cursor-default border-transparent',
				state === 'on' && 'bg-brand border-brand text-primary-foreground',
				state === 'off' &&
					'border-border bg-background text-muted-foreground hover:bg-muted',
				className,
			)}
			{...props}
		>
			{locked ? (
				<Icon name="lock-closed" className="size-3 shrink-0" aria-hidden />
			) : null}
			{children}
		</button>
	)

	if (locked && lockedReason != null) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>{chip}</TooltipTrigger>
				<TooltipContent>{lockedReason}</TooltipContent>
			</Tooltip>
		)
	}

	return chip
}

export { ToggleChip }
