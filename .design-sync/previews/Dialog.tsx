// Owned preview — mirrors the `dialog` specimen. Rendered contained: the
// overlay/content are positioned `absolute` within a `relative` box (and
// modal={false}) so the dialog surface shows in place in the static preview,
// without a full-screen portal.
import {
	Button,
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogOverlay,
	DialogTitle,
} from 'epic-stack-template'

export const Modal = () => (
	<div className="relative flex h-72 items-center justify-center overflow-hidden rounded-lg">
		<Dialog open modal={false}>
			<DialogOverlay className="absolute" />
			<DialogContent className="absolute w-[26rem]">
				<DialogTitle>Delete project</DialogTitle>
				<DialogDescription className="mt-2">
					This permanently removes the project and all of its data. This action
					cannot be undone.
				</DialogDescription>
				<div className="mt-6 flex justify-end gap-2">
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<DialogClose asChild>
						<Button variant="destructive">Delete</Button>
					</DialogClose>
				</div>
			</DialogContent>
		</Dialog>
	</div>
)
