// Owned preview — mirrors the `avatar` specimen. `States`: an avatar whose
// image loads to a photo, an image-less avatar that degrades to its initials
// fallback, and a sized-up variant. The fallback is the key behavior: a
// missing/slow image shows initials, never a broken-image glyph.
import { Avatar, AvatarFallback, AvatarImage } from 'epic-stack-template'

export const States = () => (
	<div className="flex items-center gap-6">
		<Avatar>
			<AvatarImage src="/img/user.png" alt="Ada Lovelace" />
			<AvatarFallback>AL</AvatarFallback>
		</Avatar>
		<Avatar>
			<AvatarFallback>EM</AvatarFallback>
		</Avatar>
		<Avatar className="size-16">
			<AvatarFallback className="text-lg">GR</AvatarFallback>
		</Avatar>
	</div>
)
