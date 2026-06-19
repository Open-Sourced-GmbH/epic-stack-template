// Owned preview — mirrors the `status-button` specimen.
import { StatusButton } from 'epic-stack-template'

export const States = () => (
	<div className="flex flex-wrap items-center gap-3">
		<StatusButton status="idle">idle</StatusButton>
		<StatusButton status="pending" spinDelay={{ delay: 0, minDuration: 0 }}>
			pending
		</StatusButton>
		<StatusButton status="success">success</StatusButton>
		<StatusButton status="error">error</StatusButton>
	</div>
)
