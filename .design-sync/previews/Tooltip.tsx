// Owned preview — mirrors the `tooltip` specimen. Rendered open so the
// (portalled) tooltip content is visible in the static preview.
import {
	Button,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from 'epic-stack-template'

export const Open = () => (
	<TooltipProvider>
		<Tooltip open>
			<TooltipTrigger asChild>
				<Button variant="outline">Hover me</Button>
			</TooltipTrigger>
			<TooltipContent>Helpful hint</TooltipContent>
		</Tooltip>
	</TooltipProvider>
)
