// Owned preview — mirrors the `sheet` specimen. Rendered contained: the
// overlay/content are positioned `absolute` within a `relative` box (and
// modal={false}) so the slide-over surface shows in place in the static
// preview, without a full-screen portal.
import {
	Button,
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetOverlay,
	SheetTitle,
} from 'epic-stack-template'

export const SlideOver = () => (
	<div className="relative flex h-80 items-center justify-center overflow-hidden rounded-lg">
		<Sheet open modal={false}>
			<SheetOverlay className="absolute" />
			<SheetContent side="left" className="absolute w-64">
				<SheetTitle>Account</SheetTitle>
				<SheetDescription>Jump to a settings section.</SheetDescription>
				<nav className="mt-4 flex flex-col gap-1 text-body-sm">
					<a className="text-foreground rounded-md px-2 py-1.5" href="#general">
						General
					</a>
					<a
						className="text-muted-foreground rounded-md px-2 py-1.5"
						href="#security"
					>
						Security
					</a>
					<a
						className="text-muted-foreground rounded-md px-2 py-1.5"
						href="#connections"
					>
						Connections
					</a>
				</nav>
				<div className="mt-auto flex justify-end">
					<SheetClose asChild>
						<Button variant="outline">Close</Button>
					</SheetClose>
				</div>
			</SheetContent>
		</Sheet>
	</div>
)
