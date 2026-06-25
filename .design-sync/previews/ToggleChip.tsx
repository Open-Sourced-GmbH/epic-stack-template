// Owned preview — mirrors the `toggle-chip` specimen (off / on / locked), plus
// the permission-matrix composition: an own/any pair per row, as used per-grant
// in the role editor's grant matrix.
import { ToggleChip } from 'epic-stack-template'

export const States = () => (
	<div className="flex items-center gap-2">
		<ToggleChip pressed={false}>off</ToggleChip>
		<ToggleChip pressed>on</ToggleChip>
		<ToggleChip pressed locked lockedReason="Protected by the admin floor">
			locked
		</ToggleChip>
	</div>
)

export const GrantPair = () => (
	<div className="flex flex-col gap-2">
		<div className="text-muted-foreground text-body-2xs">read</div>
		<div className="flex items-center gap-2">
			<ToggleChip pressed>own</ToggleChip>
			<ToggleChip pressed={false}>any</ToggleChip>
		</div>
	</div>
)
