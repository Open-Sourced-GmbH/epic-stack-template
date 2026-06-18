// Owned preview — mirrors the `dropdown-menu` specimen. Rendered open so the
// menu surface (portalled by Radix) is visible in the static preview.
import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from 'epic-stack-template'

export const Open = () => (
	<DropdownMenu open>
		<DropdownMenuTrigger asChild>
			<Button variant="outline">Open menu</Button>
		</DropdownMenuTrigger>
		<DropdownMenuContent>
			<DropdownMenuLabel>My account</DropdownMenuLabel>
			<DropdownMenuSeparator />
			<DropdownMenuItem>
				Profile<DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
			</DropdownMenuItem>
			<DropdownMenuItem>
				Settings<DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
			</DropdownMenuItem>
			<DropdownMenuItem>Log out</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>
)
